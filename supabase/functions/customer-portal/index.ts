import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { resolveAppOrigin } from "../_shared/appOrigin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CUSTOMER-PORTAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id });

    const { data: adminRole } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (adminRole) {
      logStep("Admin user detected, billing portal not applicable");
      await supabaseClient.rpc("log_admin_entitlement_bypass", {
        p_user_id: user.id,
        p_source: "customer-portal",
        p_feature: "billing_manage",
        p_details: { action: "portal_not_applicable" },
      });
      return new Response(
        JSON.stringify({ code: "ADMIN_USER", error: "Billing not required for administrator access" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Prefer normalized billing mapping — do not open portal via unbound email search
    const { data: billing } = await supabaseClient
      .from("billing")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = billing?.stripe_customer_id ?? null;

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    if (!customerId) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length === 0) {
        logStep("No Stripe customer found");
        return new Response(
          JSON.stringify({ code: "NO_STRIPE_CUSTOMER", error: "No billing profile found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
      const candidate = customers.data[0];
      const metaUser = candidate.metadata?.user_id;
      if (metaUser && metaUser !== user.id) {
        logStep("Email customer metadata mismatch", { customerId: candidate.id });
        return new Response(
          JSON.stringify({ code: "NO_STRIPE_CUSTOMER", error: "No billing profile found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
      const { data: owner } = await supabaseClient
        .from("billing")
        .select("user_id")
        .eq("stripe_customer_id", candidate.id)
        .maybeSingle();
      if (owner?.user_id && owner.user_id !== user.id) {
        return new Response(
          JSON.stringify({ code: "NO_STRIPE_CUSTOMER", error: "No billing profile found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
      customerId = candidate.id;
      const { error: mapError } = await supabaseClient.from("billing").upsert(
        { user_id: user.id, stripe_customer_id: customerId },
        { onConflict: "user_id" }
      );
      if (mapError) {
        return new Response(
          JSON.stringify({ code: "BILLING_MAP_FAILED", error: "Failed to bind billing profile" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    }

    logStep("Found Stripe customer", { customerId });

    const origin = resolveAppOrigin(req);
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/app/account`,
    });

    logStep("Customer portal session created", { sessionId: portalSession.id });

    return new Response(
      JSON.stringify({ url: portalSession.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in customer-portal", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
