import { describe, expect, it } from "vitest";
import {
  DRIFT_CLASSES,
  INTENTIONAL_LEGACY_MAP,
  compareTables,
  compareFunctions,
  comparePolicies,
  compareEnums,
  compareGrants,
  compareCatalogs,
  compareTypesAgainstCatalog,
  summarizeDriftRecords,
} from "../lib/compareDrift.mjs";

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
    ...overrides,
  };
}

describe("INTENTIONAL_LEGACY_MAP", () => {
  it("is empty by default — intentional_legacy must never be auto-assigned", () => {
    expect(Object.keys(INTENTIONAL_LEGACY_MAP)).toHaveLength(0);
  });
});

describe("compareTables — presence classes", () => {
  it("classifies an object present only in production (A) as repo_missing_production_object", () => {
    const production = [{ schema: "public", name: "subscriptions", rlsEnabled: true, rlsForced: false, columns: [] }];
    const migrationOnly = [];
    const [record] = compareTables(production, migrationOnly, "migration_only");
    expect(record.class).toBe(DRIFT_CLASSES.REPO_MISSING_PRODUCTION_OBJECT);
    expect(record.compareSurface).toBe("migration_only");
    expect(record.mutationRecommendation).toBe("NONE");
  });

  it("classifies an object present only in the reconstruction (B) as production_missing_repo_object", () => {
    const production = [];
    const migrationOnly = [{ schema: "public", name: "only_in_migrations", rlsEnabled: false, rlsForced: false, columns: [] }];
    const [record] = compareTables(production, migrationOnly, "migration_only");
    expect(record.class).toBe(DRIFT_CLASSES.PRODUCTION_MISSING_REPO_OBJECT);
  });

  it("flags public.subscriptions as highPriority regardless of which side it's missing from", () => {
    const [record] = compareTables(
      [{ schema: "public", name: "subscriptions", rlsEnabled: true, rlsForced: false, columns: [] }],
      [],
      "migration_only"
    );
    expect(record.highPriority).toBe(true);
  });

  it("tags harness-mode comparisons distinctly from migration_only-mode comparisons (never conflated)", () => {
    const production = [{ schema: "public", name: "subscriptions", rlsEnabled: true, rlsForced: false, columns: [] }];
    const migrationOnlyMissing = compareTables(production, [], "migration_only")[0];
    const harnessPresent = compareTables(
      production,
      [{ schema: "public", name: "subscriptions", rlsEnabled: true, rlsForced: false, columns: [] }],
      "harness"
    )[0];

    expect(migrationOnlyMissing.compareSurface).toBe("migration_only");
    expect(migrationOnlyMissing.class).toBe(DRIFT_CLASSES.REPO_MISSING_PRODUCTION_OBJECT);
    expect(harnessPresent.compareSurface).toBe("harness");
    expect(harnessPresent.class).toBe(DRIFT_CLASSES.MATCH);
  });
});

describe("compareTables — definition and RLS mismatches", () => {
  it("classifies a column type/nullability difference as definition_mismatch", () => {
    const a = [
      {
        schema: "public",
        name: "profiles",
        rlsEnabled: true,
        rlsForced: false,
        columns: [{ name: "plan_key", dataType: "text", udtName: "text", isNullable: true, ordinalPosition: 1 }],
      },
    ];
    const b = [
      {
        schema: "public",
        name: "profiles",
        rlsEnabled: true,
        rlsForced: false,
        columns: [],
      },
    ];
    const [record] = compareTables(a, b, "migration_only");
    expect(record.class).toBe(DRIFT_CLASSES.DEFINITION_MISMATCH);
    expect(record.details.columnDiffs[0]).toMatchObject({ column: "plan_key", issue: "missing_in_b" });
    expect(record.highPriority).toBe(true); // profiles is high-priority
  });

  it("classifies an RLS enablement difference as policy_rls_mismatch", () => {
    const a = [{ schema: "public", name: "scenarios", rlsEnabled: true, rlsForced: true, columns: [] }];
    const b = [{ schema: "public", name: "scenarios", rlsEnabled: false, rlsForced: false, columns: [] }];
    const [record] = compareTables(a, b, "harness");
    expect(record.class).toBe(DRIFT_CLASSES.POLICY_RLS_MISMATCH);
  });

  it("classifies identical tables as match", () => {
    const table = { schema: "public", name: "scenarios", rlsEnabled: true, rlsForced: false, columns: [{ name: "id", dataType: "uuid", udtName: "uuid", isNullable: false, ordinalPosition: 1 }] };
    const [record] = compareTables([table], [structuredClone(table)], "migration_only");
    expect(record.class).toBe(DRIFT_CLASSES.MATCH);
  });
});

