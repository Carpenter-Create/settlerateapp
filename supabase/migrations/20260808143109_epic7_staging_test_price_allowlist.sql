-- Epic 7: Allow staging Stripe test-mode Professional prices in SQL entitlement.
-- These price IDs exist only in Stripe test mode (livemode=false).
-- Live checkout continues to use live price IDs; create-checkout rejects
-- cross-mode selection via isPriceAllowedForStripeSecret.
-- Authority: docs/adr/0008-environment-topology.md, docs/staging/STAGING_STRIPE.md.

CREATE OR REPLACE FUNCTION public.is_professional_price(p_price_id text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_price_id IN (
    -- Live catalog (Phase 7B)
    'price_1U0t2QC56u2NxRItya8dElyg',
    'price_1U0t2jC56u2NxRItM185AYK9',
    -- Staging test-mode catalog (Epic 7)
    'price_1U2BGAC56u2NxRItx3etGK2q',
    'price_1U2BGBC56u2NxRIt8cw5cx2m'
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
