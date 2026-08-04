# Phase 7A beta billing hardening deployment runbook

**Status:** Sandbox and code-hardening deployment guidance only. The live Stripe catalog and secret cutover is **NOT YET AUTHORIZED**.

## Authority model

- **Stripe is payment authority.** Stripe Customer and Subscription records determine payment and subscription facts.
- **`public.billing` is the billing projection.** Verified webhook state is projected into this table; it is not an independent payment authority.
- **The entitlement evaluator is access authority.** `evaluate_entitlement` / `feature_allowed` evaluate the approved billing projection, plan allowlist, and status to control access. Client success URLs and client-side state never grant entitlement.

## Phase 7A code hardening included

Deploy this runbook only with the Phase 7A billing-hardening code that:

- returns `409 ALREADY_SUBSCRIBED` rather than opening another Professional Checkout for an existing qualifying subscription;
- retrieves the current Stripe Subscription before writing webhook billing state, so delayed or out-of-order event payloads do not become the final projection;
- resolves or repairs a missing Stripe customer map only through a unique `metadata.user_id` match, including the Customer Portal path;
- never adopts a Stripe Customer by matching email alone.

## Migration sequence

Apply the complete repository migration chain in order. For Phase 6 entitlement and catalog deployment, the required files are:

1. `20260804120000_phase6_entitlement_hardening.sql`
2. `20260804130000_phase6_entitlement_followup.sql`
3. `20260804140000_phase6_stage2_hardening.sql`
4. `20260804150000_phase6_remove_advisor_product_model.sql`
5. `20260804160000_phase6_privileged_function_grants.sql`
6. `20260804170000_phase6_stripe_sandbox_catalog.sql`

The last migration is part of the Phase 6 sequence. It sets the current sandbox Professional-price allowlist in the entitlement functions and must not be omitted. This Task 4 runbook creates no live-catalog migration and does not change any price ID.

Use the Supabase migration workflow only after review and a database backup. Verify the entitlement SQL checks in `docs/PHASE6_DEPLOYMENT.md` before deploying dependent functions.

## Sandbox deployment order

After the migration sequence is verified, deploy the Edge Functions in this order:

1. `stripe-webhook`
2. `create-checkout`
3. `customer-portal`
4. `check-subscription`
5. Frontend application bundle

Do not deploy the frontend first: it may otherwise direct users to behavior that its supporting Edge Functions do not yet provide.

## Sandbox smoke checklist

Use a dedicated non-admin sandbox test account. Confirm each result against Stripe Dashboard records and the resulting `public.billing` / entitlement state.

1. **New subscription:** one Professional Checkout produces one Stripe subscription and the verified webhook projection grants the expected Professional entitlement.
2. **Double upgrade / existing subscription:** repeat Upgrade or replay the request while a qualifying Professional subscription is `active`, `trialing`, `past_due`, or `unpaid`; it returns `ALREADY_SUBSCRIBED` and creates no second subscription.
3. **Portal cancellation:** schedule cancellation in the portal. While Stripe remains `active` or `trialing`, Professional access remains available through `currentPeriodEndsAt`.
4. **Billing-map repair:** delete the sandbox billing customer map for a metadata-bound paid user, then open the portal. A unique `metadata.user_id` Customer match repairs the map and opens the portal without creating another Checkout.
5. **Past due:** move the subscription to `past_due` in sandbox and verify entitlement becomes `read_only`; paid writes are denied while the billing portal remains available.
6. **Same-email stranger:** create or retain an unrelated Stripe Customer with the same email but no matching `metadata.user_id`. Checkout and portal must not adopt that Customer.

## Future live catalog cutover — NOT YET AUTHORIZED

Do not perform these steps until the founder explicitly authorizes live catalog and secret cutover:

1. Founder creates the live SettleRate Professional Product and monthly and annual Prices in the live Stripe account.
2. Record the founder-provided live IDs and update the TypeScript and SQL Professional-price allowlists in one reviewed, lockstep change. Do not invent IDs or leave sandbox IDs as live grantors.
3. Apply the accompanying reviewed SQL migration, then deploy Edge Functions and frontend in the order above.
4. Configure the live Stripe webhook endpoint signing secret in the deployed `stripe-webhook` environment; never place it in source control.
5. Set the live Stripe Customer Portal return URL to `https://app.settlerate.com/app/account`.
6. Run the applicable smoke checklist against live mode before announcing availability.

Until that authorization, retain the current sandbox catalog configuration and use the sandbox smoke checklist only.

## Related documents

- `docs/PHASE6_DEPLOYMENT.md` — Phase 6 migration, SQL verification, and entitlement deployment details
- `docs/ENTITLEMENT_CONTRACT.md` — price allowlist and entitlement status contract
- `docs/SECURITY_MODEL.md` — authorization and secret-handling requirements
