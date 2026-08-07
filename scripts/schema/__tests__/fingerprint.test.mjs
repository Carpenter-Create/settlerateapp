import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import {
  sha256Hex,
  fingerprintValue,
  fingerprintText,
  fingerprintCatalogObjects,
  fingerprintCatalogContent,
} from "../lib/fingerprint.mjs";
import { normalizeCatalog } from "../lib/normalize.mjs";

describe("sha256Hex / fingerprintText", () => {
  it("matches node:crypto sha256 hex output directly", () => {
    const expected = createHash("sha256").update("hello world", "utf8").digest("hex");
    expect(sha256Hex("hello world")).toBe(expected);
    expect(fingerprintText("hello world")).toBe(expected);
  });

  it("is deterministic across repeated calls", () => {
    expect(sha256Hex("same input")).toBe(sha256Hex("same input"));
  });

  it("produces different hashes for different input", () => {
    expect(sha256Hex("a")).not.toBe(sha256Hex("b"));
  });
});

describe("fingerprintValue", () => {
  it("is stable regardless of object key order", () => {
    const a = { schema: "public", name: "t", columns: [{ name: "id" }] };
    const b = { columns: [{ name: "id" }], name: "t", schema: "public" };
    expect(fingerprintValue(a)).toBe(fingerprintValue(b));
  });

  it("changes when meaningful content changes", () => {
    const a = { schema: "public", name: "t", rlsEnabled: true };
    const b = { schema: "public", name: "t", rlsEnabled: false };
    expect(fingerprintValue(a)).not.toBe(fingerprintValue(b));
  });
});

function emptyCatalog(overrides = {}) {
  return {
    tables: [],
    views: [],
    enums: [],
    functions: [],
    triggers: [],
    constraints: [],
    indexes: [],
    policies: [],
    grants: [],
    extensions: [],
    migrationVersions: [],
    rowCounts: [],
    ...overrides,
  };
}

describe("fingerprintCatalogObjects", () => {
  it("keys tables/functions/policies distinctly by qualified name", () => {
    const catalog = normalizeCatalog(
      emptyCatalog({
        tables: [{ schema: "public", name: "scenarios", columns: [] }],
        functions: [{ schema: "public", name: "has_role", identityArgs: "uuid, app_role" }],
        policies: [{ schema: "public", table: "scenarios", name: "owner_select" }],
      })
    );
    const fps = fingerprintCatalogObjects(catalog);
    expect(Object.keys(fps).sort()).toEqual(
      [
        "table:public.scenarios",
        "function:public.has_role(uuid, app_role)",
        "policy:public.scenarios.owner_select",
      ].sort()
    );
  });

  it("gives two tables with identical content the same fingerprint, and differing content a different one", () => {
    const catalogA = normalizeCatalog(
      emptyCatalog({ tables: [{ schema: "public", name: "t", rlsEnabled: true, columns: [{ name: "id", ordinalPosition: 1 }] }] })
    );
    const catalogB = normalizeCatalog(
      emptyCatalog({ tables: [{ schema: "public", name: "t", rlsEnabled: true, columns: [{ name: "id", ordinalPosition: 1 }] }] })
    );
    const catalogC = normalizeCatalog(
      emptyCatalog({ tables: [{ schema: "public", name: "t", rlsEnabled: false, columns: [{ name: "id", ordinalPosition: 1 }] }] })
    );

    const fpA = fingerprintCatalogObjects(catalogA)["table:public.t"];
    const fpB = fingerprintCatalogObjects(catalogB)["table:public.t"];
    const fpC = fingerprintCatalogObjects(catalogC)["table:public.t"];

    expect(fpA).toBe(fpB);
    expect(fpA).not.toBe(fpC);
  });
});

describe("fingerprintCatalogContent (whole-catalog stability)", () => {
  it("is identical for two captures of the same schema even if capture-order/whitespace differs", () => {
    const captureOne = normalizeCatalog(
      emptyCatalog({
        tables: [
          { schema: "public", name: "b", columns: [{ name: "id", ordinalPosition: 1 }] },
          { schema: "public", name: "a", columns: [{ name: "id", ordinalPosition: 1 }] },
        ],
      })
    );
    const captureTwo = normalizeCatalog(
      emptyCatalog({
        tables: [
          { schema: "public", name: "a", columns: [{ name: "id", ordinalPosition: 1 }] },
          { schema: "public", name: "b", columns: [{ name: "id", ordinalPosition: 1 }] },
        ],
      })
    );

    expect(fingerprintCatalogContent(captureOne)).toBe(fingerprintCatalogContent(captureTwo));
  });

  it("changes when the underlying schema actually changes", () => {
    const before = normalizeCatalog(emptyCatalog({ tables: [{ schema: "public", name: "t", columns: [] }] }));
    const after = normalizeCatalog(
      emptyCatalog({ tables: [{ schema: "public", name: "t", columns: [{ name: "new_col", ordinalPosition: 1 }] }] })
    );
    expect(fingerprintCatalogContent(before)).not.toBe(fingerprintCatalogContent(after));
  });

  it("is unaffected by volatile per-capture metadata (capturedAt/gitSha), since fingerprints are computed from catalog sections only", () => {
    const catalogSections = emptyCatalog({ tables: [{ schema: "public", name: "t", columns: [] }] });
    const captureA = { meta: { capturedAt: "2026-01-01T00:00:00.000Z", gitSha: "aaa" }, ...normalizeCatalog(catalogSections) };
    const captureB = { meta: { capturedAt: "2026-08-07T00:00:00.000Z", gitSha: "bbb" }, ...normalizeCatalog(catalogSections) };
    expect(fingerprintCatalogContent(captureA)).toBe(fingerprintCatalogContent(captureB));
  });
});
