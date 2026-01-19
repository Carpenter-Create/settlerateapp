/**
 * Rate Metadata Types
 * 
 * Centralized types for rate source tracking and advisor locking.
 * Used across purchase, refinance, HELOC, and assumption scenarios.
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
 * Source metadata for a single rate
 */
export interface RateSourceMeta {
  sourceType: RateSourceType;
  sourceNote: string | null;
  locked: boolean;
  lockedBy: string | null;  // user_id of advisor who locked
  lockedAt: string | null;  // ISO timestamp
}

/**
 * Default rate source metadata
 */
export const DEFAULT_RATE_SOURCE_META: RateSourceMeta = {
  sourceType: "user_entered",
  sourceNote: null,
  locked: false,
  lockedBy: null,
  lockedAt: null,
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
 * Check if a rate key is locked
 */
export function isRateLocked(
  rateMeta: RateMeta | undefined,
  rateKey: RateKey
): boolean {
  const source = getEffectiveRateSource(rateMeta, rateKey);
  return source.locked;
}

/**
 * Check if any rate in the scenario is locked
 */
export function hasAnyLockedRates(rateMeta: RateMeta | undefined): boolean {
  if (!rateMeta) return false;
  
  if (rateMeta.global.locked) return true;
  
  return Object.values(rateMeta.components).some(c => c?.locked);
}

/**
 * Get all locked rate keys
 */
export function getLockedRateKeys(rateMeta: RateMeta | undefined): RateKey[] {
  if (!rateMeta) return [];
  
  const locked: RateKey[] = [];
  
  // Check components first (they override global)
  for (const [key, meta] of Object.entries(rateMeta.components)) {
    if (meta?.locked) {
      locked.push(key as RateKey);
    }
  }
  
  return locked;
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

/**
 * Lock a rate (advisor action)
 */
export function lockRate(
  rateMeta: RateMeta | undefined,
  rateKey: RateKey,
  advisorUserId: string
): RateMeta {
  return setComponentRateSource(rateMeta, rateKey, {
    locked: true,
    lockedBy: advisorUserId,
    lockedAt: new Date().toISOString(),
  });
}

/**
 * Unlock a rate (advisor action)
 */
export function unlockRate(
  rateMeta: RateMeta | undefined,
  rateKey: RateKey
): RateMeta {
  return setComponentRateSource(rateMeta, rateKey, {
    locked: false,
    lockedBy: null,
    lockedAt: null,
  });
}

/**
 * Lock all rates in a scenario
 */
export function lockAllRates(
  rateMeta: RateMeta | undefined,
  advisorUserId: string,
  rateKeys: RateKey[]
): RateMeta {
  let result = rateMeta ?? { ...DEFAULT_RATE_META, components: {} };
  
  for (const key of rateKeys) {
    result = lockRate(result, key, advisorUserId);
  }
  
  return result;
}

/**
 * Unlock all rates in a scenario
 */
export function unlockAllRates(
  rateMeta: RateMeta | undefined,
  rateKeys: RateKey[]
): RateMeta {
  let result = rateMeta ?? { ...DEFAULT_RATE_META, components: {} };
  
  for (const key of rateKeys) {
    result = unlockRate(result, key);
  }
  
  return result;
}
