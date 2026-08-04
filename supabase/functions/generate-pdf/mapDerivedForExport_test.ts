/**
 * Deno tests for the actual generate-pdf derived mapper.
 * Run: npm run test:export-parity-deno
 *
 * Uses the same fixtures as Vitest `exportParity.test.ts`.
 * No remote Deno std imports (CI-friendly / offline).
 */
import { strict as assert } from "node:assert";
import {
  mapDerivedForExport,
  buildScenarioData,
} from "./mapDerivedForExport.ts";

const fixturesDir = new URL(
  "../../../src/lib/__tests__/fixtures/export-parity/",
  import.meta.url
);

async function loadFixture(name: string) {
  const text = await Deno.readTextFile(new URL(`${name}.json`, fixturesDir));
  return JSON.parse(text) as {
    selection: "active" | "original";
    row: { id: string; name?: string; inputs?: unknown; derived: unknown };
    expected: Record<string, unknown>;
  };
}

const FIXTURE_NAMES = [
  "purchase-active",
  "refinance-active",
  "heloc-active",
  "assumption-active",
  "purchase-stale-active",
  "purchase-original",
  "legacy-flat",
] as const;

for (const name of FIXTURE_NAMES) {
  Deno.test(`mapDerivedForExport fixture: ${name}`, async () => {
    const fixture = await loadFixture(name);
    const mapped = mapDerivedForExport(
      fixture.row.derived,
      fixture.selection
    );
    for (const [key, value] of Object.entries(fixture.expected)) {
      assert.deepEqual(
        (mapped as Record<string, unknown>)[key],
        value,
        `${name}.${key}`
      );
    }
    assert.equal(mapped.paymentDrawAvg, null);
    assert.equal(mapped.assumedPaymentPi, null);
    assert.equal(mapped.gapPayment, null);
    assert.equal(mapped.gapAmount, null);
  });
}

Deno.test("buildScenarioData uses mapped summary for purchase-active", async () => {
  const fixture = await loadFixture("purchase-active");
  const data = buildScenarioData(
    {
      id: fixture.row.id,
      name: fixture.row.name,
      inputs: fixture.row.inputs as never,
      derived: fixture.row.derived as never,
    },
    "active"
  );
  assert.equal(
    data.results.financingCostOverHorizon,
    fixture.expected.financingCostOverHorizon
  );
  assert.equal(data.exportCalculatorVersion, "2.0.0");
  assert.equal(data.results.paymentDrawAvg, undefined);
});
