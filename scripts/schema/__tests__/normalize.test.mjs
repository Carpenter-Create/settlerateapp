import { describe, expect, it } from "vitest";
import { canonicalizeKeyOrder, compareByKeys, normalizeCatalog, qualifiedName, sortByKeys, stableStringify } from "../lib/normalize.mjs";

describe("sortByKeys / compareByKeys", () => {
  it("sorts by multiple keys in order, nulls/undefined last", () => {
    const items = [
      { schema: "public", name: "b" },
      { schema: "auth", name: "z" },
      { schema: "public", name: "a" },
      { schema: "public", name: undefined },
    ];
    const sorted = sortByKeys(items, [(i) => i.schema, (i) => i.name]);
    expect(sorted.map((i) => `${i.schema}.${i.name ?? "∅"}`)).toEqual([
      "auth.z",
      "public.a",
      "public.b",
      "public.∅",
    ]);
  });

  it("does not mutate the input array", () => {
    const items = [{ name: "b" }, { name: "a" }];
    const sorted = sortByKeys(items, [(i) => i.name]);
    expect(items.map((i) => i.name)).toEqual(["b", "a"]);
    expect(sorted.map((i) => i.name)).toEqual(["a", "b"]);
  });

  it("compareByKeys is a valid comparator usable directly with Array.sort", () => {
    const cmp = compareByKeys([(i) => i.n]);
    expect([{ n: 3 }, { n: 1 }, { n: 2 }].sort(cmp).map((i) => i.n)).toEqual([1, 2, 3]);
  });
});

describe("canonicalizeKeyOrder / stableStringify", () => {
  it("produces identical output regardless of input key order", () => {
    const a = { b: 1, a: 2, nested: { z: 1, y: 2 } };
    const b = { a: 2, nested: { y: 2, z: 1 }, b: 1 };
    expect(stableStringify(a)).toBe(stableStringify(b));
  });

  it("preserves array element order (arrays are not sorted by canonicalization)", () => {
    const value = { list: [3, 1, 2] };
    expect(canonicalizeKeyOrder(value).list).toEqual([3, 1, 2]);
  });

  it("recurses into arrays of objects, sorting each object's keys", () => {
    const value = [{ b: 1, a: 2 }];
    expect(stableStringify(value)).toBe(stableStringify([{ a: 2, b: 1 }]));
  });
});

describe("normalizeCatalog", () => {
  function makeCatalog(overrides = {}) {
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

  it("sorts tables by schema.name and columns by ordinalPosition, independent of capture order", () => {
    const catalogA = makeCatalog({
      tables: [
        {
          schema: "public",
          name: "b_table",
          columns: [
            { name: "id", ordinalPosition: 1 },
            { name: "name", ordinalPosition: 2 },
          ],
        },
        {
          schema: "public",
          name: "a_table",
          columns: [
            { name: "created_at", ordinalPosition: 2 },
            { name: "id", ordinalPosition: 1 },
          ],
        },
      ],
    });
    const catalogB = makeCatalog({
      tables: [
        {
          schema: "public",
          name: "a_table",
          columns: [
            { name: "id", ordinalPosition: 1 },
            { name: "created_at", ordinalPosition: 2 },
          ],
        },
        {
          schema: "public",
          name: "b_table",
          columns: [
            { name: "name", ordinalPosition: 2 },
            { name: "id", ordinalPosition: 1 },
          ],
        },
      ],
    });

    expect(stableStringify(normalizeCatalog(catalogA))).toBe(stableStringify(normalizeCatalog(catalogB)));
  });

  it("sorts every section deterministically regardless of query result order", () => {
    const catalogA = makeCatalog({
      functions: [
        { schema: "public", name: "z_fn", identityArgs: "" },
        { schema: "public", name: "a_fn", identityArgs: "uuid" },
        { schema: "public", name: "a_fn", identityArgs: "" },
      ],
      policies: [
        { schema: "public", table: "t2", name: "p1" },
        { schema: "public", table: "t1", name: "p2" },
        { schema: "public", table: "t1", name: "p1" },
      ],
      grants: [
        { schema: "public", objectType: "table", objectName: "t", grantee: "authenticated", privilege: "SELECT", isGrantable: false },
        { schema: "public", objectType: "table", objectName: "t", grantee: "anon", privilege: "SELECT", isGrantable: true },
      ],
    });
    const catalogB = makeCatalog({
      functions: [
        { schema: "public", name: "a_fn", identityArgs: "" },
        { schema: "public", name: "a_fn", identityArgs: "uuid" },
        { schema: "public", name: "z_fn", identityArgs: "" },
      ],
      policies: [
        { schema: "public", table: "t1", name: "p1" },
        { schema: "public", table: "t1", name: "p2" },
        { schema: "public", table: "t2", name: "p1" },
      ],
      grants: [
        { schema: "public", objectType: "table", objectName: "t", grantee: "anon", privilege: "SELECT", isGrantable: true },
        { schema: "public", objectType: "table", objectName: "t", grantee: "authenticated", privilege: "SELECT", isGrantable: false },
      ],
    });

    expect(stableStringify(normalizeCatalog(catalogA))).toBe(stableStringify(normalizeCatalog(catalogB)));
  });

  it("does not mutate the input catalog", () => {
    const catalog = makeCatalog({
      tables: [{ schema: "public", name: "b", columns: [] }, { schema: "public", name: "a", columns: [] }],
    });
    const originalOrder = catalog.tables.map((t) => t.name);
    normalizeCatalog(catalog);
    expect(catalog.tables.map((t) => t.name)).toEqual(originalOrder);
  });
});

describe("qualifiedName", () => {
  it("joins schema and name with a dot", () => {
    expect(qualifiedName("public", "scenarios")).toBe("public.scenarios");
  });
});
