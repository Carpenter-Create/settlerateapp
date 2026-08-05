-- Epic 1 (Admin Provisioning Security) — PR 1: explicit admin bootstrap mechanism.
--
-- Adds a deliberate, service-role-gated, single-use bootstrap path for creating
-- the FIRST admin in an environment with zero admins. This migration is purely
-- additive:
--   - Does NOT remove or modify grant_admin_on_signup() (the existing
--     hardcoded-email signup trigger) or its one-time seed INSERT.
--   - Does NOT change admin promotion behavior for existing installs.
--   - Does NOT weaken RLS anywhere.
--
-- See docs/adr/0001-admin-provisioning-model.md for the decision record.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Single-use, time-limited bootstrap tokens. Only the token hash is stored.
-- RLS is enabled with NO policies: default-deny for anon/authenticated. Only
-- service_role (BYPASSRLS) and the SECURITY DEFINER functions below can
-- read or write this table.
CREATE TABLE IF NOT EXISTS public.admin_bootstrap_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  used_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.admin_bootstrap_tokens ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.admin_bootstrap_tokens IS
  'Epic 1 admin bootstrap: single-use, expiring tokens for first-admin creation. No client RLS policies by design.';

-- Issues a single-use bootstrap token. Callable only by service_role — the
-- same trust boundary already used for other privileged writes in this
-- schema (claim_stripe_webhook_event, log_admin_entitlement_bypass). Fails
-- closed if any admin already exists, so bootstrap cannot mint additional
-- admins once the environment has one.
CREATE OR REPLACE FUNCTION public.issue_admin_bootstrap_token(p_ttl_minutes integer DEFAULT 15)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_token text;
  v_hash text;
BEGIN
  IF p_ttl_minutes IS NULL OR p_ttl_minutes <= 0 OR p_ttl_minutes > 60 THEN
    RAISE EXCEPTION 'invalid bootstrap ttl' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RAISE EXCEPTION 'admin bootstrap unavailable: an admin already exists'
      USING ERRCODE = '42501';
  END IF;

  v_token := encode(gen_random_bytes(32), 'hex');
  v_hash := encode(digest(v_token, 'sha256'), 'hex');

  INSERT INTO public.admin_bootstrap_tokens (token_hash, expires_at)
  VALUES (v_hash, now() + (p_ttl_minutes || ' minutes')::interval);

  -- Returned once, in plaintext, to the service_role caller only. Never
  -- persisted in plaintext; only the SHA-256 hash is stored above.
  RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.issue_admin_bootstrap_token(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_admin_bootstrap_token(integer)
  TO service_role;

-- Claims a bootstrap token and grants the calling (authenticated) user the
-- admin role. Single-use, time-limited, fails closed if an admin already
-- exists. An advisory lock serializes concurrent claims so two tokens issued
-- in quick succession cannot both succeed.
CREATE OR REPLACE FUNCTION public.claim_admin_bootstrap(p_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_hash text;
  v_row record;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_token IS NULL OR length(p_token) = 0 THEN
    RAISE EXCEPTION 'invalid bootstrap token' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('admin_bootstrap_claim'));

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RAISE EXCEPTION 'admin bootstrap unavailable: an admin already exists'
      USING ERRCODE = '42501';
  END IF;

  v_hash := encode(digest(p_token, 'sha256'), 'hex');

  SELECT * INTO v_row
  FROM public.admin_bootstrap_tokens
  WHERE token_hash = v_hash
    AND used_at IS NULL
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid or expired bootstrap token' USING ERRCODE = '22023';
  END IF;

  UPDATE public.admin_bootstrap_tokens
  SET used_at = now(), used_by = v_caller
  WHERE id = v_row.id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_caller, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_admin_bootstrap(text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_admin_bootstrap(text)
  TO authenticated, service_role;
