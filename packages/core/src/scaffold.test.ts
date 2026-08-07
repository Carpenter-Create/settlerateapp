/**
 * Node/Vitest resolution proof for @settlerate/core root entry.
 * Entitlement behavioral tests live under src/entitlement/.
 */
import { describe, expect, it } from "vitest";
import {
  SETTLERATE_CORE_SCAFFOLD_MARKER,
  type SettlerateCoreScaffoldMarker,
} from "@settlerate/core";

describe("@settlerate/core scaffold", () => {
  it("resolves the package root export and scaffold marker", () => {
    const marker: SettlerateCoreScaffoldMarker = SETTLERATE_CORE_SCAFFOLD_MARKER;
    expect(marker).toBe("epic5-pr1-scaffold");
  });
});
