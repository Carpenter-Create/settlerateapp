-- ═══════════════════════════════════════════════════════════════
-- SEED ADMIN FOR adam@carpentercreate.com + AUTO-GRANT TRIGGER
-- ═══════════════════════════════════════════════════════════════

-- 1) Seed admin role for existing user (if they exist)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'adam@carpentercreate.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 2) Create function to auto-grant admin on signup for specific email
CREATE OR REPLACE FUNCTION public.grant_admin_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-grant admin role to designated admin email
  IF NEW.email = 'adam@carpentercreate.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- 3) Create trigger on auth.users for auto-grant
-- Note: This trigger runs AFTER INSERT on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_grant_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_admin_on_signup();