describe("comparePolicies", () => {
  it("classifies differing policy qual/roles as policy_rls_mismatch", () => {
    const a = [{ schema: "public", table: "scenarios", name: "owner_select", cmd: "SELECT", roles: ["authenticated"], permissive: true, qual: "user_id = auth.uid()", withCheck: null }];
    const b = [{ schema: "public", table: "scenarios", name: "owner_select", cmd: "SELECT", roles: ["anon", "authenticated"], permissive: true, qual: "true", withCheck: null }];
    const [record] = comparePolicies(a, b, "migration_only");
    expect(record.class).toBe(DRIFT_CLASSES.POLICY_RLS_MISMATCH);
  });
});

describe("compareFunctions", () => {
  it("classifies a definitionFingerprint mismatch as function_rpc_mismatch", () => {
    const a = [{ schema: "public", name: "has_role", identityArgs: "uuid, app_role", definitionFingerprint: "aaa", returnType: "boolean", securityDefiner: true, volatile: "STABLE" }];
    const b = [{ schema: "public", name: "has_role", identityArgs: "uuid, app_role", definitionFingerprint: "bbb", returnType: "boolean", securityDefiner: true, volatile: "STABLE" }];
    const [record] = compareFunctions(a, b, "migration_only");
    expect(record.class).toBe(DRIFT_CLASSES.FUNCTION_RPC_MISMATCH);
  });

  it("classifies identical function signatures as match", () => {
    const fn = { schema: "public", name: "has_role", identityArgs: "uuid, app_role", definitionFingerprint: "aaa", returnType: "boolean", securityDefiner: true, volatile: "STABLE" };
    const [record] = compareFunctions([fn], [structuredClone(fn)], "harness");
    expect(record.class).toBe(DRIFT_CLASSES.MATCH);
  });

  it("distinguishes overloaded functions by identityArgs", () => {
    const a = [{ schema: "public", name: "feature_allowed", identityArgs: "uuid, text", definitionFingerprint: "x", returnType: "boolean", securityDefiner: false, volatile: "VOLATILE" }];
    const b = [{ schema: "public", name: "feature_allowed", identityArgs: "uuid, text, integer", definitionFingerprint: "x", returnType: "boolean", securityDefiner: false, volatile: "VOLATILE" }];
    const records = compareFunctions(a, b, "migration_only");
    expect(records).toHaveLength(2);
    expect(records.every((r) => r.class === DRIFT_CLASSES.REPO_MISSING_PRODUCTION_OBJECT || r.class === DRIFT_CLASSES.PRODUCTION_MISSING_REPO_OBJECT)).toBe(true);
  });
});

describe("compareEnums", () => {
  it("classifies differing enum values as definition_mismatch", () => {
    const a = [{ schema: "public", name: "app_role", values: ["admin", "user"] }];
    const b = [{ schema: "public", name: "app_role", values: ["admin", "user", "advisor"] }];
    const [record] = compareEnums(a, b, "migration_only");
    expect(record.class).toBe(DRIFT_CLASSES.DEFINITION_MISMATCH);
    expect(record.highPriority).toBe(true); // app_role is high-priority
  });
});

