import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  PROFESSIONAL_PRICE_IDS,
  PROFESSIONAL_TRIAL_DAYS,
  isAllowlistedProfessionalPrice,
} from "@settlerate/core/entitlement";
import { resolveAppOrigin } from "../_shared/appOrigin.ts";
import {
  CHECKOUT_BLOCKING_SUBSCRIPTION_STATUSES,
  billingRowBlocksCheckout,
  checkoutIdempotencyKey,
  stripeSubscriptionsBlockCheckout,
} from "@settlerate/core/subscription-guard";
import {
  resolveCheckoutCustomer,
  stripeCustomerMetadataSearchQuery,
} from "../_shared/stripeCustomerResolve.ts";
import {
  checkoutMaintenancePayload,
  isCheckoutMaintenanceEnabled,
} from "@settlerate/core/checkout-maintenance";
import { generateRequestId } from "../_shared/observability.ts";
import { captureEdgeException, initEdgeSentry } from "../_shared/sentry.ts";
import "../_shared/ensureCoreAssets.ts";

// Inert without a SENTRY_DSN secret — see supabase/functions/_shared/sentry.ts.
const SENTRY_DSN = Deno.env.get("SENTRY_DSN");
initEdgeSentry(SENTRY_DSN, Deno.env.get("SENTRY_ENVIRONMENT"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

/** Trial only for first-time Professional checkout; fail closed when uncertain. */
async function isEligibleForProfessionalTrial(
  stripe: Stripe,
  supabaseService: ReturnType<typeof createClient>,
  userId: string,
  customerId: string
): Promise<boolean> {
  const { data: billing } = await supabaseService
    .from("billing")
    .select("subscription_status, stripe_subscription_id, price_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (billing?.stripe_subscription_id) {
    logStep("Trial skipped: prior subscription on record", { userId });
    return false;
  }

  if (
    billing?.subscription_status &&
    ["active", "trialing", "past_due", "unpaid", "canceled"].includes(billing.subscription_status)
  ) {
    logStep("Trial skipped: prior billing status", {
      userId,
      status: billing.subscription_status,
    });
    return false;
  }

  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 100,
  });

  for (const sub of subs.data) {
    for (const item of sub.items.data) {
      if (isAllowlistedProfessionalPrice(item.price.id)) {
        logStep("Trial skipped: Stripe history on allowlisted price", {
          userId,
          subscriptionId: sub.id,
          priceId: item.price.id,
        });
        return false;
      }
    }
  }

  return true;
}

const PRICE_BY_TYPE: Record<string, string> = {
  monthly: PROFESSIONAL_PRICE_IDS[0],
  annual: PROFESSIONAL_PRICE_IDS[1],
};

serve(async (req) => {
  const requestId = generateRequestId();

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Server env only — never read maintenance flags from the request.
  if (isCheckoutMaintenanceEnabled(Deno.env.get("CHECKOUT_MAINTENANCE"))) {
    logStep("Checkout maintenance enabled — rejecting");
    return new Response(JSON.stringify(checkoutMaintenancePayload()), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 503,
    });
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

    const { data: billing } = await supabaseService
      .from("billing")
      .select("stripe_customer_id, stripe_subscription_id, subscription_status, price_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const customerResolution = await resolveCheckoutCustomer(
      { userId: user.id, email: user.email },
      {
        getBillingCustomerId: async () => billing?.stripe_customer_id ?? null,
        findCustomersByUserMetadata: async (userId) => {
          const customers = await stripe.customers.search({
            query: stripeCustomerMetadataSearchQuery(userId),
            limit: 100,
          });
          return customers.data;
        },
        isCustomerBoundToOtherUser: async (customerId, userId) => {
          const { data: owner } = await supabaseService
            .from("billing")
            .select("user_id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();
          return Boolean(owner?.user_id && owner.user_id !== userId);
        },
        createCustomer: async ({ email, userId }) => {
          const created = await stripe.customers.create({
            email,
            metadata: { user_id: userId },
          });
          logStep("Created Stripe customer", { customerId: created.id });
          return created.id;
        },
      }
    );

    if (customerResolution.kind === "ambiguous") {
      return new Response(
        JSON.stringify({ error: "Multiple billing profiles found", code: "CUSTOMER_AMBIGUOUS" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 }
      );
    }

    if (customerResolution.kind === "bound_elsewhere") {
      return new Response(
        JSON.stringify({ error: "Billing profile conflict", code: "CUSTOMER_BOUND_ELSEWHERE" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 }
      );
    }

    const customerId = customerResolution.customerId;
    logStep("Using Stripe customer", { customerId });

    if (customerResolution.requiresBillingMapUpsert) {
      const { error: mapError } = await supabaseService.from("billing").upsert(
        {
          user_id: user.id,
          stripe_customer_id: customerId,
        },
        { onConflict: "user_id" }
      );
      if (mapError) {
        logStep("Billing map upsert failed", { error: mapError.message });
        return new Response(
          JSON.stringify({ error: "Failed to bind billing profile", code: "BILLING_MAP_FAILED" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    }

    if (billingRowBlocksCheckout(billing, isAllowlistedProfessionalPrice)) {
      logStep("Checkout blocked: billing row has active subscription", { userId: user.id });
      return new Response(
        JSON.stringify({
          error: "An existing Professional subscription must be managed before starting checkout",
          code: "ALREADY_SUBSCRIBED",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 }
      );
    }

    const subscriptionLists = await Promise.all(
      CHECKOUT_BLOCKING_SUBSCRIPTION_STATUSES.map((status) =>
        stripe.subscriptions.list({
          customer: customerId,
          status,
          limit: 100,
        })
      )
    );
    const subscriptions = subscriptionLists.flatMap(({ data }) => data);
    if (stripeSubscriptionsBlockCheckout(subscriptions, isAllowlistedProfessionalPrice)) {
      logStep("Checkout blocked: Stripe has active Professional subscription", { userId: user.id });
      return new Response(
        JSON.stringify({
          error: "An existing Professional subscription must be managed before starting checkout",
          code: "ALREADY_SUBSCRIBED",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 }
      );
    }

    const origin = resolveAppOrigin(req);

    const eligibleForTrial = await isEligibleForProfessionalTrial(
      stripe,
      supabaseService,
      user.id,
      customerId
    );

    const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
      metadata: { user_id: user.id },
    };
    if (eligibleForTrial) {
      subscriptionData.trial_period_days = PROFESSIONAL_TRIAL_DAYS;
      logStep("Trial eligible", { trialDays: PROFESSIONAL_TRIAL_DAYS });
    } else {
      logStep("Trial not eligible — omitting trial_period_days");
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/app/account?subscription=success`,
      cancel_url: `${origin}/app/account`,
      client_reference_id: user.id,
      metadata: { user_id: user.id },
      subscription_data: subscriptionData,
    }, {
      idempotencyKey: checkoutIdempotencyKey(user.id, priceId),
    });

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    captureEdgeException(error, SENTRY_DSN, {
      function_name: "create-checkout",
      request_id: requestId,
    });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
