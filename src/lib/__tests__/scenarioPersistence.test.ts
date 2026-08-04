import { describe, it, expect, vi, afterEach } from "vitest";
import * as mortgage from "@/lib/mortgage";
import type { MortgageInputs } from "@/lib/mortgage";
import { DEFAULT_HELOC_INPUTS } from "@/lib/heloc";
import { DEFAULT_ASSUMPTION_INPUTS } from "@/lib/assumption";
import {
  createScenarioData,
  recalculateActiveSnapshot,
  updateScenarioInputs,
  CALCULATOR_VERSION,
} from "@/lib/scenarioContract";
import {
  hydrateScenarioData,
  snapshotsFromLegacyResults,
  summaryFromUnified,
} from "@/lib/scenarioPersistence";
import { calculateScenario } from "@/lib/scenarioCalculator";
import {
  ensureClientId,
  fromSupabaseRow,
  toSupabaseRow,
} from "@/lib/scenarioStore";
import { serializeInputsForSupabase } from "@/lib/scenarioInputSerialization";
import { assertWithinTolerance } from "./helpers";
import bmP01 from "./fixtures/BM-P01.json";
import bmR01 from "./fixtures/BM-R01.json";
import bmH02 from "./fixtures/BM-H02.json";
import bmA02 from "./fixtures/BM-A02.json";

afterEach(() => {
  vi.restoreAllMocks();
});

function purchaseInputs(): MortgageInputs {
  return bmP01.inputs as MortgageInputs;
}

function refinanceInputs(): MortgageInputs {
  return bmR01.inputs as MortgageInputs;
}

function helocInputs(): MortgageInputs {
  return {
    ...(bmP01.inputs as MortgageInputs),
    mode: "heloc",
    heloc: {
      ...DEFAULT_HELOC_INPUTS,
      ...(bmH02.inputs as typeof DEFAULT_HELOC_INPUTS),
    },
  };
}

function assumptionInputs(): MortgageInputs {
  return {
    ...(bmP01.inputs as MortgageInputs),
    mode: "assumption",
    assumption: {
      ...DEFAULT_ASSUMPTION_INPUTS,
      ...(bmA02.inputs as typeof DEFAULT_ASSUMPTION_INPUTS),
    },
  };
}

function roundTripViaSupabase(scenario: ReturnType<typeof createScenarioData>) {
  const row = {
    id: scenario.id,
    user_id: "user-1",
    name: scenario.name,
    created_at: scenario.createdAt.toISOString(),
    updated_at: scenario.updatedAt.toISOString(),
    schema_version: scenario.schemaVersion,
    ...toSupabaseRow(scenario, "user-1"),
  };
  return fromSupabaseRow(row);
}

describe("scenarioPersistence — save/load round trips", () => {
  it("purchase save/load round trip preserves dual snapshots and metrics", () => {
    const created = createScenarioData("Purchase", purchaseInputs(), "user-1");
    const loaded = roundTripViaSupabase(created);

    expect(loaded.inputs.mode).toBe("purchase");
    expect(loaded.originalCalculatorVersion).toBe(CALCULATOR_VERSION);
    expect(loaded.activeCalculatorVersion).toBe(CALCULATOR_VERSION);
    assertWithinTolerance(
      loaded.activeSnapshot.summary.monthlyPaymentPrimary,
      created.activeSnapshot.summary.monthlyPaymentPrimary
    );
    assertWithinTolerance(
      loaded.activeSnapshot.summary.totalInterest,
      created.activeSnapshot.summary.totalInterest
    );
    expect(loaded.originalSnapshot.summary).toEqual(
      loaded.activeSnapshot.summary
    );
    expect(loaded.results.amortizationSchedule.length).toBeGreaterThan(0);
  });

  it("refinance save/load round trip preserves dual snapshots and metrics", () => {
    const created = createScenarioData("Refinance", refinanceInputs(), "user-1");
    const loaded = roundTripViaSupabase(created);

    expect(loaded.inputs.mode).toBe("refinance");
    assertWithinTolerance(
      loaded.activeSnapshot.summary.principalAmount,
      created.activeSnapshot.summary.principalAmount
    );
    assertWithinTolerance(
      loaded.activeSnapshot.summary.financingCostOverHorizon,
      created.activeSnapshot.summary.financingCostOverHorizon
    );
    expect(loaded.originalCalculatorVersion).toBe(
      created.originalCalculatorVersion
    );
  });

  it("HELOC save/load round trip preserves dual snapshots and metrics", () => {
    const created = createScenarioData("HELOC", helocInputs(), "user-1");
    const loaded = roundTripViaSupabase(created);
    const expected = summaryFromUnified(calculateScenario(helocInputs()));

    expect(loaded.inputs.mode).toBe("heloc");
    assertWithinTolerance(
      loaded.activeSnapshot.summary.totalCost,
      expected.totalCost
    );
    assertWithinTolerance(
      loaded.activeSnapshot.summary.monthlyPaymentPrimary,
      expected.monthlyPaymentPrimary
    );
    expect(loaded.activeSnapshot.summary.type).toBe("heloc");
    expect(loaded.results.amortizationSchedule).toEqual([]);
  });

  it("assumption save/load round trip preserves dual snapshots and metrics", () => {
    const created = createScenarioData(
      "Assumption",
      assumptionInputs(),
      "user-1"
    );
    const loaded = roundTripViaSupabase(created);
    const expected = summaryFromUnified(calculateScenario(assumptionInputs()));

    expect(loaded.inputs.mode).toBe("assumption");
    assertWithinTolerance(
      loaded.activeSnapshot.summary.totalInterest,
      expected.totalInterest
    );
    assertWithinTolerance(
      loaded.activeSnapshot.summary.principalAmount,
      expected.principalAmount
    );
    expect(loaded.activeSnapshot.summary.type).toBe("assumption");
  });
});

