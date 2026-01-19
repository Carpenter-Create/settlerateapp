-- Fix security linter warning: add search_path to generate_share_token
-- Include extensions schema for gen_random_bytes
CREATE OR REPLACE FUNCTION public.generate_share_token()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT encode(extensions.gen_random_bytes(24), 'base64url');
$$;