/**
 * Force-include monorepo `@settlerate/core` modules for
 * `supabase functions deploy --use-api`.
 *
 * The Management API asset walker sometimes skips bare import-map targets
 * under `packages/core` even when `deno.json` maps them correctly. Relative
 * imports are always collected. Keep this module imported (side-effect) from
 * every Edge Function that depends on core.
 *
 * Paths are relative to this file under `supabase/functions/_shared/`
 * (`../../../packages/core/...` → repo `packages/core/...`).
 *
 * Authority: Epic 7 staging deploy path; does not change runtime semantics.
 */
import "../../../packages/core/src/entitlement/entitlementContract.ts";
import "../../../packages/core/src/checkout/checkoutMaintenance.ts";
import "../../../packages/core/src/checkout/professionalSubscriptionGuard.ts";
import "../../../packages/core/src/observability/observabilityRedaction.ts";
import "../../../packages/core/src/observability/edgeObservability.ts";
import "../../../packages/core/src/billing/stripeBillingSnapshot.ts";
import "../../../packages/core/src/billing/stripeCustomerResolve.ts";
import "../../../packages/core/src/origin/appOrigin.ts";
import "../../../packages/core/src/exports/derivedExportSummary.ts";
