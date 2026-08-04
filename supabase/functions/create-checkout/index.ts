import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  PROFESSIONAL_PRICE_IDS,
  PROFESSIONAL_TRIAL_DAYS,
  isAllowlistedProfessionalPrice,
} from "../_shared/entitlementContract.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

const PRICE_BY_TYPE: Record<string, string> = {
  monthly: PROFESSIONAL_PRICE_IDS[0],
  annual: PROFESSIONAL_PRICE_IDS[1],
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAnon = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );
  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseAnon.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    if (user.is_anonymous) throw new Error("Anonymous users cannot checkout");
    logStep("User authenticated", { userId: user.id });

    const body = await req.json().catch(() => ({}));
    const priceType = body.priceType === "monthly" ? "monthly" : "annual";
    // Never accept arbitrary client price IDs — allowlist only
    const requestedPriceId = typeof body.priceId === "string" ? body.priceId : null;
    let priceId = PRICE_BY_TYPE[priceType];

    if (requestedPriceId) {
      if (!isAllowlistedProfessionalPrice(requestedPriceId)) {
        logStep("Rejected non-allowlisted price", { requestedPriceId });
        return new Response(
          JSON.stringify({ error: "Invalid price", code: "PRICE_NOT_ALLOWED" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
      priceId = requestedPriceId;
    }

    if (!isAllowlistedProfessionalPrice(priceId)) {
      return new Response(
        JSON.stringify({ error: "Invalid price", code: "PRICE_NOT_ALLOWED" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    logStep("Price selected", { priceType, priceId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Prefer mapped customer from billing
    const { data: billing } = await supabaseService
      .from("billing")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId: string | undefined = billing?.stripe_customer_id ?? undefined;

    if (!customerId) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    if (!customerId) {
      const created = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = created.id;
      logStep("Created Stripe customer", { customerId });
    } else {
      await stripe.customers.update(customerId, {
        metadata: { user_id: user.id },
      });
      logStep("Using Stripe customer", { customerId });
    }

    // Persist mapping immediately (webhook resolution must not rely on email alone)
    await supabaseService.from("billing").upsert(
      {
        user_id: user.id,
        stripe_customer_id: customerId,
      },
      { onConflict: "user_id" }
    );

    const origin = req.headers.get("origin") || "https://vpcxzbaxhpucvevnkalo.lovable.app";

    // success_url never grants entitlement — webhook state is authoritative
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/app/account?subscription=success`,
      cancel_url: `${origin}/pricing`,
      client_reference_id: user.id,
      metadata: { user_id: user.id },
      subscription_data: {
        trial_period_days: PROFESSIONAL_TRIAL_DAYS,
        metadata: { user_id: user.id },
      },
    });

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
