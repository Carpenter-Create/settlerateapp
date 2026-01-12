/**
 * Effective Access Hook for Admin Testing Mode
 * 
 * Allows admins to simulate standard user experiences without
 * modifying real billing or entitlement data.
 * 
 * Storage is browser-local only (localStorage).
 */

import { useState, useEffect, useCallback } from "react";
import { useAdmin } from "./useAdmin";

export type EffectiveRole = "admin" | "user";
export type EffectiveTier = "free" | "pro" | "advisor";

const STORAGE_KEY_ROLE = "settlerate_admin_effective_role";
const STORAGE_KEY_TIER = "settlerate_admin_effective_tier";

interface EffectiveAccessState {
  effectiveRole: EffectiveRole;
  effectiveTier: EffectiveTier;
  isSimulating: boolean;
}

interface UseEffectiveAccessReturn extends EffectiveAccessState {
  setEffectiveRole: (role: EffectiveRole) => void;
  setEffectiveTier: (tier: EffectiveTier) => void;
  resetToAdmin: () => void;
  canSimulate: boolean;
}

/**
 * Hook for managing admin testing/simulation mode.
 * Only admins can use simulation features.
 */
export function useEffectiveAccess(): UseEffectiveAccessReturn {
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  
  const [effectiveRole, setEffectiveRoleState] = useState<EffectiveRole>(() => {
    if (typeof window === "undefined") return "admin";
    const stored = localStorage.getItem(STORAGE_KEY_ROLE);
    return (stored === "user" ? "user" : "admin") as EffectiveRole;
  });

  const [effectiveTier, setEffectiveTierState] = useState<EffectiveTier>(() => {
    if (typeof window === "undefined") return "free";
    const stored = localStorage.getItem(STORAGE_KEY_TIER);
    if (stored === "pro" || stored === "advisor" || stored === "free") {
      return stored as EffectiveTier;
    }
    return "free";
  });

  // Only allow simulation if user is actually an admin
  const canSimulate = isAdmin && !adminLoading;
  
  // Determine if currently simulating (admin viewing as non-admin)
  const isSimulating = canSimulate && effectiveRole === "user";

  // Reset overrides if user is not admin (security)
  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      localStorage.removeItem(STORAGE_KEY_ROLE);
      localStorage.removeItem(STORAGE_KEY_TIER);
      setEffectiveRoleState("admin");
      setEffectiveTierState("free");
    }
  }, [isAdmin, adminLoading]);

  const setEffectiveRole = useCallback((role: EffectiveRole) => {
    if (!canSimulate) return;
    
    localStorage.setItem(STORAGE_KEY_ROLE, role);
    setEffectiveRoleState(role);
    
    // Reset tier to free when switching to user mode
    if (role === "user") {
      localStorage.setItem(STORAGE_KEY_TIER, "free");
      setEffectiveTierState("free");
    }
  }, [canSimulate]);

  const setEffectiveTier = useCallback((tier: EffectiveTier) => {
    if (!canSimulate) return;
    
    localStorage.setItem(STORAGE_KEY_TIER, tier);
    setEffectiveTierState(tier);
  }, [canSimulate]);

  const resetToAdmin = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_ROLE);
    localStorage.removeItem(STORAGE_KEY_TIER);
    setEffectiveRoleState("admin");
    setEffectiveTierState("free");
  }, []);

  return {
    effectiveRole: canSimulate ? effectiveRole : "admin",
    effectiveTier,
    isSimulating,
    setEffectiveRole,
    setEffectiveTier,
    resetToAdmin,
    canSimulate,
  };
}

/**
 * Get effective tier for feature gating.
 * Uses simulation tier if admin is simulating, otherwise real tier.
 */
export function getEffectiveTier(
  realTier: EffectiveTier,
  isAdmin: boolean,
  isSimulating: boolean,
  simulatedTier: EffectiveTier
): EffectiveTier {
  // If admin is simulating, use simulated tier
  if (isAdmin && isSimulating) {
    return simulatedTier;
  }
  
  // Admins get full access when not simulating
  if (isAdmin) {
    return "advisor"; // Highest tier
  }
  
  return realTier;
}
