import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { LEGACY_ADVISOR_PRICE_IDS } from "../_shared/entitlementContract.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[ADMIN-ASSIGN-ADVISOR] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    // Authenticate admin user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const adminUser = userData.user;
    if (!adminUser) throw new Error("User not authenticated");
    logStep("Admin user authenticated", { userId: adminUser.id });

    // Verify admin role using the has_role function
    const { data: isAdmin, error: roleError } = await supabaseClient.rpc("has_role", {
      _user_id: adminUser.id,
      _role: "admin",
    });

    if (roleError || !isAdmin) {
      logStep("Admin role verification failed", { error: roleError?.message, isAdmin });
      throw new Error("Unauthorized: Admin access required");
    }
    logStep("Admin role verified");

    // Parse request body
    const { request_id, email, price_id } = await req.json();
    if (!request_id || !email || !price_id) {
      throw new Error("Missing required fields: request_id, email, price_id");
    }
    logStep("Request parsed", { request_id, email, price_id });

    if (!(LEGACY_ADVISOR_PRICE_IDS as readonly string[]).includes(price_id)) {
      logStep("Rejected non-allowlisted advisor price", { price_id });
      return new Response(
        JSON.stringify({ error: "Invalid price", code: "PRICE_NOT_ALLOWED" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find or create Stripe customer
    let customerId: string;
    const customers = await stripe.customers.list({ email, limit: 1 });
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    } else {
      const newCustomer = await stripe.customers.create({ email });
      customerId = newCustomer.id;
      logStep("Created new customer", { customerId });
    }

    // Check for existing active subscription to SettleRate Advisor
    const existingSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    // SettleRate Advisor product ID
    const advisorProductId = "prod_TmBSkiojosKhTo";
    const hasAdvisorSub = existingSubscriptions.data.some((sub: { items: { data: Array<{ price: { product: string } }> } }) =>
      sub.items.data.some((item: { price: { product: string } }) => item.price.product === advisorProductId)
    );

    if (hasAdvisorSub) {
      logStep("Customer already has active Advisor subscription");
      // Just update the request status
      await supabaseClient
        .from("contact_messages")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminUser.id,
        })
        .eq("id", request_id);

      return new Response(
        JSON.stringify({ success: true, message: "Customer already has active subscription" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Create subscription for the advisor
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: price_id }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
    });
    logStep("Created subscription", { subscriptionId: subscription.id });

    // Update request status in database
    const { error: updateError } = await supabaseClient
      .from("contact_messages")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminUser.id,
      })
      .eq("id", request_id);

    if (updateError) {
      logStep("Failed to update request status", { error: updateError.message });
      // Don't fail the request, subscription was created successfully
    }

    logStep("Advisor access granted successfully");

    return new Response(
      JSON.stringify({
        success: true,
        subscription_id: subscription.id,
        customer_id: customerId,
        status: subscription.status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in admin-assign-advisor", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
