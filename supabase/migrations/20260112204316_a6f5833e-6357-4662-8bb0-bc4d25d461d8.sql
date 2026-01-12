-- ============================================================
-- ADMIN ACCESS ARCHITECTURE: Audit log + Promote RPC
-- ============================================================

-- 1) Create audit log table
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  target_user_id uuid,
  target_email text,
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON public.admin_audit_log (action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target ON public.admin_audit_log (target_user_id);

-- Enable RLS
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "admin_audit_log_select_admin"
ON public.admin_audit_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- No client writes - only SECURITY DEFINER functions and service role
-- (No INSERT/UPDATE/DELETE policies for authenticated)

-- 2) Create promote_to_admin RPC function
CREATE OR REPLACE FUNCTION public.promote_to_admin(p_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_target_user_id uuid;
  v_is_actor_admin boolean;
BEGIN
  -- Get the calling user's ID
  v_actor_id := auth.uid();
  
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Verify caller is admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_actor_id AND role = 'admin'
  ) INTO v_is_actor_admin;
  
  IF NOT v_is_actor_admin THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;
  
  -- Find target user by email from auth.users
  SELECT id INTO v_target_user_id
  FROM auth.users
  WHERE email = p_email;
  
  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email: %', p_email;
  END IF;
  
  -- Insert admin role (ON CONFLICT does nothing if already admin)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Log the promotion in audit table
  INSERT INTO public.admin_audit_log (actor_user_id, target_user_id, target_email, action, details)
  VALUES (
    v_actor_id,
    v_target_user_id,
    p_email,
    'PROMOTE_TO_ADMIN',
    jsonb_build_object('promoted_by', v_actor_id)
  );
  
  RETURN json_build_object(
    'success', true,
    'target_user_id', v_target_user_id,
    'target_email', p_email
  );
END;
$$;

-- Grant execute to authenticated users (authorization is inside the function)
GRANT EXECUTE ON FUNCTION public.promote_to_admin(text) TO authenticated;

-- 3) Create function to log webhook ignores for admins (callable by service role)
CREATE OR REPLACE FUNCTION public.log_webhook_admin_ignored(
  p_user_id uuid,
  p_email text,
  p_event_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_audit_log (actor_user_id, target_user_id, target_email, action, details)
  VALUES (
    NULL, -- No actor for webhook events
    p_user_id,
    p_email,
    'WEBHOOK_IGNORED_ADMIN',
    jsonb_build_object('event_type', p_event_type)
  );
END;
$$;

-- Only service role should call this
REVOKE ALL ON FUNCTION public.log_webhook_admin_ignored(uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.log_webhook_admin_ignored(uuid, text, text) TO service_role;

-- 4) Create function to list recent admin promotions (for admin UI)
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
    (SELECT au.email FROM auth.users au WHERE au.id = al.actor_user_id) as actor_email,
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

-- 5) Create function to list current admins
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
    (SELECT au.email FROM auth.users au WHERE au.id = ur.user_id) as email,
    ur.created_at
  FROM public.user_roles ur
  WHERE ur.role = 'admin'
  ORDER BY ur.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_admins() TO authenticated;