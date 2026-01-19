/**
 * Rate Metadata Types
 * 
 * Centralized types for rate source tracking.
 * Used across purchase, refinance, HELOC, and assumption scenarios.
 * 
 * NOTE: Rate locking has been removed. Rates are always editable.
 * Rate source metadata is informational only.
 */

import { RateSourceType, RATE_SOURCE_LABELS } from "./mortgage";

export type { RateSourceType };
export { RATE_SOURCE_LABELS };

/**
 * Rate keys that can have individual source metadata
 */
export type RateKey =
  | "mortgage.apr"
  | "heloc.apr"
  | "assumption.assumed_apr"
  | "assumption.gap_second_apr"
  | "assumption.gap_heloc_apr";

/**
 * Human-readable labels for rate keys
 */
export const RATE_KEY_LABELS: Record<RateKey, string> = {
  "mortgage.apr": "Interest rate",
  "heloc.apr": "HELOC APR",
  "assumption.assumed_apr": "Assumed loan rate",
  "assumption.gap_second_apr": "Second loan rate",
  "assumption.gap_heloc_apr": "Gap HELOC rate",
} as const;

/**
 * Source metadata for a single rate (informational only)
 */
export interface RateSourceMeta {
  sourceType: RateSourceType;
  sourceNote: string | null;
}

/**
 * Default rate source metadata
 */
export const DEFAULT_RATE_SOURCE_META: RateSourceMeta = {
  sourceType: "user_entered",
  sourceNote: null,
};

/**
 * Complete rate metadata structure stored in inputs.rateMeta
 */
export interface RateMeta {
  global: RateSourceMeta;
  components: Partial<Record<RateKey, RateSourceMeta>>;
}

/**
 * Default rate metadata
 */
export const DEFAULT_RATE_META: RateMeta = {
  global: { ...DEFAULT_RATE_SOURCE_META },
  components: {},
};

/**
 * Get the effective rate source for a specific rate key.
 * Falls back to global if no component-level override exists.
 */
export function getEffectiveRateSource(
  rateMeta: RateMeta | undefined,
  rateKey: RateKey
): RateSourceMeta {
  if (!rateMeta) return { ...DEFAULT_RATE_SOURCE_META };
  
  const component = rateMeta.components[rateKey];
  if (component) return component;
  
  return rateMeta.global ?? { ...DEFAULT_RATE_SOURCE_META };
}

/**
 * Set a component-level rate source
 */
export function setComponentRateSource(
  rateMeta: RateMeta | undefined,
  rateKey: RateKey,
  updates: Partial<RateSourceMeta>
): RateMeta {
  const current = rateMeta ?? { ...DEFAULT_RATE_META, components: {} };
  const currentComponent = current.components[rateKey] ?? { ...DEFAULT_RATE_SOURCE_META };
  
  return {
    ...current,
    components: {
      ...current.components,
      [rateKey]: {
        ...currentComponent,
        ...updates,
      },
    },
  };
}
