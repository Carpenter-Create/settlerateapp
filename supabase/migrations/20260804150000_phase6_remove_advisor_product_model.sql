-- Phase 6: Remove Advisor from active product model
-- SettleRate customer plans: analytical | professional only.
-- Advisor role/price must not grant Professional or admin capabilities.

-- Fail-closed: advisor access request approval disabled
CREATE OR REPLACE FUNCTION public.approve_advisor_request(request_id uuid, approve boolean)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Advisor product model removed; SettleRate supports Analytical and Professional only'
    USING ERRCODE = 'P0001';
END;
$$;

COMMENT ON FUNCTION public.approve_advisor_request(uuid, boolean) IS
  'Deprecated — Advisor is not an active plan. Does not grant roles or billing access.';

-- is_advisor: legacy role existence check only; does not grant features; admin is not advisor
CREATE OR REPLACE FUNCTION public.is_advisor(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(uid, 'advisor')
$$;

COMMENT ON FUNCTION public.is_advisor(uuid) IS
  'Legacy role check only. Does not grant Professional features or admin authority.';
