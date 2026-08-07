-- =============================================================================
-- Epic 6 PR 2A — restore missing schema provenance (repository-side only)
-- =============================================================================
-- Evidence (PR 1 production capture, project vpcxzbaxhpucvevnkalo):
--   * Production schema_migrations contains version 20260112193137 with no
--     matching file in git (orphan between 20260112073630 and 20260112203732).
--   * No git migration CREATE TABLE public.subscriptions; migration
--     20260112204012_* attaches triggers and SELECTs against it.
--   * public.profiles CREATE (20260111231451_*) only has id/full_name/created_at;
--     production also has stripe_customer_id, plan_key, plan_status,
--     current_period_end (plus UNIQUE/index on stripe_customer_id).
--
-- This file restores that orphan version into git. SQL bodies are reconstructed
-- from the sanitized production catalog (docs/database/production-schema/),
-- NOT recovered original source text (unknown). Definition matches current
-- production structural evidence for these objects.
--
-- Production application: version 20260112193137 is ALREADY recorded in the
-- production migration ledger, so a normal Supabase apply treats this file as
-- already applied and will NOT re-execute it. Do NOT run migration repair.
-- Do NOT db push this as a pending change against production.
--
-- Protect-admin triggers on subscriptions are intentionally NOT created here;
-- they are owned by 20260112204012_* (next migration).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) public.subscriptions — production-backed structural definition
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_customer_id text NOT NULL,
  plan_key text NOT NULL,
  status text NOT NULL,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id
  ON public.subscriptions USING btree (stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
  ON public.subscriptions USING btree (user_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscriptions_select_own ON public.subscriptions;
CREATE POLICY subscriptions_select_own
  ON public.subscriptions
  FOR SELECT
  TO public
  USING (auth.uid() = user_id);

-- updated_at maintenance (function public.tg_set_updated_at exists from earlier migrations)
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_updated_at();

-- Match production table privilege matrix (RLS remains the row filter).
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.subscriptions TO anon, authenticated, service_role, postgres;

-- ---------------------------------------------------------------------------
-- 2) public.profiles — production columns absent from original CREATE
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS plan_key text NOT NULL DEFAULT 'core'::text,
  ADD COLUMN IF NOT EXISTS plan_status text NOT NULL DEFAULT 'active'::text,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

-- UNIQUE (stripe_customer_id): prefer constraint name used in production.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_stripe_customer_id_key'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_stripe_customer_id_key UNIQUE (stripe_customer_id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
  ON public.profiles USING btree (stripe_customer_id);
