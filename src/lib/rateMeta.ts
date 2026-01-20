/**
 * Rate Metadata Types
 * 
 * Centralized types for rate source tracking and advisor locking.
 * Used across purchase, refinance, HELOC, and assumption scenarios.
 * 
 * Rate locking allows advisors to set and lock rate inputs so clients
 * cannot modify them. This is governance, not paywall logic.
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
 * Source metadata for a single rate, including lock state
 */
export interface RateSourceMeta {
  sourceType: RateSourceType;
  sourceNote: string | null;
  // Lock state - when locked, only advisors can edit
  locked: boolean;
  lockedBy: string | null; // user_id of advisor who locked
  lockedAt: string | null; // ISO timestamp
}

/**
 * Default rate source metadata (unlocked, user-entered)
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
 * Lock a rate field (advisor-only action)
 */
export function lockRateField(
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
 * Unlock a rate field (advisor-only action)
 */
export function unlockRateField(
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
 * Lock all rate fields in the scenario (advisor-only action)
 */
export function lockAllRates(
  rateMeta: RateMeta | undefined,
  advisorUserId: string
): RateMeta {
  const current = rateMeta ?? { ...DEFAULT_RATE_META, components: {} };
  
  return {
    global: {
      ...current.global,
      locked: true,
      lockedBy: advisorUserId,
      lockedAt: new Date().toISOString(),
    },
    components: current.components,
  };
}

/**
 * Unlock all rate fields in the scenario (advisor-only action)
 */
export function unlockAllRates(
  rateMeta: RateMeta | undefined
): RateMeta {
  const current = rateMeta ?? { ...DEFAULT_RATE_META, components: {} };
  
  // Unlock global
  const newGlobal: RateSourceMeta = {
    ...current.global,
    locked: false,
    lockedBy: null,
    lockedAt: null,
  };
  
  // Unlock all components
  const newComponents: Partial<Record<RateKey, RateSourceMeta>> = {};
  for (const key of Object.keys(current.components) as RateKey[]) {
    const comp = current.components[key];
    if (comp) {
      newComponents[key] = {
        ...comp,
        locked: false,
        lockedBy: null,
        lockedAt: null,
      };
    }
  }
  
  return {
    global: newGlobal,
    components: newComponents,
  };
}

/**
 * Check if a rate field is locked
 */
export function isRateLocked(
  rateMeta: RateMeta | undefined,
  rateKey: RateKey
): boolean {
  const source = getEffectiveRateSource(rateMeta, rateKey);
  return source.locked;
}

/**
 * Check if any rate field is locked
 */
export function hasAnyLockedRate(rateMeta: RateMeta | undefined): boolean {
  if (!rateMeta) return false;
  
  // Check global lock
  if (rateMeta.global.locked) return true;
  
  // Check component locks
  for (const key of Object.keys(rateMeta.components) as RateKey[]) {
    const comp = rateMeta.components[key];
    if (comp?.locked) return true;
  }
  
  return false;
}

/**
 * Get all locked rate keys
 */
export function getLockedRateKeys(rateMeta: RateMeta | undefined): RateKey[] {
  if (!rateMeta) return [];
  
  const locked: RateKey[] = [];
  const allKeys: RateKey[] = [
    "mortgage.apr",
    "heloc.apr",
    "assumption.assumed_apr",
    "assumption.gap_second_apr",
    "assumption.gap_heloc_apr",
  ];
  
  for (const key of allKeys) {
    if (isRateLocked(rateMeta, key)) {
      locked.push(key);
    }
  }
  
  return locked;
}
