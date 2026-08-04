import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  evaluateEntitlement,
  isAllowlistedProfessionalPrice,
  resolvePlanCodeFromPrice,
} from "../_shared/entitlementContract.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WebhookLog {
  event_type: string;
  stripe_customer_id: string | null;
  app_user_id: string | null;
  user_role: string | null;
  action_taken: string;
  details?: Record<string, unknown>;
}

const logWebhook = (log: WebhookLog) => {
  console.log(`[STRIPE-WEBHOOK] ${JSON.stringify(log)}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeKey) {
    logWebhook({
      event_type: "error",
      stripe_customer_id: null,
      app_user_id: null,
      user_role: null,
      action_taken: "rejected",
      details: { error: "STRIPE_SECRET_KEY not set" },
    });
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!webhookSecret) {
    logWebhook({
      event_type: "error",
      stripe_customer_id: null,
      app_user_id: null,
      user_role: null,
      action_taken: "rejected",
      details: { error: "STRIPE_WEBHOOK_SECRET not set" },
    });
    return new Response(JSON.stringify({ error: "Webhook signature required" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  let claimedEventId: string | null = null;

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    const eventType = event.type;

    const releaseClaim = async () => {
      if (!claimedEventId) return;
      await supabase.rpc("release_stripe_webhook_event", { p_event_id: claimedEventId });
      claimedEventId = null;
    };

    // Idempotency: claim event id before processing; release on retryable failure
    const { data: claimed, error: claimError } = await supabase.rpc("claim_stripe_webhook_event", {
      p_event_id: event.id,
      p_event_type: eventType,
      p_action_taken: "processing",
    });

    if (claimError) {
      logWebhook({
        event_type: eventType,
        stripe_customer_id: null,
        app_user_id: null,
        user_role: null,
        action_taken: "error",
        details: { error: claimError.message, phase: "claim" },
      });
      return new Response(JSON.stringify({ error: "Idempotency claim failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (claimed === false) {
      logWebhook({
        event_type: eventType,
        stripe_customer_id: null,
        app_user_id: null,
        user_role: null,
        action_taken: "duplicate",
        details: { event_id: event.id },
      });
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    claimedEventId = event.id;

    logWebhook({
      event_type: eventType,
      stripe_customer_id: null,
      app_user_id: null,
      user_role: null,
      action_taken: "received",
      details: { event_id: event.id },
    });

    const handled =
      eventType === "customer.subscription.created" ||
      eventType === "customer.subscription.updated" ||
      eventType === "customer.subscription.deleted" ||
      eventType === "checkout.session.completed" ||
      eventType === "invoice.paid" ||
      eventType === "invoice.payment_failed";

    if (!handled) {
      logWebhook({
        event_type: eventType,
        stripe_customer_id: null,
        app_user_id: null,
        user_role: null,
        action_taken: "unhandled",
      });
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let stripeCustomerId: string | null = null;
    let subscriptionStatus: string | null = null;
    let productId: string | null = null;
    let priceId: string | null = null;
    let subscriptionId: string | null = null;
    let currentPeriodEnd: number | null = null;
    let cancelAtPeriodEnd = false;
    let metadataUserId: string | null = null;

    if (eventType.startsWith("customer.subscription")) {
      const subscription = event.data.object as Stripe.Subscription;
      stripeCustomerId = subscription.customer as string;
      subscriptionStatus =
        eventType === "customer.subscription.deleted" ? "canceled" : subscription.status;
      subscriptionId = subscription.id;
      currentPeriodEnd = subscription.current_period_end;
      cancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end);
      metadataUserId = (subscription.metadata?.user_id as string) || null;
      if (subscription.items.data.length > 0) {
        priceId = subscription.items.data[0].price.id;
        productId = subscription.items.data[0].price.product as string;
      }
    } else if (eventType === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      stripeCustomerId = session.customer as string;
      subscriptionId = session.subscription as string;
      metadataUserId = (session.metadata?.user_id as string) || null;
      if (subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        subscriptionStatus = sub.status;
        currentPeriodEnd = sub.current_period_end;
        cancelAtPeriodEnd = Boolean(sub.cancel_at_period_end);
        if (sub.items.data.length > 0) {
          priceId = sub.items.data[0].price.id;
          productId = sub.items.data[0].price.product as string;
        }
      }
    } else if (eventType.startsWith("invoice")) {
      const invoice = event.data.object as Stripe.Invoice;
      stripeCustomerId = invoice.customer as string;
      subscriptionId = (invoice.subscription as string) || null;
      if (subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        subscriptionStatus = sub.status;
        currentPeriodEnd = sub.current_period_end;
        cancelAtPeriodEnd = Boolean(sub.cancel_at_period_end);
        if (sub.items.data.length > 0) {
          priceId = sub.items.data[0].price.id;
          productId = sub.items.data[0].price.product as string;
        }
      }
    }

    if (!stripeCustomerId) {
      logWebhook({
        event_type: eventType,
        stripe_customer_id: null,
        app_user_id: null,
        user_role: null,
        action_taken: "skipped",
        details: { reason: "No customer ID in event", event_id: event.id },
      });
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reject unknown prices for entitlement mapping (still persist raw status)
    if (priceId && !isAllowlistedProfessionalPrice(priceId)) {
      logWebhook({
        event_type: eventType,
        stripe_customer_id: stripeCustomerId,
        app_user_id: null,
        user_role: null,
        action_taken: "price_rejected",
        details: { priceId, note: "Not on Professional allowlist; no paid entitlement grant" },
      });
    }

    // Resolve app user: billing mapping → metadata → customer metadata → email
    let appUserId: string | null = null;

    const { data: billingByCustomer } = await supabase
      .from("billing")
      .select("user_id")
      .eq("stripe_customer_id", stripeCustomerId)
      .maybeSingle();

    if (billingByCustomer?.user_id) {
      appUserId = billingByCustomer.user_id;
    }

    if (!appUserId && metadataUserId) {
      appUserId = metadataUserId;
    }

    const customer = await stripe.customers.retrieve(stripeCustomerId);
    if (!customer.deleted) {
      if (!appUserId && customer.metadata?.user_id) {
        appUserId = customer.metadata.user_id;
      }

      if (!appUserId && customer.email) {
        const { data: listed, error: listError } = await supabase.auth.admin.listUsers({
          page: 1,
          perPage: 200,
        });
        if (!listError && listed?.users) {
          const match = listed.users.find((u) => u.email === customer.email);
          if (match) appUserId = match.id;
        }
      }
    }

    if (!appUserId) {
      // Retryable: mapping may appear after checkout binds billing
      await releaseClaim();
      logWebhook({
        event_type: eventType,
        stripe_customer_id: stripeCustomerId,
        app_user_id: null,
        user_role: null,
        action_taken: "skipped_retryable",
        details: { reason: "No app user mapping", event_id: event.id },
      });
      return new Response(JSON.stringify({ received: true, retryable: true }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prefer billing mapping over metadata when they disagree
    if (
      billingByCustomer?.user_id &&
      metadataUserId &&
      billingByCustomer.user_id !== metadataUserId
    ) {
      appUserId = billingByCustomer.user_id;
    }

    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", appUserId)
      .eq("role", "admin")
      .maybeSingle();

    if (adminRole) {
      logWebhook({
        event_type: eventType,
        stripe_customer_id: stripeCustomerId,
        app_user_id: appUserId,
        user_role: "admin",
        action_taken: "ignored",
        details: {
          reason: "Admin user - billing changes do not affect access",
          event_id: event.id,
        },
      });
      await supabase.rpc("log_admin_entitlement_bypass", {
        p_user_id: appUserId,
        p_source: "stripe-webhook",
        p_feature: null,
        p_details: { event_type: eventType, event_id: event.id, action: "billing_ignored" },
      });
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Never null-clobber an existing entitled row when the event lacks a subscription snapshot
    if (!subscriptionStatus || !subscriptionId) {
      logWebhook({
        event_type: eventType,
        stripe_customer_id: stripeCustomerId,
        app_user_id: appUserId,
        user_role: "user",
        action_taken: "skipped_no_subscription_snapshot",
        details: { event_id: event.id },
      });
      await supabase
        .from("stripe_webhook_events")
        .update({
          stripe_customer_id: stripeCustomerId,
          app_user_id: appUserId,
          action_taken: "skipped_no_subscription_snapshot",
        })
        .eq("event_id", event.id);
      claimedEventId = null;
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stale/out-of-order guard using Stripe event.created
    const { data: existingBilling } = await supabase
      .from("billing")
      .select("last_stripe_event_at, last_stripe_event_id")
      .eq("user_id", appUserId)
      .maybeSingle();

    if (existingBilling?.last_stripe_event_at) {
      const lastEventUnix = Math.floor(
        new Date(existingBilling.last_stripe_event_at).getTime() / 1000
      );
      if (event.created < lastEventUnix) {
        logWebhook({
          event_type: eventType,
          stripe_customer_id: stripeCustomerId,
          app_user_id: appUserId,
          user_role: "user",
          action_taken: "skipped_stale",
          details: {
            event_id: event.id,
            event_created: event.created,
            last_stripe_event_at: existingBilling.last_stripe_event_at,
          },
        });
        await supabase
          .from("stripe_webhook_events")
          .update({
            stripe_customer_id: stripeCustomerId,
            app_user_id: appUserId,
            action_taken: "skipped_stale",
          })
          .eq("event_id", event.id);
        claimedEventId = null;
        return new Response(JSON.stringify({ received: true, stale: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const planCode = resolvePlanCodeFromPrice(priceId);
    const decision = evaluateEntitlement({
      stripeStatus: subscriptionStatus,
      priceId,
      productId,
      currentPeriodEndsAt: currentPeriodEnd
        ? new Date(currentPeriodEnd * 1000).toISOString()
        : null,
      cancelAtPeriodEnd,
    });

    const billingData = {
      user_id: appUserId,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: subscriptionStatus,
      price_id: priceId,
      product_id: productId,
      cancel_at_period_end: cancelAtPeriodEnd,
      plan_code: planCode,
      entitlement_status: decision.entitlementStatus,
      current_period_end: currentPeriodEnd
        ? new Date(currentPeriodEnd * 1000).toISOString()
        : null,
      last_stripe_event_id: event.id,
      last_stripe_event_at: new Date(event.created * 1000).toISOString(),
    };

    const { error: billingError } = await supabase
      .from("billing")
      .upsert(billingData, { onConflict: "user_id" });

    if (billingError) {
      await releaseClaim();
      logWebhook({
        event_type: eventType,
        stripe_customer_id: stripeCustomerId,
        app_user_id: appUserId,
        user_role: "user",
        action_taken: "error",
        details: { error: billingError.message },
      });
      return new Response(JSON.stringify({ error: billingError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Best-effort legacy subscriptions sync (billing remains authoritative)
    if (subscriptionId && subscriptionStatus) {
      const { error: subError } = await supabase.from("subscriptions").upsert(
        {
          user_id: appUserId,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: subscriptionId,
          status: subscriptionStatus,
          plan_key: planCode === "professional" ? "professional" : "analytical",
          cancel_at_period_end: cancelAtPeriodEnd,
          current_period_end: billingData.current_period_end,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "stripe_subscription_id" }
      );
      if (subError) {
        logWebhook({
          event_type: eventType,
          stripe_customer_id: stripeCustomerId,
          app_user_id: appUserId,
          user_role: "user",
          action_taken: "subscriptions_sync_skipped",
          details: { error: subError.message },
        });
      }
    }

    await supabase
      .from("stripe_webhook_events")
      .update({
        stripe_customer_id: stripeCustomerId,
        app_user_id: appUserId,
        action_taken: "updated",
        details: {
          entitlementStatus: decision.entitlementStatus,
          planCode,
          priceId,
        },
      })
      .eq("event_id", event.id);

    logWebhook({
      event_type: eventType,
      stripe_customer_id: stripeCustomerId,
      app_user_id: appUserId,
      user_role: "user",
      action_taken: "updated",
      details: {
        entitlementStatus: decision.entitlementStatus,
        planCode,
        cancelAtPeriodEnd,
        event_id: event.id,
      },
    });

    claimedEventId = null;
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (claimedEventId) {
      await supabase.rpc("release_stripe_webhook_event", { p_event_id: claimedEventId });
      claimedEventId = null;
    }
    logWebhook({
      event_type: "error",
      stripe_customer_id: null,
      app_user_id: null,
      user_role: null,
      action_taken: "error",
      details: { error: errorMessage },
    });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


