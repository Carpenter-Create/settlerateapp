/**
 * Admin testing helpers (Phase 6).
 *
 * localStorage simulation must NEVER grant or revoke entitlements.
 * Server-verified billing + user_roles remain authoritative.
 * This hook is retained only so the admin panel can display a non-authoritative note.
 */

import { useAdmin } from "./useAdmin";

export type EffectiveRole = "admin" | "user";
export type EffectiveTier = "free" | "pro" | "advisor";

interface UseEffectiveAccessReturn {
  effectiveRole: EffectiveRole;
  effectiveTier: EffectiveTier;
  isSimulating: boolean;
  setEffectiveRole: (role: EffectiveRole) => void;
  setEffectiveTier: (tier: EffectiveTier) => void;
  resetToAdmin: () => void;
  canSimulate: boolean;
}

/**
 * No-op simulation surface. Entitlement bypass is server-only via has_role(admin).
 */
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

/**
 * @deprecated Phase 6 — do not use for feature gating. Prefer useCapabilities / check-subscription.
 */
export function getEffectiveTier(
  realTier: EffectiveTier,
  _isAdmin: boolean,
  _isSimulating: boolean,
  _simulatedTier: EffectiveTier
): EffectiveTier {
  return realTier === "advisor" ? "pro" : realTier;
}
