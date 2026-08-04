import { describe, it, expect, vi, afterEach } from "vitest";
import * as mortgage from "@/lib/mortgage";
import type { MortgageInputs } from "@/lib/mortgage";
import { DEFAULT_HELOC_INPUTS } from "@/lib/heloc";
import { DEFAULT_ASSUMPTION_INPUTS } from "@/lib/assumption";
import {
  createScenarioData,
  getScenarioRecalculationState,
  recalculateActiveSnapshot,
  updateScenarioInputs,
  CALCULATOR_VERSION,
  LATEST_SCHEMA_VERSION,
} from "@/lib/scenarioContract";
import {
  hasCompleteDualSnapshotContract,
  hydrateScenarioData,
  snapshotsFromLegacyResults,
  summaryFromUnified,
} from "@/lib/scenarioPersistence";
import { calculateScenario } from "@/lib/scenarioCalculator";
import * as heloc from "@/lib/heloc";
import * as assumption from "@/lib/assumption";
import {
  ensureClientId,
  fromSupabaseRow,
  materializeDuplicatedScenario,
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

function makeStaleScenario() {
  const created = createScenarioData("Purchase", purchaseInputs(), "user-1");
  const staleActive = {
    calculatorVersion: "1.0.0",
    calculatedAt: "2024-01-01T00:00:00.000Z",
    summary: {
      ...created.activeSnapshot.summary,
      totalInterest: 1,
    },
  };
  const staleOriginal = {
    ...created.originalSnapshot,
    calculatorVersion: "1.0.0",
    calculatedAt: "2024-01-01T00:00:00.000Z",
  };
  return {
    created,
    stale: {
      ...created,
      activeCalculatorVersion: "1.0.0",
      originalCalculatorVersion: "1.0.0",
      calculatorVersion: "1.0.0",
      originalSnapshot: staleOriginal,
      activeSnapshot: staleActive,
    },
    staleOriginal,
    staleActive,
  };
}

describe("scenarioPersistence — dual-snapshot recalculation (BM-V01)", () => {
  it("opening a stale-version scenario does not alter either persisted snapshot", () => {
    const { stale, staleOriginal, staleActive } = makeStaleScenario();
    const originalJson = JSON.stringify(staleOriginal);
    const activeJson = JSON.stringify(staleActive);

    const hydrated = hydrateScenarioData({
      id: stale.id,
      ownerId: "user-1",
      name: stale.name,
      createdAt: stale.createdAt,
      updatedAt: stale.updatedAt,
      sourceScenarioId: null,
      inputs: stale.inputs,
      assumptions: stale.assumptions,
      schemaVersion: 2,
      originalSnapshot: stale.originalSnapshot,
      activeSnapshot: stale.activeSnapshot,
      originalCalculatorVersion: "1.0.0",
      activeCalculatorVersion: "1.0.0",
    });

    expect(JSON.stringify(hydrated.originalSnapshot)).toBe(originalJson);
    expect(JSON.stringify(hydrated.activeSnapshot)).toBe(activeJson);
    expect(hydrated.activeCalculatorVersion).toBe("1.0.0");
    expect(hydrated.activeSnapshot.summary.totalInterest).toBe(1);
  });

  it("a stale-version scenario reports recalculation availability", () => {
    const { stale, created } = makeStaleScenario();
    const staleState = getScenarioRecalculationState(stale);
    expect(staleState.recalculationAvailable).toBe(true);
    expect(staleState.activeCalculatorVersion).toBe("1.0.0");
    expect(staleState.currentCalculatorVersion).toBe(CALCULATOR_VERSION);

    const freshState = getScenarioRecalculationState(created);
    expect(freshState.recalculationAvailable).toBe(false);
  });

  it("explicit recalculation updates activeSnapshot and leaves original byte-for-byte unchanged", () => {
    const { created, stale } = makeStaleScenario();
    const originalJson = JSON.stringify(stale.originalSnapshot);

    const recalculated = recalculateActiveSnapshot(stale);

    expect(JSON.stringify(recalculated.originalSnapshot)).toBe(originalJson);
    expect(recalculated.originalCalculatorVersion).toBe("1.0.0");
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
    expect(getScenarioRecalculationState(recalculated).recalculationAvailable).toBe(
      false
    );
  });

  it("explicit recalculation persists activeSnapshot through the update path and reloads", () => {
    const { created, stale } = makeStaleScenario();
    const recalculated = recalculateActiveSnapshot(stale);
    const persistedRow = {
      id: recalculated.id,
      user_id: "user-1",
      name: recalculated.name,
      created_at: recalculated.createdAt.toISOString(),
      updated_at: recalculated.updatedAt.toISOString(),
      schema_version: recalculated.schemaVersion,
      ...toSupabaseRow(recalculated, "user-1"),
    };

    const derived = persistedRow.derived as {
      activeSnapshot: { summary: { totalInterest: number } };
      originalSnapshot: unknown;
      activeCalculatorVersion: string;
      originalCalculatorVersion: string;
      calculatorVersion: string;
    };
    expect(derived.activeCalculatorVersion).toBe(CALCULATOR_VERSION);
    expect(derived.calculatorVersion).toBe(CALCULATOR_VERSION);
    expect(derived.originalCalculatorVersion).toBe("1.0.0");
    expect(JSON.stringify(derived.originalSnapshot)).toBe(
      JSON.stringify(stale.originalSnapshot)
    );
    assertWithinTolerance(
      derived.activeSnapshot.summary.totalInterest,
      created.activeSnapshot.summary.totalInterest
    );

    const reloaded = fromSupabaseRow(persistedRow);
    expect(reloaded.activeCalculatorVersion).toBe(CALCULATOR_VERSION);
    assertWithinTolerance(
      reloaded.activeSnapshot.summary.totalInterest,
      created.activeSnapshot.summary.totalInterest
    );
    expect(JSON.stringify(reloaded.originalSnapshot)).toBe(
      JSON.stringify(stale.originalSnapshot)
    );
    expect(getScenarioRecalculationState(reloaded).recalculationAvailable).toBe(
      false
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

describe("scenarioPersistence — duplicate schema v2 materialization", () => {
  it("duplicate scenario is immediately valid under schema version 2", () => {
    const source = createScenarioData("Purchase", purchaseInputs(), "user-1");
    const duplicate = materializeDuplicatedScenario(source, {
      id: "00000000-0000-4000-8000-000000000099",
      name: "Purchase (Copy)",
      ownerId: "user-1",
      createdAt: new Date("2026-08-03T12:00:00.000Z"),
      updatedAt: new Date("2026-08-03T12:00:00.000Z"),
    });

    expect(duplicate.schemaVersion).toBe(LATEST_SCHEMA_VERSION);
    expect(duplicate.id).toBe("00000000-0000-4000-8000-000000000099");
    expect(duplicate.sourceScenarioId).toBe(source.id);
    expect(hasCompleteDualSnapshotContract(duplicate)).toBe(true);

    const row = toSupabaseRow(duplicate, "user-1");
    expect(row.schema_version).toBe(2);
    const derived = row.derived as Record<string, unknown>;
    expect(derived.originalSnapshot).toBeDefined();
    expect(derived.activeSnapshot).toBeDefined();
    expect(derived.originalCalculatorVersion).toBe(CALCULATOR_VERSION);
    expect(derived.activeCalculatorVersion).toBe(CALCULATOR_VERSION);
    expect(derived.calculatorVersion).toBe(CALCULATOR_VERSION);

    const reloaded = fromSupabaseRow({
      id: duplicate.id,
      user_id: "user-1",
      name: duplicate.name,
      created_at: duplicate.createdAt.toISOString(),
      updated_at: duplicate.updatedAt.toISOString(),
      schema_version: row.schema_version,
      inputs: row.inputs,
      derived: row.derived,
    });
    expect(hasCompleteDualSnapshotContract(reloaded)).toBe(true);
  });
});

describe("scenarioPersistence — calculator dispatch by mode", () => {
  it("routes each scenario type only through its correct calculator", () => {
    const mortgageSpy = vi.spyOn(mortgage, "calculateMortgage");
    const helocSpy = vi.spyOn(heloc, "calculateHeloc");
    const assumptionSpy = vi.spyOn(assumption, "calculateAssumption");

    createScenarioData("Purchase", purchaseInputs(), "user-1");
    expect(mortgageSpy).toHaveBeenCalled();
    expect(helocSpy).not.toHaveBeenCalled();
    expect(assumptionSpy).not.toHaveBeenCalled();
    mortgageSpy.mockClear();
    helocSpy.mockClear();
    assumptionSpy.mockClear();

    createScenarioData("Refinance", refinanceInputs(), "user-1");
    expect(mortgageSpy).toHaveBeenCalled();
    expect(helocSpy).not.toHaveBeenCalled();
    expect(assumptionSpy).not.toHaveBeenCalled();
    mortgageSpy.mockClear();
    helocSpy.mockClear();
    assumptionSpy.mockClear();

    createScenarioData("HELOC", helocInputs(), "user-1");
    expect(helocSpy).toHaveBeenCalled();
    expect(mortgageSpy).not.toHaveBeenCalled();
    expect(assumptionSpy).not.toHaveBeenCalled();
    mortgageSpy.mockClear();
    helocSpy.mockClear();
    assumptionSpy.mockClear();

    createScenarioData("Assumption", assumptionInputs(), "user-1");
    expect(assumptionSpy).toHaveBeenCalled();
    expect(mortgageSpy).not.toHaveBeenCalled();
    expect(helocSpy).not.toHaveBeenCalled();
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
    });

    expect(hydrated.originalSnapshot.summary.principalAmount).toBe(320000);
    expect(hydrated.activeSnapshot.summary.principalAmount).toBe(320000);
    expect(hydrated.originalCalculatorVersion).toBe("1.0.0");
    expect(hydrated.activeCalculatorVersion).toBe("1.0.0");
    expect(getScenarioRecalculationState(hydrated).recalculationAvailable).toBe(
      true
    );
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
