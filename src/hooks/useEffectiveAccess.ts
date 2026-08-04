/**
 * Admin testing helpers (Phase 6).
 *
 * localStorage simulation must NEVER grant or revoke entitlements.
 * Server-verified billing + user_roles remain authoritative.
 */

import { useAdmin } from "./useAdmin";

export type EffectiveRole = "admin" | "user";
export type EffectiveTier = "free" | "pro";

interface UseEffectiveAccessReturn {
  effectiveRole: EffectiveRole;
  effectiveTier: EffectiveTier;
  isSimulating: boolean;
  setEffectiveRole: (role: EffectiveRole) => void;
  setEffectiveTier: (tier: EffectiveTier) => void;
  resetToAdmin: () => void;
  canSimulate: boolean;
}

export function useEffectiveAccess(): UseEffectiveAccessReturn {
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const canSimulate = false;

  return {
    effectiveRole: isAdmin && !adminLoading ? "admin" : "user",
    effectiveTier: "free",
    isSimulating: false,
    setEffectiveRole: () => {
      /* entitlement simulation disabled */
    },
    setEffectiveTier: () => {
      /* entitlement simulation disabled */
    },
    resetToAdmin: () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("settlerate_admin_effective_role");
        localStorage.removeItem("settlerate_admin_effective_tier");
      }
    },
    canSimulate,
  };
}

/** @deprecated Phase 6 — do not use for feature gating. */
export function getEffectiveTierLegacy(realTier: EffectiveTier): EffectiveTier {
  return realTier;
}