describe("scenarioPersistence — calculateScenario dispatch (DEF-001)", () => {
  it("HELOC create/update never invokes calculateMortgage", () => {
    const spy = vi.spyOn(mortgage, "calculateMortgage");
    const created = createScenarioData("HELOC", helocInputs(), "user-1");
    updateScenarioInputs(created, {
      ...helocInputs(),
      heloc: { ...helocInputs().heloc!, monthlyDraw: 500 },
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it("assumption create/update never invokes calculateMortgage", () => {
    const spy = vi.spyOn(mortgage, "calculateMortgage");
    const created = createScenarioData(
      "Assumption",
      assumptionInputs(),
      "user-1"
    );
    updateScenarioInputs(created, {
      ...assumptionInputs(),
      assumption: {
        ...assumptionInputs().assumption!,
        assumptionFees: 100,
      },
    });
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("scenarioPersistence — dual-snapshot recalculation (BM-V01)", () => {
  it("recalculation updates activeCalculation only and preserves original", () => {
    const created = createScenarioData("Purchase", purchaseInputs(), "user-1");
    const originalSummary = structuredClone(created.originalSnapshot.summary);
    const originalVersion = created.originalCalculatorVersion;
    const originalCalculatedAt = created.originalSnapshot.calculatedAt;

    // Simulate a prior version on active for an intentional recompute.
    const stale: typeof created = {
      ...created,
      activeCalculatorVersion: "1.0.0",
      calculatorVersion: "1.0.0",
      activeSnapshot: {
        ...created.activeSnapshot,
        calculatorVersion: "1.0.0",
        summary: {
          ...created.activeSnapshot.summary,
          totalInterest: created.activeSnapshot.summary.totalInterest + 999,
        },
      },
    };

    const recalculated = recalculateActiveSnapshot(stale);

    expect(recalculated.originalSnapshot.summary).toEqual(originalSummary);
    expect(recalculated.originalCalculatorVersion).toBe(originalVersion);
    expect(recalculated.originalSnapshot.calculatedAt).toBe(originalCalculatedAt);
    expect(recalculated.activeCalculatorVersion).toBe(CALCULATOR_VERSION);
    expect(recalculated.activeSnapshot.calculatorVersion).toBe(
      CALCULATOR_VERSION
    );
    assertWithinTolerance(
      recalculated.activeSnapshot.summary.totalInterest,
      created.activeSnapshot.summary.totalInterest
    );
    expect(recalculated.activeSnapshot.summary.totalInterest).not.toBe(
      stale.activeSnapshot.summary.totalInterest
    );
  });

  it("lazy hydrate recompute preserves originalSnapshot when version advances", () => {
    const created = createScenarioData("Purchase", purchaseInputs(), "user-1");
    const originalSummary = structuredClone(created.originalSnapshot.summary);

    const hydrated = hydrateScenarioData({
      id: created.id,
      ownerId: "user-1",
      name: created.name,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
      sourceScenarioId: null,
      inputs: created.inputs,
      assumptions: created.assumptions,
      schemaVersion: 2,
      originalSnapshot: {
        ...created.originalSnapshot,
        calculatorVersion: "1.0.0",
      },
      activeSnapshot: {
        ...created.activeSnapshot,
        calculatorVersion: "1.0.0",
        summary: {
          ...created.activeSnapshot.summary,
          totalInterest: 1,
        },
      },
      originalCalculatorVersion: "1.0.0",
      activeCalculatorVersion: "1.0.0",
      lazyRecomputeActive: true,
    });

    expect(hydrated.originalSnapshot.summary).toEqual(originalSummary);
    expect(hydrated.originalCalculatorVersion).toBe("1.0.0");
    expect(hydrated.activeCalculatorVersion).toBe(CALCULATOR_VERSION);
    assertWithinTolerance(
      hydrated.activeSnapshot.summary.totalInterest,
      created.activeSnapshot.summary.totalInterest
    );
  });

  it("calculatorVersion is preserved on create and round trip", () => {
    const created = createScenarioData("Purchase", purchaseInputs(), "user-1");
    expect(created.calculatorVersion).toBe(CALCULATOR_VERSION);
    expect(created.originalCalculatorVersion).toBe(CALCULATOR_VERSION);
    expect(created.activeCalculatorVersion).toBe(CALCULATOR_VERSION);
    expect(created.originalSnapshot.calculatorVersion).toBe(CALCULATOR_VERSION);
    expect(created.activeSnapshot.calculatorVersion).toBe(CALCULATOR_VERSION);

    const loaded = roundTripViaSupabase(created);
    expect(loaded.calculatorVersion).toBe(CALCULATOR_VERSION);
    expect(loaded.originalCalculatorVersion).toBe(CALCULATOR_VERSION);
    expect(loaded.activeCalculatorVersion).toBe(CALCULATOR_VERSION);
  });
});

describe("scenarioPersistence — legacy single-result hydration", () => {
  it("assigns legacy single result to both original and active snapshots", () => {
    const legacy = snapshotsFromLegacyResults(
      {
        loanAmount: 320000,
        monthlyPrincipalInterest: 2275.44,
        monthlyTotal: 2275.44,
        totalInterest: 459160.16,
        totalCost: 779160.16,
        payoffMonths: 360,
        ltvRatio: 0.8,
      },
      "purchase",
      "1.0.0",
      new Date("2024-01-01T00:00:00.000Z")
    );

    expect(legacy.originalSnapshot.summary).toEqual(
      legacy.activeSnapshot.summary
    );
    expect(legacy.originalCalculatorVersion).toBe("1.0.0");
    expect(legacy.activeCalculatorVersion).toBe("1.0.0");
    expect(legacy.originalSnapshot.summary.principalAmount).toBe(320000);
    expect(legacy.originalSnapshot.summary.monthlyPaymentPrimary).toBe(2275.44);

    const hydrated = hydrateScenarioData({
      id: "legacy-1",
      ownerId: null,
      name: "Legacy",
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      updatedAt: new Date("2024-01-01T00:00:00.000Z"),
      sourceScenarioId: null,
      inputs: purchaseInputs(),
      assumptions: {
        amortizationType: "standard",
        pmiRemovalThreshold: 80,
        defaultPmiRate: 0.5,
        assumePrepaymentPenalty: false,
        taxDeductible: false,
        calculatorVersion: "1.0.0",
      },
      results: {
        loanAmount: 320000,
        monthlyPrincipalInterest: 2275.44,
        monthlyTotal: 2275.44,
        totalInterest: 459160.16,
        totalCost: 779160.16,
        payoffMonths: 360,
        ltvRatio: 0.8,
      },
      calculatorVersion: "1.0.0",
      // Keep active at legacy version without silent overwrite of original.
      lazyRecomputeActive: false,
    });

    expect(hydrated.originalSnapshot.summary.principalAmount).toBe(320000);
    expect(hydrated.activeSnapshot.summary.principalAmount).toBe(320000);
    expect(hydrated.originalCalculatorVersion).toBe("1.0.0");
    expect(hydrated.activeCalculatorVersion).toBe("1.0.0");
  });
});

describe("scenarioPersistence — create/update serialization parity", () => {
  it("create and update Supabase input payloads match for all scenario types", () => {
    const cases: { name: string; inputs: MortgageInputs }[] = [
      { name: "Purchase", inputs: purchaseInputs() },
      { name: "Refinance", inputs: refinanceInputs() },
      { name: "HELOC", inputs: helocInputs() },
      { name: "Assumption", inputs: assumptionInputs() },
    ];

    for (const { name, inputs } of cases) {
      const withClient = ensureClientId({
        ...inputs,
        client_id: `test-client-${inputs.mode}`,
      } as MortgageInputs);
      const scenario = createScenarioData(name, withClient, "user-1");
      const createPayload = toSupabaseRow(scenario, "user-1").inputs;
      const updatePayload = serializeInputsForSupabase(withClient);

      expect(createPayload).not.toBe(scenario.inputs);
      expect(createPayload).toEqual(updatePayload);
      expect((createPayload as Record<string, unknown>).mode).toBe(inputs.mode);

      const derived = toSupabaseRow(scenario, "user-1").derived as Record<
        string,
        unknown
      >;
      expect(derived.originalSnapshot).toBeDefined();
      expect(derived.activeSnapshot).toBeDefined();
      expect(derived.originalCalculatorVersion).toBe(CALCULATOR_VERSION);
      expect(derived.activeCalculatorVersion).toBe(CALCULATOR_VERSION);
    }
  });
});
