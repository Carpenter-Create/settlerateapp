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
 * Get effective tier for a user using the database resolver.
 * Admins always return highest tier regardless of billing.
 * 
 * This is the CANONICAL resolver - all tier checks should use this.
 */
export async function getEffectiveTier(userId: string): Promise<SubscriptionTier> {
  // Use the database function for canonical resolution
  const { data, error } = await supabase
    .rpc("get_effective_tier", { target_user_id: userId });

  if (error) {
    console.error("Error getting effective tier:", error);
    return "free";
  }

  // Map database tier to app tier
  const tier = data as string;
  if (tier === "advisor") return "advisor";
  if (tier === "pro") return "pro";
  return "free";
}

/**
 * Check if a user has access to a specific feature.
 * Uses effective tier with admin bypass.
 */
export async function canAccessFeature(
  userId: string,
  requiredTier: SubscriptionTier
): Promise<boolean> {
  const effectiveTier = await getEffectiveTier(userId);

  // Tier hierarchy: advisor > pro > free
  const tierValue: Record<SubscriptionTier, number> = {
    free: 0,
    pro: 1,
    advisor: 2,
  };

  return tierValue[effectiveTier] >= tierValue[requiredTier];
}

/**
 * Get all user capabilities in one call.
 * Useful for initial page load or auth checks.
 */
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
    canUsePro: admin || tier === "pro" || tier === "advisor",
    canUseAdvisor: admin || advisor,
  };
}
