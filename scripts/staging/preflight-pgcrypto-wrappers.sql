-- Staging greenfield preflight (Epic 7 / ADR 0008)
--
-- Historical migration 20260119150338 creates generate_share_token using
-- unqualified gen_random_bytes(). On a fresh Supabase project, pgcrypto
-- lives in the extensions schema and CREATE FUNCTION can fail with
-- "function gen_random_bytes(integer) does not exist" for the migration role.
--
-- Do NOT edit historical migrations (ADR 0006). Run this once on an empty
-- or mid-bootstrap staging database BEFORE `supabase db push --linked` when
-- that migration is still pending.
--
-- Safe to re-run (CREATE OR REPLACE). Staging-only operational helper — not
-- recorded in supabase_migrations.schema_migrations.
--
-- After any staging CLI link/push, restore CLI link to production:
--   supabase link --project-ref vpcxzbaxhpucvevnkalo --yes

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.gen_random_bytes(integer)
RETURNS bytea
LANGUAGE sql
VOLATILE PARALLEL SAFE
AS $$ SELECT extensions.gen_random_bytes($1) $$;

CREATE OR REPLACE FUNCTION public.gen_random_uuid()
RETURNS uuid
LANGUAGE sql
VOLATILE PARALLEL SAFE
AS $$ SELECT extensions.gen_random_uuid() $$;
