/**
 * Centralized Entitlement Resolver
 * 
 * Canonical server-side helper for determining user access.
 * Uses database function for consistency across all access points.
 */

import { supabase } from "@/integrations/supabase/client";
import type { SubscriptionTier } from "@/lib/stripe";

/**
 * Check if a user has admin role.
 * Uses the database has_role function for consistency.
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (error) {
    console.error("Error checking admin status:", error);
    return false;
  }

  return data !== null;
}

/**
 * Check if a user has advisor role (includes admins).
 */
export async function isAdvisor(userId: string): Promise<boolean> {
  // Check admin first - admins have all capabilities
  if (await isAdmin(userId)) {
    return true;
  }

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "advisor")
    .maybeSingle();

  if (error) {
    return false;
  }

  return data !== null;
}

/**
 * Effective legacy tier via DB evaluate_entitlement / get_effective_tier.
 * Advisor is never returned as a paid grant.
 */
export async function getEffectiveTier(userId: string): Promise<SubscriptionTier> {
  const { data, error } = await supabase
    .rpc("get_effective_tier", { target_user_id: userId });

  if (error) {
    console.error("Error getting effective tier:", error);
    return "free";
  }

  const tier = data as string;
  if (tier === "pro" || tier === "professional") return "pro";
  return "free";
}

export async function canAccessFeature(
  userId: string,
  requiredTier: SubscriptionTier
): Promise<boolean> {
  const effectiveTier = await getEffectiveTier(userId);
  if (requiredTier === "free") return true;
  // advisor requiredTier treated as professional for legacy callers
  return effectiveTier === "pro";
}

export async function getUserCapabilitiesServer(userId: string) {
  const [admin, advisor, tier] = await Promise.all([
    isAdmin(userId),
    isAdvisor(userId),
    getEffectiveTier(userId),
  ]);

  return {
    isAdmin: admin,
    isAdvisor: advisor,
    effectiveTier: tier,
    canUsePro: admin || tier === "pro",
    canUseAdvisor: false,
  };
}
