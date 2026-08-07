/**
 * Deno import-map resolution proof for @settlerate/core/export-summary.
 *
 * Run: npm run test:core-deno-scaffold
 */
import { strict as assert } from "node:assert";
import { mapDerivedExportSummary } from "@settlerate/core/export-summary";

Deno.test("@settlerate/core/export-summary resolves and maps derived JSON", () => {
  const mapped = mapDerivedExportSummary(
    {
      activeSnapshot: {
        calculatorVersion: "2.0.0",
        summary: {
          financingCostOverHorizon: 42,
          totalInterest: 42,
          ltvRatio: null,
        },
      },
    },
    "active"
  );
  assert.equal(mapped.financingCostOverHorizon, 42);
  assert.equal(mapped.ltvRatio, null);
  assert.equal(mapped.rateForComparison, 0);
  assert.equal(mapped.monthlyPropertyTax, null);
});

Deno.test("export-summary honors rateForComparisonFallback", () => {
  const mapped = mapDerivedExportSummary(
    { activeSnapshot: { summary: {} } },
    "active",
    { rateForComparisonFallback: 4.1 }
  );
  assert.equal(mapped.rateForComparison, 4.1);
});
