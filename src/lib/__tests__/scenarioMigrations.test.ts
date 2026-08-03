import { describe, it, expect } from "vitest";
import { migrateScenario } from "@/lib/scenarioMigrations";
import bmM01 from "./fixtures/BM-M01.json";

describe("scenarioMigrations.benchmark — active regression", () => {
  it("BM-M01 legacy flat input migration preserves user values", () => {
    const result = migrateScenario(bmM01.legacyRaw);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const scenario = result.scenario;
    const expected = bmM01.expected;

    expect(scenario.schemaVersion).toBe(expected.schemaVersion);
    expect(scenario.inputs.mode).toBe(expected.mode);
    expect(scenario.inputs.purchase.purchasePrice).toBe(expected.purchasePrice);
    expect(scenario.inputs.purchase.downPayment).toBe(expected.downPayment);
    expect(scenario.inputs.shared.interestRate).toBe(expected.interestRate);
    expect(scenario.inputs.shared.loanTerm).toBe(expected.loanTerm);
    expect(scenario.id).toBe(bmM01.legacyRaw.id);
    expect(scenario.name).toBe(bmM01.legacyRaw.name);
  });
});

describe("scenarioMigrations.benchmark — specification-only", () => {
  it.todo(
    "BM-V01 original snapshot preserved after lazy recompute — DEF-001 — Phase 3: opening scenario at v1.0.0 must retain originalSnapshot when activeSnapshot updates to v2.0.0"
  );
});
