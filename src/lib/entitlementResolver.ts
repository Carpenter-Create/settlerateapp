/**
 * Centralized Entitlement Resolver
 *
 * Canonical server-side helper for determining user access.
 * Uses database evaluate_entitlement for consistency.
 */

import { supabase } from "@/integrations/supabase/client";
import type { SubscriptionTier } from "@/lib/stripe";

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

export async function getEffectiveTier(userId: string): Promise<SubscriptionTier> {
  const { data, error } = await supabase.rpc("get_effective_tier", {
    target_user_id: userId,
  });

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
  if (requiredTier === "free") return true;
  const effectiveTier = await getEffectiveTier(userId);
  return effectiveTier === "pro";
}

export async function getUserCapabilitiesServer(userId: string) {
  const [admin, tier] = await Promise.all([isAdmin(userId), getEffectiveTier(userId)]);

  return {
    isAdmin: admin,
    effectiveTier: tier,
    canUsePro: admin || tier === "pro",
  };
}
