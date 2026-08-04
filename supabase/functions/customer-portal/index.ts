import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { handleCustomerPortalRequest } from "./handler.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CUSTOMER-PORTAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  logStep("Function started");

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY is not set" }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  return handleCustomerPortalRequest(req, {
    getUserFromToken: async (token) => {
      const { data, error } = await supabaseClient.auth.getUser(token);
      return { user: data.user, error };
    },
    isAdmin: async (userId) => {
      const { data: adminRole } = await supabaseClient
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      return Boolean(adminRole);
    },
    logAdminBypass: async (userId) => {
      logStep("Admin user detected, billing portal not applicable");
      await supabaseClient.rpc("log_admin_entitlement_bypass", {
        p_user_id: userId,
        p_source: "customer-portal",
        p_feature: "billing_manage",
        p_details: { action: "portal_not_applicable" },
      });
    },
    getBillingCustomerId: async (userId) => {
      const { data: billing } = await supabaseClient
        .from("billing")
        .select("stripe_customer_id")
        .eq("user_id", userId)
        .maybeSingle();
      return billing?.stripe_customer_id ?? null;
    },
    createPortalSession: async (customerId, returnUrl) => {
      logStep("Found Stripe customer", { customerId });
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });
      logStep("Customer portal session created", { sessionId: portalSession.id });
      return { url: portalSession.url, id: portalSession.id };
    },
  });
});
