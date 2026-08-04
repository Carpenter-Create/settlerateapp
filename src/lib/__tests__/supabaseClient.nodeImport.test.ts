import { describe, it, expect } from "vitest";

/**
 * CI runs Vitest in Node. Importing scenarioStore pulls in the Supabase client,
 * which must not throw ReferenceError on bare `localStorage`.
 */
describe("supabase client — Node import compatibility", () => {
  it("imports persistence/store modules without requiring browser localStorage", async () => {
    await expect(import("@/integrations/supabase/client")).resolves.toMatchObject({
      supabase: expect.anything(),
    });

    const storeModule = await import("@/lib/scenarioStore");
    expect(typeof storeModule.toSupabaseRow).toBe("function");
    expect(typeof storeModule.fromSupabaseRow).toBe("function");
    expect(typeof storeModule.materializeDuplicatedScenario).toBe("function");
  });
});
