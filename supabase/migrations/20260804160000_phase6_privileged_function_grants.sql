-- Phase 6 grant lockdown (additive)
-- Supabase/Postgres may retain direct EXECUTE grants on anon/authenticated after
-- REVOKE FROM PUBLIC. Explicitly revoke from PUBLIC, anon, and authenticated,
-- then re-grant only to the approved roles.

-- ---------------------------------------------------------------------------
-- Service-role-only privileged RPCs (webhook idempotency + admin audit logging)
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.claim_stripe_webhook_event(text, text, text, uuid, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_stripe_webhook_event(text, text, text, uuid, text, jsonb)
  TO service_role;

REVOKE ALL ON FUNCTION public.release_stripe_webhook_event(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_stripe_webhook_event(text)
  TO service_role;

REVOKE ALL ON FUNCTION public.log_admin_entitlement_bypass(uuid, text, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_admin_entitlement_bypass(uuid, text, text, jsonb)
  TO service_role;

REVOKE ALL ON FUNCTION public.maybe_log_admin_entitlement_write(uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.maybe_log_admin_entitlement_write(uuid, text, text)
  TO service_role;

-- ---------------------------------------------------------------------------
-- Trigger-only SECURITY DEFINER helpers (not client-callable)
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.enforce_scenario_write_entitlement()
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.enforce_comparison_write_entitlement()
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.enforce_user_comparison_ownership()
  FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Approved client entitlement RPCs (authenticated + service_role only)
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.evaluate_entitlement(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.evaluate_entitlement(uuid)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.feature_allowed(uuid, text, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.feature_allowed(uuid, text, integer)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.assert_feature_allowed(text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assert_feature_allowed(text)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Other approved authenticated RPCs (no anon expansion)
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.duplicate_scenario(uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.duplicate_scenario(uuid, text)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.assert_export_source_owned_by_user(public.export_kind, uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assert_export_source_owned_by_user(public.export_kind, uuid, uuid)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_effective_tier(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_effective_tier(uuid)
  TO authenticated, service_role, postgres;
