-- Minimal auth stub for local entitlement SQL integration tests (not applied in production).
-- Enables repo migrations that reference auth.users and auth.uid().

CREATE SCHEMA IF NOT EXISTS auth;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS extensions;

CREATE OR REPLACE FUNCTION extensions.gen_random_bytes(p_len integer)
RETURNS bytea
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public.gen_random_bytes(p_len);
$$;

-- email is character varying(255), matching Supabase's real auth.users
-- schema exactly (not `text`). This distinction matters: fix/admin-rpc-return-types
-- (supabase/migrations/20260808010000_fix_admin_rpc_return_types.sql) fixes a
-- production defect that only reproduces when this column's type differs
-- from the `text` columns declared in RETURNS TABLE signatures that select
-- from it (e.g. public.list_admins, public.list_recent_admin_promotions).
-- Using `text` here would silently hide that entire defect class in
-- test:entitlement-sql.
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY,
  email character varying(255),
  raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Minimal storage schema for migrations referencing storage.buckets/objects
CREATE SCHEMA IF NOT EXISTS storage;

CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  public boolean NOT NULL DEFAULT false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text REFERENCES storage.buckets(id),
  name text,
  owner uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_accessed_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE OR REPLACE FUNCTION storage.foldername(name text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT string_to_array(name, '/');
$$;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Legacy subscriptions table referenced by admin-lock migration (not created elsewhere in repo)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  status text,
  plan_key text,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  current_period_end timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON public.subscriptions(user_id);

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.jwt()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
$$;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), 'anon');
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'postgres';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT SELECT ON auth.users TO authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres, authenticated, service_role;
GRANT authenticated TO authenticator;

CREATE SCHEMA IF NOT EXISTS test;

CREATE OR REPLACE FUNCTION test.set_auth(p_user_id uuid, p_role text DEFAULT 'authenticated')
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_user_id::text, false);
  PERFORM set_config('request.jwt.claim.role', p_role, false);
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', p_user_id, 'role', p_role)::text,
    false
  );
  EXECUTE format('SET ROLE %I', p_role);
END;
$$;

CREATE OR REPLACE FUNCTION test.reset_auth()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '', false);
  PERFORM set_config('request.jwt.claim.role', '', false);
  PERFORM set_config('request.jwt.claims', '{}', false);
  RESET ROLE;
END;
$$;

CREATE OR REPLACE FUNCTION test.assert_true(p_label text, p_condition boolean)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT p_condition THEN
    RAISE EXCEPTION 'ASSERT_FAIL: %', p_label;
  END IF;
  RAISE NOTICE 'ASSERT_OK: %', p_label;
END;
$$;

CREATE OR REPLACE FUNCTION test.assert_raises(p_label text, p_sql text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
    RAISE EXCEPTION 'ASSERT_FAIL: % (expected exception)', p_label;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'ASSERT_OK: % (%).', p_label, SQLERRM;
  END;
END;
$$;

GRANT USAGE ON SCHEMA test TO postgres, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA test TO postgres, authenticated, service_role;