describe("compareGrants — privilege-level + is_grantable", () => {
  it("flags a privilege present only in production (a) as privilege_only_in_a", () => {
    const a = [
      {
        schema: "public",
        objectType: "table",
        objectName: "subscriptions",
        grantee: "authenticated",
        privilege: "SELECT",
        isGrantable: false,
      },
    ];
    const [record] = compareGrants(a, [], "migration_only");
    expect(record.class).toBe(DRIFT_CLASSES.GRANT_MISMATCH);
    expect(record.details.issue).toBe("privilege_only_in_a");
    expect(record.details.grantee).toBe("authenticated");
    expect(record.details.privilege).toBe("SELECT");
    expect(record.details.isGrantable).toBe(false);
  });

  it("flags a privilege present only in reconstruction (b) as privilege_only_in_b", () => {
    const b = [
      {
        schema: "public",
        objectType: "table",
        objectName: "scenarios",
        grantee: "anon",
        privilege: "INSERT",
        isGrantable: false,
      },
    ];
    const [record] = compareGrants([], b, "harness");
    expect(record.class).toBe(DRIFT_CLASSES.GRANT_MISMATCH);
    expect(record.details.issue).toBe("privilege_only_in_b");
    expect(record.details.presentIn).toBe("b");
  });

  it("flags grantable-state mismatch when privilege matches but isGrantable differs", () => {
    const base = {
      schema: "public",
      objectType: "function",
      objectName: "has_role(uuid, app_role)",
      grantee: "authenticated",
      privilege: "EXECUTE",
    };
    const [record] = compareGrants(
      [{ ...base, isGrantable: true }],
      [{ ...base, isGrantable: false }],
      "migration_only"
    );
    expect(record.class).toBe(DRIFT_CLASSES.GRANT_MISMATCH);
    expect(record.details.issue).toBe("grantable_state_mismatch");
    expect(record.details.isGrantable).toEqual({ a: true, b: false });
    expect(record.name).toBe("has_role(uuid, app_role)");
  });

  it("does not emit drift when privilege identity and isGrantable match", () => {
    const g = {
      schema: "public",
      objectType: "table",
      objectName: "profiles",
      grantee: "authenticated",
      privilege: "SELECT",
      isGrantable: false,
    };
    expect(compareGrants([g], [structuredClone(g)], "harness")).toHaveLength(0);
  });

  it("disambiguates overloaded function grants by identity signature in objectName", () => {
    const a = [
      {
        schema: "public",
        objectType: "function",
        objectName: "feature_allowed(uuid, text)",
        grantee: "authenticated",
        privilege: "EXECUTE",
        isGrantable: false,
      },
    ];
    const b = [
      {
        schema: "public",
        objectType: "function",
        objectName: "feature_allowed(uuid, text, integer)",
        grantee: "authenticated",
        privilege: "EXECUTE",
        isGrantable: false,
      },
    ];
    const records = compareGrants(a, b, "migration_only");
    expect(records).toHaveLength(2);
    expect(records.map((r) => r.name).sort()).toEqual([
      "feature_allowed(uuid, text)",
      "feature_allowed(uuid, text, integer)",
    ]);
    expect(records.every((r) => r.class === DRIFT_CLASSES.GRANT_MISMATCH)).toBe(true);
  });

  it("emits grant mismatches in stable sorted order by identity key", () => {
    const onlyA = [
      {
        schema: "public",
        objectType: "table",
        objectName: "zebra",
        grantee: "authenticated",
        privilege: "SELECT",
        isGrantable: false,
      },
      {
        schema: "public",
        objectType: "table",
        objectName: "alpha",
        grantee: "anon",
        privilege: "SELECT",
        isGrantable: false,
      },
      {
        schema: "public",
        objectType: "table",
        objectName: "alpha",
        grantee: "authenticated",
        privilege: "UPDATE",
        isGrantable: false,
      },
    ];
    const records = compareGrants(onlyA, [], "migration_only");
    expect(records.map((r) => `${r.name}|${r.details.grantee}|${r.details.privilege}`)).toEqual([
      "alpha|anon|SELECT",
      "alpha|authenticated|UPDATE",
      "zebra|authenticated|SELECT",
    ]);
  });
});

describe("compareCatalogs", () => {
  it("requires compareSurface to be migration_only or harness (never conflated / never a free-form label)", () => {
    expect(() => compareCatalogs(emptyCatalog(), emptyCatalog(), "production")).toThrow();
    expect(() => compareCatalogs(emptyCatalog(), emptyCatalog(), "migration_only")).not.toThrow();
    expect(() => compareCatalogs(emptyCatalog(), emptyCatalog(), "harness")).not.toThrow();
  });

  it("every record carries mutationRecommendation NONE regardless of class", () => {
    const production = emptyCatalog({
      tables: [{ schema: "public", name: "subscriptions", rlsEnabled: true, rlsForced: false, columns: [] }],
      functions: [{ schema: "public", name: "f", identityArgs: "", definitionFingerprint: "a", returnType: "void", securityDefiner: false, volatile: "VOLATILE" }],
    });
    const migrationOnly = emptyCatalog({
      functions: [{ schema: "public", name: "f", identityArgs: "", definitionFingerprint: "b", returnType: "void", securityDefiner: false, volatile: "VOLATILE" }],
    });
    const records = compareCatalogs(production, migrationOnly, "migration_only");
    expect(records.length).toBeGreaterThan(0);
    expect(records.every((r) => r.mutationRecommendation === "NONE")).toBe(true);
  });
});

