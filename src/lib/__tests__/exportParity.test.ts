/**
 * Phase 4 / Epic 5 PR 5 — derived mapper source-of-truth parity (BM-X01).
 *
 * Exercises:
 * - core: `mapDerivedExportSummary` (@settlerate/core/export-summary)
 * - client: `exportSummaryFromDerivedJson` (src/lib/exports/exportContract.ts)
 * - server: `mapDerivedForExport` (supabase/functions/generate-pdf/mapDerivedForExport.ts)
 *
 * against the same Phase 3 derived JSON fixtures. Client-only mapper tests do
 * NOT prove Deno generate-pdf parity.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mapDerivedExportSummary } from "@settlerate/core/export-summary";
import { exportSummaryFromDerivedJson } from "@/lib/exports/exportContract";
import {
  mapDerivedForExport,
  buildScenarioData,
} from "../../../supabase/functions/generate-pdf/mapDerivedForExport.ts";

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures/export-parity"
);

interface ParityFixture {
  name: string;
  selection: "active" | "original";
  mode: string;
  row: {
    id: string;
    name?: string;
    inputs?: Record<string, unknown>;
    derived: unknown;
  };
  expected: Record<string, unknown>;
}

function loadFixtures(): ParityFixture[] {
  return readdirSync(fixturesDir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => {
      const raw = readFileSync(path.join(fixturesDir, f), "utf8");
      return JSON.parse(raw) as ParityFixture;
    });
}

const CLIENT_KEYS = [
  "financingCostOverHorizon",
  "principalReductionOverHorizon",
  "allInMonthlyHousingPayment",
  "decisionHorizonMonths",
  "totalInterest",
  "legacyTotalCost",
  "monthlyPaymentPrimary",
  "principalAmount",
  "ltvRatio",
  "rateForComparison",
  "payoffMonths",
  "calculatorVersion",
  "activeCalculatorVersion",
  "originalCalculatorVersion",
  "isLegacyFlat",
  "snapshotSource",
  "paymentDrawAvg",
  "paymentRepay",
  "assumedPaymentPi",
  "gapPayment",
  "gapAmount",
] as const;

const SHARED_KEYS = [
  "financingCostOverHorizon",
  "principalReductionOverHorizon",
  "allInMonthlyHousingPayment",
  "decisionHorizonMonths",
  "totalInterest",
  "legacyTotalCost",
  "monthlyPaymentPrimary",
  "principalAmount",
  "ltvRatio",
  "rateForComparison",
  "payoffMonths",
  "calculatorVersion",
  "activeCalculatorVersion",
  "originalCalculatorVersion",
  "isLegacyFlat",
  "paymentDrawAvg",
  "assumedPaymentPi",
  "gapPayment",
  "gapAmount",
] as const;

const SERVER_ONLY_KEYS = [
  "monthlyTotal",
  "monthlyPropertyTax",
  "monthlyHomeInsurance",
  "monthlyPMI",
  "monthlyHOA",
] as const;

function pick(summary: Record<string, unknown>, keys: readonly string[]) {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (key in summary) out[key] = summary[key];
  }
  return out;
}

describe("exportParity — core / client / server derived mappers", () => {
  const fixtures = loadFixtures();

  it("loads the expected parity fixture set", () => {
    const names = fixtures.map((f) => f.name).sort();
    expect(names).toEqual(
      [
        "assumption-active",
        "heloc-active",
        "legacy-flat",
        "purchase-active",
        "purchase-original",
        "purchase-stale-active",
        "refinance-active",
      ].sort()
    );
  });

  for (const fixture of fixtures) {
    it(`${fixture.name}: core, client, and server match fixture expected`, () => {
      const core = mapDerivedExportSummary(fixture.row.derived, fixture.selection);
      const client = exportSummaryFromDerivedJson(
        fixture.row.derived,
        fixture.selection
      );
      const server = mapDerivedForExport(
        fixture.row.derived,
        fixture.selection
      );

      for (const [key, value] of Object.entries(fixture.expected)) {
        expect(core[key as keyof typeof core], `core.${key}`).toEqual(value);
        expect(client[key as keyof typeof client], `client.${key}`).toEqual(value);
        expect(server[key as keyof typeof server], `server.${key}`).toEqual(value);
      }

      expect(pick(client as unknown as Record<string, unknown>, SHARED_KEYS)).toEqual(
        pick(server as unknown as Record<string, unknown>, SHARED_KEYS)
      );
      expect(pick(core as unknown as Record<string, unknown>, SHARED_KEYS)).toEqual(
        pick(server as unknown as Record<string, unknown>, SHARED_KEYS)
      );

      expect(client.paymentDrawAvg).toBeNull();
      expect(server.paymentDrawAvg).toBeNull();
      expect(client.assumedPaymentPi).toBeNull();
      expect(server.assumedPaymentPi).toBeNull();
      expect(client.gapPayment).toBeNull();
      expect(server.gapPayment).toBeNull();
      expect(client.gapAmount).toBeNull();
      expect(server.gapAmount).toBeNull();
    });
  }

  it("client public result does not expand to server-only escrow keys", () => {
    const fixture = fixtures.find((f) => f.name === "purchase-active")!;
    const client = exportSummaryFromDerivedJson(fixture.row.derived, "active");
    const clientKeys = Object.keys(client).sort();
    expect(clientKeys).toEqual([...CLIENT_KEYS].sort());
    for (const key of SERVER_ONLY_KEYS) {
      expect(clientKeys, key).not.toContain(key);
    }
  });

  it("server interestRateFallback overrides missing rateForComparison", () => {
    const derived = {
      activeSnapshot: {
        summary: { financingCostOverHorizon: 1, totalInterest: 1 },
      },
    };
    expect(mapDerivedForExport(derived, "active").rateForComparison).toBe(0);
    expect(
      mapDerivedForExport(derived, "active", { interestRateFallback: 5.5 })
        .rateForComparison
    ).toBe(5.5);
    expect(
      mapDerivedExportSummary(derived, "active", {
        rateForComparisonFallback: 5.5,
      }).rateForComparison
    ).toBe(5.5);
  });

  it("buildScenarioData (server PDF entry) uses mapDerivedForExport for purchase-active", () => {
    const fixture = fixtures.find((f) => f.name === "purchase-active")!;
    const data = buildScenarioData(
      {
        id: fixture.row.id,
        name: fixture.row.name,
        inputs: fixture.row.inputs as never,
        derived: fixture.row.derived as never,
      },
      "active"
    );

    expect(data.results.financingCostOverHorizon).toBe(
      fixture.expected.financingCostOverHorizon
    );
    expect(data.results.principalReductionOverHorizon).toBe(
      fixture.expected.principalReductionOverHorizon
    );
    expect(data.exportCalculatorVersion).toBe("2.0.0");
    expect(data.snapshotSource).toBe("active");
    expect(data.results.paymentDrawAvg).toBeUndefined();
  });

  it("buildScenarioData HELOC does not invent paymentDrawAvg; LTV stays omitted as 0 from null", () => {
    const fixture = fixtures.find((f) => f.name === "heloc-active")!;
    const data = buildScenarioData(
      {
        id: fixture.row.id,
        name: fixture.row.name,
        inputs: fixture.row.inputs as never,
        derived: fixture.row.derived as never,
      },
      "active"
    );

    expect(data.results.paymentDrawAvg).toBeUndefined();
    expect(data.results.assumedPaymentPi).toBeUndefined();
    expect(data.results.financingCostOverHorizon).toBe(
      fixture.expected.financingCostOverHorizon
    );
    expect(data.results.ltvRatio).toBe(0);
    expect(mapDerivedForExport(fixture.row.derived, "active").ltvRatio).toBeNull();
  });

  it("stale active vs original selection does not recalculate", () => {
    const stale = fixtures.find((f) => f.name === "purchase-stale-active")!;
    const original = fixtures.find((f) => f.name === "purchase-original")!;

    const staleServer = mapDerivedForExport(stale.row.derived, "active");
    const originalServer = mapDerivedForExport(original.row.derived, "original");

    expect(staleServer.totalInterest).toBe(1);
    expect(originalServer.totalInterest).toBe(459160.16);
    expect(staleServer.calculatorVersion).toBe("1.0.0");
    expect(originalServer.calculatorVersion).toBe("2.0.0");
  });
});
