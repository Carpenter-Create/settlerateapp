-- Fix: admin RPC return-type mismatch (Phase 8.1, fix/admin-rpc-return-types).
--
-- Production defect: public.list_admins() and
-- public.list_recent_admin_promotions() (both defined in migration
-- 20260112204316_a6f5833e-6357-4662-8bb0-bc4d25d461d8.sql) each declare an
-- email column as `text` in their RETURNS TABLE signature, but select it
-- from a bare `(SELECT au.email FROM auth.users au WHERE ...)` subquery.
-- Supabase's auth.users.email column is `character varying(255)`, not
-- `text`, so at RETURN QUERY time Postgres raised:
--
--   42804 "structure of query does not match function result type"
--   "Returned type character varying(255) does not match expected type
--    text in column 2."
--
-- for list_admins (column 2 = email), and the equivalent mismatch for
-- list_recent_admin_promotions' actor_email column (column 3, also sourced
-- from auth.users.email), which surfaced to clients as an HTTP 400.
--
-- Every other selected column in both functions was already type-correct:
--   - list_admins: user_id (uuid, from user_roles.user_id uuid) and
--     created_at (timestamptz, from user_roles.created_at timestamp with
--     time zone) match their declared types.
--   - list_recent_admin_promotions: id, actor_user_id, target_user_id
--     (uuid), target_email, action (text), and created_at (timestamptz) are
--     all sourced directly from admin_audit_log columns of the same
--     declared type.
--
-- Fix: cast the auth.users.email expression to `::text` in both functions
-- so the runtime row type exactly matches each function's declared
-- RETURNS TABLE signature. This is a forward-only CREATE OR REPLACE
-- FUNCTION; it does not edit the original migration.
--
-- Preserved unchanged: function names, parameters, SECURITY DEFINER mode,
-- search_path, admin-only authorization checks (public.has_role), and the
-- existing GRANT EXECUTE ... TO authenticated statements (re-issued here
-- only for idempotence — they grant nothing new). No data, RLS, admin
-- grants, or promotion semantics are altered.

CREATE OR REPLACE FUNCTION public.list_recent_admin_promotions(p_limit int DEFAULT 10)
RETURNS TABLE (
  id uuid,
  actor_user_id uuid,
  actor_email text,
  target_user_id uuid,
  target_email text,
  action text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT
    al.id,
    al.actor_user_id,
    (SELECT au.email::text FROM auth.users au WHERE au.id = al.actor_user_id) as actor_email,
    al.target_user_id,
    al.target_email,
    al.action,
    al.created_at
  FROM public.admin_audit_log al
  WHERE al.action IN ('PROMOTE_TO_ADMIN', 'WEBHOOK_IGNORED_ADMIN')
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_recent_admin_promotions(int) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_admins()
RETURNS TABLE (
  user_id uuid,
  email text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT
    ur.user_id,
    (SELECT au.email::text FROM auth.users au WHERE au.id = ur.user_id) as email,
    ur.created_at
  FROM public.user_roles ur
  WHERE ur.role = 'admin'
  ORDER BY ur.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_admins() TO authenticated;
