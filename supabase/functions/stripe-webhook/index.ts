import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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

// Map Stripe product IDs to tier names
const PRODUCT_TO_TIER: Record<string, string> = {
  "prod_TmBRSW3mqUk9l9": "pro",
  "prod_TmBRGPUBjfB7DR": "pro",
  "prod_TmBSkiojosKhTo": "advisor",
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

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const body = await req.text();
    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      const signature = req.headers.get("stripe-signature");
      if (!signature) {
        return new Response(JSON.stringify({ error: "Missing signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } else {
      // Development mode - parse without verification
      event = JSON.parse(body);
      console.warn("[STRIPE-WEBHOOK] Running without signature verification");
    }

    const eventType = event.type;
    logWebhook({
      event_type: eventType,
      stripe_customer_id: null,
      app_user_id: null,
      user_role: null,
      action_taken: "received",
    });

    // Handle subscription events
    if (
      eventType === "customer.subscription.created" ||
      eventType === "customer.subscription.updated" ||
      eventType === "customer.subscription.deleted" ||
      eventType === "checkout.session.completed" ||
      eventType === "invoice.paid" ||
      eventType === "invoice.payment_failed"
    ) {
      let stripeCustomerId: string | null = null;
      let subscriptionStatus: string | null = null;
      let productId: string | null = null;
      let priceId: string | null = null;
      let subscriptionId: string | null = null;
      let currentPeriodEnd: number | null = null;

      // Extract data based on event type
      if (eventType.startsWith("customer.subscription")) {
        const subscription = event.data.object as Stripe.Subscription;
        stripeCustomerId = subscription.customer as string;
        subscriptionStatus = subscription.status;
        subscriptionId = subscription.id;
        currentPeriodEnd = subscription.current_period_end;
        if (subscription.items.data.length > 0) {
          priceId = subscription.items.data[0].price.id;
          productId = subscription.items.data[0].price.product as string;
        }
      } else if (eventType === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        stripeCustomerId = session.customer as string;
        subscriptionId = session.subscription as string;
        
        // Fetch subscription details
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          subscriptionStatus = sub.status;
          currentPeriodEnd = sub.current_period_end;
          if (sub.items.data.length > 0) {
            priceId = sub.items.data[0].price.id;
            productId = sub.items.data[0].price.product as string;
          }
        }
      } else if (eventType.startsWith("invoice")) {
        const invoice = event.data.object as Stripe.Invoice;
        stripeCustomerId = invoice.customer as string;
        subscriptionId = invoice.subscription as string;
        
        if (subscriptionId && eventType === "invoice.paid") {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          subscriptionStatus = sub.status;
          currentPeriodEnd = sub.current_period_end;
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
          details: { reason: "No customer ID in event" },
        });
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Resolve app user from Stripe customer
      const customer = await stripe.customers.retrieve(stripeCustomerId);
      if (customer.deleted) {
        logWebhook({
          event_type: eventType,
          stripe_customer_id: stripeCustomerId,
          app_user_id: null,
          user_role: null,
          action_taken: "skipped",
          details: { reason: "Customer deleted in Stripe" },
        });
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const customerEmail = customer.email;
      if (!customerEmail) {
        logWebhook({
          event_type: eventType,
          stripe_customer_id: stripeCustomerId,
          app_user_id: null,
          user_role: null,
          action_taken: "skipped",
          details: { reason: "No email on customer" },
        });
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find app user by email
      const { data: users } = await supabase.auth.admin.listUsers();
      const appUser = users?.users?.find((u) => u.email === customerEmail);

      if (!appUser) {
        logWebhook({
          event_type: eventType,
          stripe_customer_id: stripeCustomerId,
          app_user_id: null,
          user_role: null,
          action_taken: "skipped",
          details: { reason: "No app user found for email", email: customerEmail },
        });
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ============================================================
      // CRITICAL: Check if user is admin - NEVER modify admin access
      // Database trigger also protects this, but we exit early for safety
      // ============================================================
      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", appUser.id)
        .eq("role", "admin")
        .maybeSingle();

      if (adminRole) {
        logWebhook({
          event_type: eventType,
          stripe_customer_id: stripeCustomerId,
          app_user_id: appUser.id,
          user_role: "admin",
          action_taken: "ignored",
          details: { 
            reason: "Admin user - billing changes do not affect access",
            note: "Database trigger also prevents admin billing modifications"
          },
        });
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Standard user - process billing update
      const tier = productId ? (PRODUCT_TO_TIER[productId] || "free") : "free";
      const isActive = subscriptionStatus === "active" || subscriptionStatus === "trialing";

      // Upsert billing record
      const billingData = {
        user_id: appUser.id,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: subscriptionId,
        subscription_status: eventType === "customer.subscription.deleted" ? "canceled" : subscriptionStatus,
        price_id: priceId,
        current_period_end: currentPeriodEnd
          ? new Date(currentPeriodEnd * 1000).toISOString()
          : null,
      };

      const { error: billingError } = await supabase
        .from("billing")
        .upsert(billingData, { onConflict: "user_id" });

      if (billingError) {
        logWebhook({
          event_type: eventType,
          stripe_customer_id: stripeCustomerId,
          app_user_id: appUser.id,
          user_role: "user",
          action_taken: "error",
          details: { error: billingError.message },
        });
      } else {
        logWebhook({
          event_type: eventType,
          stripe_customer_id: stripeCustomerId,
          app_user_id: appUser.id,
          user_role: "user",
          action_taken: "updated",
          details: {
            tier,
            status: billingData.subscription_status,
            isActive,
          },
        });
      }
    } else {
      logWebhook({
        event_type: eventType,
        stripe_customer_id: null,
        app_user_id: null,
        user_role: null,
        action_taken: "unhandled",
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
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
