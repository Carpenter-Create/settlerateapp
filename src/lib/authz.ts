/**
 * Authorization utilities for SettleRate
 *
 * Server-verified admin role is the only administrative authority.
 * Customer plans (Analytical / Professional) do not grant admin access.
 */

import { supabase } from "@/integrations/supabase/client";

export interface UserCapabilities {
  isAdmin: boolean;
  hasPaid: boolean;
  canUsePro: boolean;
}

export async function checkIsAdmin(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (error) return false;
  return data !== null;
}

export async function getUserCapabilities(
  subscriptionTier: "free" | "pro" = "free"
): Promise<UserCapabilities> {
  const isAdmin = await checkIsAdmin();
  const hasPaid = subscriptionTier === "pro";

  return {
    isAdmin,
    hasPaid,
    canUsePro: isAdmin || hasPaid,
  };
}

/**
 * @deprecated Prefer useCapabilities / server evaluate_entitlement.
 */
export function getFeatureAccessWithAdminBypass(
  tier: "free" | "pro",
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

  return {
    canModel: true,
    canCompare: true,
    canSave: true,
    canExport: false,
    canViewIncomeContext: false,
    canVersion: false,
  };
}
