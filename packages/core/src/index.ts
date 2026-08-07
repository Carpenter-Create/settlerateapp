/**
 * @settlerate/core public entry (Epic 5).
 *
 * Authority: docs/adr/0005-shared-package-architecture.md
 *
 * Stable surfaces:
 * - `@settlerate/core` — curated root re-exports
 * - `@settlerate/core/entitlement` — entitlement contract (preferred domain entry)
 *
 * Prefer domain subpaths for new consumers. Root re-exports entitlement for
 * convenience; they are the same implementation.
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
