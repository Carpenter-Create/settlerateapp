-- Phase 7B: Point Professional price allowlist at live Stripe catalog.
-- Live product: prod_V0usthAF9WnoGJ (SettleRate Professional)
-- Monthly: price_1U0t2QC56u2NxRItya8dElyg ($19/mo)
-- Annual:  price_1U0t2jC56u2NxRItM185AYK9 ($190/yr)
-- Retired sandbox prices must NOT grant (see SANDBOX_RETIRED_* in entitlementContract).

CREATE OR REPLACE FUNCTION public.is_professional_price(p_price_id text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_price_id IN (
    'price_1U0t2QC56u2NxRItya8dElyg',
    'price_1U0t2jC56u2NxRItM185AYK9'
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
