import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  refetchEntitlementUsage,
  shouldRefreshUsageAfterScenarioMutation,
  subscriptionQueryKey,
} from "@/lib/entitlementUsageRefresh";

describe("entitlementUsageRefresh", () => {
  it("uses a stable subscription query key per user", () => {
    expect(subscriptionQueryKey("user-1")).toEqual(["subscription", "user-1"]);
  });

  it("refreshes usage only after successful count-changing mutations", () => {
    expect(shouldRefreshUsageAfterScenarioMutation("create", true)).toBe(true);
    expect(shouldRefreshUsageAfterScenarioMutation("duplicate", true)).toBe(true);
    expect(shouldRefreshUsageAfterScenarioMutation("delete", true)).toBe(true);
    expect(shouldRefreshUsageAfterScenarioMutation("create", false)).toBe(false);
    expect(shouldRefreshUsageAfterScenarioMutation("duplicate", false)).toBe(false);
    expect(shouldRefreshUsageAfterScenarioMutation("delete", false)).toBe(false);
  });

  it("invalidates and refetches the subscription query for the active user", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const refetchSpy = vi.spyOn(queryClient, "refetchQueries");

    await refetchEntitlementUsage(queryClient, "user-42");

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: subscriptionQueryKey("user-42"),
    });
    expect(refetchSpy).toHaveBeenCalledWith({
      queryKey: subscriptionQueryKey("user-42"),
    });
  });

  it("no-ops when user id is missing", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await refetchEntitlementUsage(queryClient, undefined);

    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
