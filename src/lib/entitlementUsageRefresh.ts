import type { QueryClient } from "@tanstack/react-query";

/** React Query key for authoritative subscription / usage state. */
export function subscriptionQueryKey(userId: string | undefined) {
  return ["subscription", userId] as const;
}

/**
 * Invalidate and refetch check-subscription after scenario count changes.
 * Call only after a successful create, duplicate, or delete mutation.
 */
export async function refetchEntitlementUsage(
  queryClient: QueryClient,
  userId: string | undefined
): Promise<void> {
  if (!userId) return;
  const key = subscriptionQueryKey(userId);
  await queryClient.invalidateQueries({ queryKey: key });
  await queryClient.refetchQueries({ queryKey: key });
}

export type ScenarioUsageMutation = "create" | "duplicate" | "delete";

export function shouldRefreshUsageAfterScenarioMutation(
  mutation: ScenarioUsageMutation,
  succeeded: boolean
): boolean {
  if (!succeeded) return false;
  return mutation === "create" || mutation === "duplicate" || mutation === "delete";
}
