-- ============================================================
-- ADMIN LOCK ENFORCEMENT: Subscriptions table protection
-- Ensures admin accounts can never be downgraded via subscriptions
-- ============================================================

-- 1) Create trigger function to block/normalize subscription writes for admins
CREATE OR REPLACE FUNCTION public.protect_admin_subscriptions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin_user boolean;
BEGIN
  -- Check if the target user has admin role in user_roles table
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = NEW.user_id AND role = 'admin'
  ) INTO is_admin_user;

  -- If user is admin, prevent any subscription changes that would reduce access
  IF is_admin_user THEN
    IF TG_OP = 'UPDATE' THEN
      -- For admins, always ensure subscription appears active with highest tier
      NEW.status := 'active';
      NEW.plan_key := COALESCE(NEW.plan_key, 'professional');
      NEW.cancel_at_period_end := false;
      RAISE NOTICE 'Admin subscription protection: normalized status for user %', NEW.user_id;
    END IF;
    
    IF TG_OP = 'INSERT' THEN
      -- For new admin subscriptions, ensure proper status
      NEW.status := 'active';
      NEW.cancel_at_period_end := false;
      RAISE NOTICE 'Admin subscription insert: normalized for user %', NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Lock down execution rights
REVOKE ALL ON FUNCTION public.protect_admin_subscriptions() FROM public;
GRANT EXECUTE ON FUNCTION public.protect_admin_subscriptions() TO postgres;
GRANT EXECUTE ON FUNCTION public.protect_admin_subscriptions() TO service_role;

-- 2) Attach trigger to subscriptions table
DROP TRIGGER IF EXISTS trg_protect_admin_subscriptions_ins ON public.subscriptions;
DROP TRIGGER IF EXISTS trg_protect_admin_subscriptions_upd ON public.subscriptions;

CREATE TRIGGER trg_protect_admin_subscriptions_ins
BEFORE INSERT ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.protect_admin_subscriptions();

CREATE TRIGGER trg_protect_admin_subscriptions_upd
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.protect_admin_subscriptions();

-- 3) Update get_effective_tier to also check subscriptions table
-- This makes it comprehensive across both billing and subscriptions tables
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
  sub_status text;
  sub_plan_key text;
BEGIN
  -- Check admin status first - admins always get full access
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = target_user_id AND role = 'admin'
  ) INTO user_is_admin;

  IF user_is_admin THEN
    RETURN 'advisor'; -- Highest tier (professional_review equivalent)
  END IF;

  -- Check advisor role
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = target_user_id AND role = 'advisor'
  ) INTO user_is_advisor;

  IF user_is_advisor THEN
    RETURN 'advisor';
  END IF;

  -- Check billing table first (primary source for Stripe webhook writes)
  SELECT subscription_status, price_id
  INTO billing_status, billing_price_id
  FROM public.billing
  WHERE user_id = target_user_id;

  IF billing_status = 'active' AND billing_price_id IS NOT NULL THEN
    -- Map price IDs to tiers
    IF billing_price_id IN ('price_1Sod5F3ppKk8xETzl9EDOR6I', 'price_1Sod5S3ppKk8xETzmky1P3Pr') THEN
      RETURN 'advisor';
    ELSIF billing_price_id IN ('price_1Sod4a3ppKk8xETz9TzPFn8P', 'price_1Sod513ppKk8xETzwcEPnT51') THEN
      RETURN 'pro';
    END IF;
  END IF;

  -- Fallback: check subscriptions table
  SELECT status, plan_key
  INTO sub_status, sub_plan_key
  FROM public.subscriptions
  WHERE user_id = target_user_id
    AND status IN ('active', 'trialing')
  ORDER BY current_period_end DESC NULLS LAST
  LIMIT 1;

  IF sub_status IN ('active', 'trialing') AND sub_plan_key IS NOT NULL THEN
    IF sub_plan_key = 'professional' OR sub_plan_key = 'advisor' THEN
      RETURN 'advisor';
    ELSIF sub_plan_key = 'pro' OR sub_plan_key = 'decision_support' THEN
      RETURN 'pro';
    END IF;
  END IF;

  -- Default to free tier
  RETURN 'free';
END;
$$;

-- Ensure proper grants
REVOKE ALL ON FUNCTION public.get_effective_tier(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_effective_tier(uuid) TO postgres;
GRANT EXECUTE ON FUNCTION public.get_effective_tier(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_effective_tier(uuid) TO authenticated;

-- 4) Add helper function to check if user is admin (convenience wrapper)
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(uid, 'admin')
$$;

-- 5) Add helper function to check if user is advisor (includes admin)
CREATE OR REPLACE FUNCTION public.is_advisor(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(uid, 'advisor') OR public.has_role(uid, 'admin')
$$;