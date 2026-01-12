-- ═══════════════════════════════════════════════════════════════
-- STEP 2: ADVISOR ACCESS REQUESTS TABLE + FUNCTIONS
-- ═══════════════════════════════════════════════════════════════

-- 1) Convenience function: is_admin (wraps has_role)
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(uid, 'admin')
$$;

-- 2) Convenience function: is_advisor
CREATE OR REPLACE FUNCTION public.is_advisor(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(uid, 'advisor')
$$;

-- 3) Create advisor_access_requests table
CREATE TABLE IF NOT EXISTS public.advisor_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  company text,
  website text,
  role_title text,
  email text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_advisor_access_requests_status ON public.advisor_access_requests(status);
CREATE INDEX IF NOT EXISTS idx_advisor_access_requests_created_at ON public.advisor_access_requests(created_at);

-- 4) Enable RLS
ALTER TABLE public.advisor_access_requests ENABLE ROW LEVEL SECURITY;

-- 5) RLS Policies
-- User can insert their own request
CREATE POLICY "advisor_requests_insert_own"
ON public.advisor_access_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- User can view own request; admins can view all
CREATE POLICY "advisor_requests_select"
ON public.advisor_access_requests
FOR SELECT
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Only admins can update (approve/deny)
CREATE POLICY "advisor_requests_update_admin"
ON public.advisor_access_requests
FOR UPDATE
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Only admins can delete
CREATE POLICY "advisor_requests_delete_admin"
ON public.advisor_access_requests
FOR DELETE
USING (public.is_admin(auth.uid()));

-- 6) Approval function (security definer)
CREATE OR REPLACE FUNCTION public.approve_advisor_request(request_id uuid, approve boolean)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req_record record;
  result_status text;
BEGIN
  -- Verify caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  -- Load the request
  SELECT * INTO req_record
  FROM public.advisor_access_requests
  WHERE id = request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found.';
  END IF;

  IF req_record.status != 'pending' THEN
    RAISE EXCEPTION 'Request has already been reviewed.';
  END IF;

  IF approve THEN
    -- Update request status
    UPDATE public.advisor_access_requests
    SET status = 'approved',
        reviewed_by = auth.uid(),
        reviewed_at = now()
    WHERE id = request_id;

    -- Grant advisor role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (req_record.user_id, 'advisor')
    ON CONFLICT (user_id, role) DO NOTHING;

    result_status := 'approved';
  ELSE
    -- Update request status to denied
    UPDATE public.advisor_access_requests
    SET status = 'denied',
        reviewed_by = auth.uid(),
        reviewed_at = now()
    WHERE id = request_id;

    result_status := 'denied';
  END IF;

  RETURN json_build_object(
    'success', true,
    'status', result_status,
    'request_id', request_id
  );
END;
$$;

-- 7) List pending requests function (admin only)
CREATE OR REPLACE FUNCTION public.list_pending_advisor_requests()
RETURNS SETOF public.advisor_access_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.advisor_access_requests
  WHERE status = 'pending'
  ORDER BY created_at ASC;
END;
$$;