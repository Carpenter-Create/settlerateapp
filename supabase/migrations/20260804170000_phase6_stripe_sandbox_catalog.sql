-- Phase 6: Point Professional price allowlist at new Stripe sandbox catalog (acct_1U0isCC2Fmi7ZUCb)

CREATE OR REPLACE FUNCTION public.is_professional_price(p_price_id text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_price_id IN (
    'price_1U0k4DC2Fmi7ZUCbSniiEewZ',
    'price_1U0kFVC2Fmi7ZUCb6g0mXIRC'
  );
$$;

CREATE OR REPLACE FUNCTION public.resolve_plan_code(p_price_id text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN public.is_professional_price(p_price_id) THEN 'professional'
    ELSE 'analytical'
  END;
$$;
