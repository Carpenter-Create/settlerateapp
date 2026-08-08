/**
 * @settlerate/core public entry (Epic 5).
 *
 * Authority: docs/adr/0005-shared-package-architecture.md
 *
 * Prefer domain subpaths for new consumers. Root re-exports curated named
 * symbols for convenience — never a wildcard package export map.
 *
 * Stable surfaces:
 * - `@settlerate/core/entitlement`
 * - `@settlerate/core/checkout-maintenance`
 * - `@settlerate/core/subscription-guard`
 * - `@settlerate/core/observability-redaction`
 * - `@settlerate/core/billing-snapshot` (pure mappers only)
 * - `@settlerate/core/customer-resolution` (pure helpers only)
 * - `@settlerate/core/app-origin` (string Origin header policy)
 * - `@settlerate/core/edge-observability` (deterministic helpers only)
 * - `@settlerate/core/export-summary` (persisted derived → export summary)
 */

/** Inert resolution marker (PR 1). Harmless alongside real contracts. */
export const SETTLERATE_CORE_SCAFFOLD_MARKER = "epic5-pr1-scaffold" as const;

export type SettlerateCoreScaffoldMarker = typeof SETTLERATE_CORE_SCAFFOLD_MARKER;

export {
  FREE_SCENARIO_LIMIT,
  PROFESSIONAL_TRIAL_DAYS,
  PROFESSIONAL_PRICE_IDS,
  PROFESSIONAL_PRODUCT_IDS,
  SANDBOX_RETIRED_PROFESSIONAL_PRICE_IDS,
  SANDBOX_RETIRED_PROFESSIONAL_PRODUCT_IDS,
  LEGACY_DELETED_PROFESSIONAL_PRICE_IDS,
  LEGACY_ADVISOR_PRICE_IDS,
  isAllowlistedProfessionalPrice,
  resolvePlanCodeFromPrice,
  evaluateEntitlement,
  isFeatureAllowed,
  featureAccessFromDecision,
  planCodeToLegacyTier,
} from "./entitlement/entitlementContract.ts";

export type {
  PlanCode,
  EntitlementStatus,
  ProtectedFeature,
  StripeSubscriptionStatus,
  BillingEntitlementInput,
  EntitlementDecision,
  FeatureAccessFlags,
} from "./entitlement/entitlementContract.ts";

export {
  CHECKOUT_MAINTENANCE_CODE,
  isCheckoutMaintenanceEnabled,
  checkoutMaintenancePayload,
} from "./checkout/checkoutMaintenance.ts";

export {
  CHECKOUT_BLOCKING_SUBSCRIPTION_STATUSES,
  billingRowBlocksCheckout,
  stripeSubscriptionsBlockCheckout,
  checkoutIdempotencyKey,
} from "./checkout/professionalSubscriptionGuard.ts";

export type {
  BillingRowLike,
} from "./checkout/professionalSubscriptionGuard.ts";

export {
  scrubString,
  redactExtra,
  redactBreadcrumb,
  redactEvent,
} from "./observability/observabilityRedaction.ts";

export type {
  MinimalBreadcrumb,
  MinimalStackFrame,
  MinimalStacktrace,
  MinimalMechanism,
  MinimalExceptionValue,
  MinimalSentryEvent,
} from "./observability/observabilityRedaction.ts";

export {
  mapSubscriptionToBillingSnapshot,
  extractSubscriptionPeriodEnd,
  extractSubscriptionPeriodStart,
  extractInvoiceSubscriptionId,
} from "./billing/stripeBillingSnapshot.ts";

export type {
  StripeSubscriptionItemLike,
  StripeSubscriptionLike,
  StripeInvoiceLike,
  StripeSubscriptionBillingSnapshot,
} from "./billing/stripeBillingSnapshot.ts";

export {
  resolveStripeCustomerByUserId,
  stripeCustomerMetadataSearchQuery,
} from "./billing/stripeCustomerResolve.ts";

export type {
  StripeCustomerLike,
  StripeCustomerResolution,
  CheckoutCustomerResolution,
} from "./billing/stripeCustomerResolve.ts";

export {
  DEFAULT_APP_ORIGIN,
  resolveAppOriginFromOriginHeader,
} from "./origin/appOrigin.ts";

export {
  isEdgeObservabilityEnabled,
  resolveSentryEnvironment,
  buildEdgeExtra,
} from "./observability/edgeObservability.ts";

export type { EdgeObservabilityContext } from "./observability/edgeObservability.ts";

export { mapDerivedExportSummary } from "./exports/derivedExportSummary.ts";

export type {
  ExportSnapshotSelection,
  MapDerivedExportSummaryOptions,
  DerivedExportSummary,
} from "./exports/derivedExportSummary.ts";