describe("compareTypesAgainstCatalog — generated_types_mismatch", () => {
  it("flags a table present in types.ts but absent from the catalog", () => {
    const catalog = emptyCatalog({ tables: [] });
    const parsedTypes = { tables: { subscriptions: { columns: [{ name: "id" }] } }, views: {}, functions: {}, enums: {} };
    const [record] = compareTypesAgainstCatalog(catalog, parsedTypes, "migration_only");
    expect(record.class).toBe(DRIFT_CLASSES.GENERATED_TYPES_MISMATCH);
    expect(record.details.issue).toBe("in_types_not_in_catalog");
    expect(record.highPriority).toBe(true);
  });

  it("flags a table present in the catalog but absent from types.ts", () => {
    const catalog = emptyCatalog({ tables: [{ schema: "public", name: "admin_bootstrap_tokens", rlsEnabled: true, rlsForced: false, columns: [] }] });
    const parsedTypes = { tables: {}, views: {}, functions: {}, enums: {} };
    const [record] = compareTypesAgainstCatalog(catalog, parsedTypes, "production");
    expect(record.class).toBe(DRIFT_CLASSES.GENERATED_TYPES_MISMATCH);
    expect(record.details.issue).toBe("in_catalog_not_in_types");
  });

  it("flags a column-set mismatch between types.ts and the catalog (e.g. profiles)", () => {
    const catalog = emptyCatalog({
      tables: [
        {
          schema: "public",
          name: "profiles",
          rlsEnabled: true,
          rlsForced: false,
          columns: [
            { name: "id" },
            { name: "full_name" },
            { name: "created_at" },
          ],
        },
      ],
    });
    const parsedTypes = {
      tables: {
        profiles: {
          columns: [
            { name: "id" },
            { name: "full_name" },
            { name: "created_at" },
            { name: "plan_key" },
            { name: "plan_status" },
            { name: "stripe_customer_id" },
          ],
        },
      },
      views: {},
      functions: {},
      enums: {},
    };
    const [record] = compareTypesAgainstCatalog(catalog, parsedTypes, "migration_only");
    expect(record.class).toBe(DRIFT_CLASSES.GENERATED_TYPES_MISMATCH);
    expect(record.details.issue).toBe("column_set_mismatch");
    expect(record.details.onlyInTypes.sort()).toEqual(["plan_key", "plan_status", "stripe_customer_id"]);
    expect(record.highPriority).toBe(true);
  });

  it("does not flag a table with identical column sets", () => {
    const catalog = emptyCatalog({
      tables: [{ schema: "public", name: "scenarios", rlsEnabled: true, rlsForced: false, columns: [{ name: "id" }] }],
    });
    const parsedTypes = { tables: { scenarios: { columns: [{ name: "id" }] } }, views: {}, functions: {}, enums: {} };
    const records = compareTypesAgainstCatalog(catalog, parsedTypes, "production");
    expect(records).toHaveLength(0);
  });
});

describe("unresolved drift defaults to unknown_founder_decision", () => {
  it("a mismatch classification helper never falls back to intentional_legacy without an explicit map entry", () => {
    // Definition mismatches, RLS mismatches, etc. above all resolved to a
    // *specific* class (definition_mismatch, policy_rls_mismatch, ...), never
    // intentional_legacy, because INTENTIONAL_LEGACY_MAP is empty. This test
    // guards against a future accidental default assignment.
    const a = [{ schema: "public", name: "t", rlsEnabled: true, rlsForced: false, columns: [] }];
    const b = [{ schema: "public", name: "t", rlsEnabled: false, rlsForced: false, columns: [] }];
    const [record] = compareTables(a, b, "migration_only");
    expect(record.class).not.toBe(DRIFT_CLASSES.INTENTIONAL_LEGACY);
  });
});

describe("summarizeDriftRecords", () => {
  it("counts by class and by surface, and counts only non-match high-priority records", () => {
    const records = [
      { class: DRIFT_CLASSES.MATCH, compareSurface: "migration_only", highPriority: true },
      { class: DRIFT_CLASSES.DEFINITION_MISMATCH, compareSurface: "migration_only", highPriority: true },
      { class: DRIFT_CLASSES.REPO_MISSING_PRODUCTION_OBJECT, compareSurface: "harness", highPriority: false },
    ];
    const summary = summarizeDriftRecords(records);
    expect(summary.totalRecords).toBe(3);
    expect(summary.byClass[DRIFT_CLASSES.MATCH]).toBe(1);
    expect(summary.byClass[DRIFT_CLASSES.DEFINITION_MISMATCH]).toBe(1);
    expect(summary.bySurface.migration_only).toBe(2);
    expect(summary.bySurface.harness).toBe(1);
    expect(summary.highPriorityNonMatchCount).toBe(1);
  });
});
