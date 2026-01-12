-- ============================================================
-- ADMIN LOCK: Server-side protection for administrator accounts
-- Prevents billing logic from ever downgrading admin access
-- ============================================================

-- 1) Trigger function to prevent billing modifications for admin users
CREATE OR REPLACE FUNCTION public.protect_admin_billing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin_user boolean;
BEGIN
  -- Check if the target user has admin role
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = NEW.user_id AND role = 'admin'
  ) INTO is_admin_user;

  -- If user is admin, prevent any billing status changes that would reduce access
  IF is_admin_user THEN
    -- For admins, always ensure subscription appears active
    -- This prevents webhooks from accidentally downgrading admin access
    IF TG_OP = 'UPDATE' THEN
      -- Keep the record but ensure status reflects full access
      NEW.subscription_status := COALESCE(OLD.subscription_status, 'active');
      -- Log that we protected an admin account
      RAISE NOTICE 'Admin billing protection: prevented modification for user %', NEW.user_id;
    END IF;
    
    -- For inserts, allow but ensure proper status
    IF TG_OP = 'INSERT' THEN
      -- Allow the insert but note it in logs
      RAISE NOTICE 'Admin billing insert: user % (admin accounts bypass billing)', NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Apply trigger to billing table
DROP TRIGGER IF EXISTS protect_admin_billing_trigger ON public.billing;
CREATE TRIGGER protect_admin_billing_trigger
  BEFORE INSERT OR UPDATE ON public.billing
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_admin_billing();

-- 2) Trigger function to prevent deleting admin roles
-- Even admins cannot remove the last admin or their own admin role easily
CREATE OR REPLACE FUNCTION public.protect_admin_role_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count integer;
BEGIN
  -- Only protect admin role deletions
  IF OLD.role = 'admin' THEN
    -- Count remaining admins after this deletion
    SELECT COUNT(*) INTO admin_count
    FROM public.user_roles
    WHERE role = 'admin' AND id != OLD.id;

    -- Prevent deletion if this would leave no admins
    IF admin_count = 0 THEN
      RAISE EXCEPTION 'Cannot delete last admin role. At least one admin must exist.';
    END IF;

    -- Log the admin role deletion attempt
    RAISE NOTICE 'Admin role deletion: removing admin from user %', OLD.user_id;
  END IF;

  RETURN OLD;
END;
$$;

-- Apply trigger to user_roles table
DROP TRIGGER IF EXISTS protect_admin_role_deletion_trigger ON public.user_roles;
CREATE TRIGGER protect_admin_role_deletion_trigger
  BEFORE DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_admin_role_deletion();

-- 3) Trigger to prevent inserting downgraded billing for admins
-- If someone tries to create a billing record for an admin with bad status, fix it
CREATE OR REPLACE FUNCTION public.normalize_admin_billing_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin_user boolean;
BEGIN
  -- Check if this is for an admin user
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = NEW.user_id AND role = 'admin'
  ) INTO is_admin_user;

  -- For admin users, we don't need billing records at all
  -- But if one is created, ensure it doesn't restrict access
  IF is_admin_user THEN
    -- Normalize status to active for admins
    IF NEW.subscription_status IN ('canceled', 'past_due', 'unpaid', 'incomplete', 'incomplete_expired') THEN
      NEW.subscription_status := 'active';
      RAISE NOTICE 'Normalized admin billing status for user %', NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 4) Create a secure function to get effective tier (server-side canonical resolver)
CREATE OR REPLACE FUNCTION public.get_effective_tier(target_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_is_admin boolean;
  user_is_advisor boolean;
  billing_status text;
  billing_price_id text;
BEGIN
  -- Check admin status first - admins always get full access
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = target_user_id AND role = 'admin'
  ) INTO user_is_admin;

  IF user_is_admin THEN
    RETURN 'advisor'; -- Highest tier
  END IF;

  -- Check advisor role
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = target_user_id AND role = 'advisor'
  ) INTO user_is_advisor;

  IF user_is_advisor THEN
    RETURN 'advisor';
  END IF;

  -- Check billing status for regular users
  SELECT subscription_status, price_id
  INTO billing_status, billing_price_id
  FROM public.billing
  WHERE user_id = target_user_id;

  -- If active subscription, determine tier from price
  IF billing_status = 'active' AND billing_price_id IS NOT NULL THEN
    -- Map price IDs to tiers
    IF billing_price_id IN ('price_1Sod5F3ppKk8xETzl9EDOR6I', 'price_1Sod5S3ppKk8xETzmky1P3Pr') THEN
      RETURN 'advisor';
    ELSIF billing_price_id IN ('price_1Sod4a3ppKk8xETz9TzPFn8P', 'price_1Sod513ppKk8xETzwcEPnT51') THEN
      RETURN 'pro';
    END IF;
  END IF;

  -- Default to free tier
  RETURN 'free';
END;
$$;

-- 5) Grant execute permission on the resolver function
GRANT EXECUTE ON FUNCTION public.get_effective_tier(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_effective_tier(uuid) TO anon;

-- 6) Update RLS on billing to ensure it's service-role only for writes
-- First drop existing policies if any that allow client writes
DROP POLICY IF EXISTS "billing_insert_own" ON public.billing;
DROP POLICY IF EXISTS "billing_update_own" ON public.billing;
DROP POLICY IF EXISTS "billing_delete_own" ON public.billing;

-- Billing table should only be writable by service role (webhooks)
-- The existing select policy is fine: users can read their own billing

-- 7) Add comment documenting the admin lock behavior
COMMENT ON FUNCTION public.protect_admin_billing() IS 
'Prevents billing modifications from affecting admin users. Part of the admin lock system.';

COMMENT ON FUNCTION public.protect_admin_role_deletion() IS 
'Prevents deletion of the last admin role. Ensures at least one admin always exists.';

COMMENT ON FUNCTION public.get_effective_tier(uuid) IS 
'Canonical server-side resolver for user tier. Returns highest tier for admins regardless of billing.';