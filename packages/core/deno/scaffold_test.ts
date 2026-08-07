/**
 * Deno import-map resolution proof for @settlerate/core root entry.
 * Entitlement domain coverage: entitlement_test.ts / edge_entitlement_shim_test.ts.
 *
 * Run: npm run test:core-deno-scaffold
 */
import { strict as assert } from "node:assert";
import {
  SETTLERATE_CORE_SCAFFOLD_MARKER,
  type SettlerateCoreScaffoldMarker,
} from "@settlerate/core";

Deno.test("@settlerate/core resolves via packages/core/deno.json import map", () => {
  const marker: SettlerateCoreScaffoldMarker = SETTLERATE_CORE_SCAFFOLD_MARKER;
  assert.equal(marker, "epic5-pr1-scaffold");
});
