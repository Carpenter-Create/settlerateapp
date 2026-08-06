import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  evaluateEntitlement,
  featureAccessFromDecision,
  planCodeToLegacyTier,
} from "../_shared/entitlementContract.ts";
import { generateRequestId } from "../_shared/observability.ts";
import { captureEdgeException, initEdgeSentry } from "../_shared/sentry.ts";

// Inert without a SENTRY_DSN secret — see supabase/functions/_shared/sentry.ts.
const SENTRY_DSN = Deno.env.get("SENTRY_DSN");
initEdgeSentry(SENTRY_DSN);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  const requestId = generateRequestId();

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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id });

    if (user.is_anonymous) {
      const decision = evaluateEntitlement({ stripeStatus: null, priceId: null });
      const flags = featureAccessFromDecision(decision, { scenarioCount: 0 });
      return new Response(
        JSON.stringify({
          subscribed: false,
          product_id: null,
          subscription_end: null,
          is_admin: false,
          plan_code: decision.planCode,
          entitlement_status: decision.entitlementStatus,
          cancel_at_period_end: false,
          features: flags,
          scenario_count: 0,
          legacy_tier: "free",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const { data: adminRole } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    const isAdmin = Boolean(adminRole);

    // Count all saved rows (including archived) to mirror atomic free-tier limit
    const { count: scenarioCount } = await supabaseClient
      .from("scenarios")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { data: billing } = await supabaseClient
      .from("billing")
      .select(
        "subscription_status, price_id, product_id, current_period_end, cancel_at_period_end, plan_code, entitlement_status, stripe_customer_id"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    // Authoritative: verified billing row (webhook), not client or success URL
    const decision = evaluateEntitlement({
      stripeStatus: billing?.subscription_status ?? null,
      priceId: billing?.price_id ?? null,
      productId: billing?.product_id ?? null,
      currentPeriodEndsAt: billing?.current_period_end ?? null,
      cancelAtPeriodEnd: billing?.cancel_at_period_end ?? false,
      isAdmin,
    });

    // Admin bypass is logged when a protected feature is asserted (assert_feature_allowed),
    // not on every status poll.

    const flags = featureAccessFromDecision(decision, {
      scenarioCount: scenarioCount ?? 0,
    });

    const legacyTier = planCodeToLegacyTier(
      decision.hasProfessionalAccess ? "professional" : "analytical"
    );

    return new Response(
      JSON.stringify({
        subscribed: decision.hasProfessionalAccess,
        product_id: isAdmin ? "admin_access" : billing?.product_id ?? null,
        subscription_end: decision.currentPeriodEndsAt,
        is_admin: isAdmin,
        plan_code: decision.planCode,
        entitlement_status: decision.entitlementStatus,
        cancel_at_period_end: decision.cancelAtPeriodEnd,
        price_id: decision.priceId,
        stripe_status: decision.stripeStatus,
        stripe_customer_id: billing?.stripe_customer_id ?? null,
        features: flags,
        scenario_count: scenarioCount ?? 0,
        legacy_tier: legacyTier,
        is_admin_bypass: decision.isAdminBypass,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    captureEdgeException(error, SENTRY_DSN, {
      function_name: "check-subscription",
      request_id: requestId,
    });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
