/**
 * Authorization utilities for SettleRate
 * 
 * Central source of truth for user capabilities.
 * All feature gates should use these helpers.
 */

import { supabase } from "@/integrations/supabase/client";

export interface UserCapabilities {
  isAdmin: boolean;
  isAdvisor: boolean;
  hasPaid: boolean;
  canUsePro: boolean;
  canUseAdvisor: boolean;
  canApproveAdvisors: boolean;
}

/**
 * Check if the current user has the admin role.
 * Uses database-backed role check via RLS.
 */
export async function checkIsAdmin(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (error) {
    // RLS denied or error - not admin
    return false;
  }

  return data !== null;
}

/**
 * Check if the current user has the advisor role.
 * Uses database-backed role check via RLS.
 */
export async function checkIsAdvisor(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // First check if admin (admins have all capabilities)
  const isAdmin = await checkIsAdmin();
  if (isAdmin) return true;

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "advisor")
    .maybeSingle();

  if (error) {
    return false;
  }

  return data !== null;
}

/**
 * Get all user capabilities in a single object.
 * Use this for comprehensive access checks.
 */
export async function getUserCapabilities(
  subscriptionTier: "free" | "pro" | "advisor" = "free"
): Promise<UserCapabilities> {
  const isAdmin = await checkIsAdmin();
  const isAdvisorRole = await checkIsAdvisor();
  
  const hasPaid = subscriptionTier === "pro" || subscriptionTier === "advisor";

  return {
    isAdmin,
    isAdvisor: isAdvisorRole,
    hasPaid,
    // Admin bypasses all subscription checks
    canUsePro: isAdmin || hasPaid,
    canUseAdvisor: isAdmin || isAdvisorRole,
    canApproveAdvisors: isAdmin,
  };
}

/**
 * Feature access with admin bypass.
 * Admins get all features regardless of subscription.
 */
/**
 * @deprecated Prefer useCapabilities / server evaluate_entitlement.
 * Admin bypass must be server-verified; this helper is UI-only.
 */
export function getFeatureAccessWithAdminBypass(
  tier: "free" | "pro" | "advisor",
  isAdmin: boolean
) {
  if (isAdmin || tier === "pro") {
    return {
      canModel: true,
      canCompare: true,
      canSave: true,
      canExport: true,
      canViewIncomeContext: true,
      canVersion: true,
    };
  }

  // Advisor is not an active entitlement tier
  return {
    canModel: true,
    canCompare: true,
    canSave: true,
    canExport: false,
    canViewIncomeContext: false,
    canVersion: false,
  };
}
