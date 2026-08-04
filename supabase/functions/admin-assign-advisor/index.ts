import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Deprecated — Advisor is not an active SettleRate plan.
 * Deterministic fail-closed: no billing, role, or entitlement mutation.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[ADMIN-ASSIGN-ADVISOR] Rejected — Advisor product model removed");

  return new Response(
    JSON.stringify({
      error: "Advisor plan removed. SettleRate supports SettleRate Free and SettleRate Professional only.",
      code: "ADVISOR_PLAN_DEPRECATED",
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 410,
    }
  );
});
