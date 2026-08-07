/**
 * Drift classification per ADR 0006 §2-3. Compares two or more schema
 * surfaces and emits one record per differing (or notably matching) object,
 * each tagged with exactly one classification class.
 *
 * Comparison surfaces (ADR 0006 §2):
 *   A = production          (read-only capture; live reality)
 *   B = migration_only       (TRUE migration-only reconstruction; the
 *                             "git can rebuild an equivalent catalog" proof)
 *   D-ish = harness          (TEST-HARNESS reconstruction: migration_only
 *                             PLUS supabase/tests/00_auth_stub.sql, which
 *                             intentionally adds objects — e.g.
 *                             `public.subscriptions` — that exist ONLY to
 *                             make CI's ephemeral Postgres runnable, not
 *                             because a migration created them)
 *   C = generated types.ts  (derived; never authoritative)
 *
 * This module never decides "production wins" or "migrations win" (ADR
 * 0006 §3) — every mismatch gets a class and, by default,
 * `unknown_founder_decision` unless explicitly mapped otherwise.
 * `intentional_legacy` is NEVER auto-assigned; it may only come from an
 * explicit, hand-maintained map the caller supplies (default: empty).
 */
import { qualifiedName } from "./normalize.mjs";
import { getConsumerEntry, isHighPriorityObject } from "./consumers.mjs";

export const DRIFT_CLASSES = Object.freeze({
  REPO_MISSING_PRODUCTION_OBJECT: "repo_missing_production_object",
  PRODUCTION_MISSING_REPO_OBJECT: "production_missing_repo_object",
  DEFINITION_MISMATCH: "definition_mismatch",
  POLICY_RLS_MISMATCH: "policy_rls_mismatch",
  GRANT_MISMATCH: "grant_mismatch",
  FUNCTION_RPC_MISMATCH: "function_rpc_mismatch",
  CONSTRAINT_INDEX_MISMATCH: "constraint_index_mismatch",
  GENERATED_TYPES_MISMATCH: "generated_types_mismatch",
  INTENTIONAL_LEGACY: "intentional_legacy",
  UNKNOWN_FOUNDER_DECISION: "unknown_founder_decision",
  MATCH: "match",
});

// Never populated automatically — see module docstring. Callers may pass an
// explicit override map of `${kind}:${schema}.${name}` -> reason string for
// objects the founder has already classified under ADR 0007. Empty by
// default because no object has an accepted ADR 0007 disposition yet.
export const INTENTIONAL_LEGACY_MAP = Object.freeze({});

function indexByQualifiedName(list, nameKey = "name") {
  const map = new Map();
  for (const item of list ?? []) {
    map.set(qualifiedName(item.schema, item[nameKey]), item);
  }
  return map;
}

function indexTableScoped(list) {
  const map = new Map();
  for (const item of list ?? []) {
    map.set(`${item.schema}.${item.table}.${item.name}`, item);
  }
  return map;
}

function indexFunctions(list) {
  const map = new Map();
  for (const fn of list ?? []) {
    map.set(`${fn.schema}.${fn.name}(${fn.identityArgs ?? ""})`, fn);
  }
  return map;
}

function classify({ kind, schema, name, inA, inB, extra = {} }) {
  const overrideKey = `${kind}:${schema}.${name}`;
  if (INTENTIONAL_LEGACY_MAP[overrideKey]) {
    return {
      driftClass: DRIFT_CLASSES.INTENTIONAL_LEGACY,
      reason: INTENTIONAL_LEGACY_MAP[overrideKey],
      ...extra,
    };
  }
  if (inA && !inB) {
    return { driftClass: DRIFT_CLASSES.REPO_MISSING_PRODUCTION_OBJECT, ...extra };
  }
  if (!inA && inB) {
    return { driftClass: DRIFT_CLASSES.PRODUCTION_MISSING_REPO_OBJECT, ...extra };
  }
  return null; // present in both; caller decides mismatch vs match
}

function buildRecord({ objectType, schema, name, compareSurface, driftClass, details, reason }) {
  const consumer = getConsumerEntry(objectType, schema, name);
  return {
    objectType,
    schema,
    name,
    compareSurface,
    class: driftClass,
    details: details ?? null,
    reason: reason ?? null,
    highPriority: isHighPriorityObject(name),
    consumers: consumer?.consumers ?? [],
    consumerNotes: consumer?.notes ?? null,
    mutationRecommendation: "NONE",
  };
}

function arraysEqualAsSets(a, b) {
  const sa = new Set(a ?? []);
  const sb = new Set(b ?? []);
  if (sa.size !== sb.size) return false;
  for (const v of sa) if (!sb.has(v)) return false;
  return true;
}

function compareColumnSets(columnsA, columnsB) {
  const byNameA = new Map((columnsA ?? []).map((c) => [c.name, c]));
  const byNameB = new Map((columnsB ?? []).map((c) => [c.name, c]));
  const allNames = new Set([...byNameA.keys(), ...byNameB.keys()]);
  const diffs = [];
  for (const name of allNames) {
    const a = byNameA.get(name);
    const b = byNameB.get(name);
    if (!a) {
      diffs.push({ column: name, issue: "missing_in_a" });
      continue;
    }
    if (!b) {
      diffs.push({ column: name, issue: "missing_in_b" });
      continue;
    }
    if (a.dataType !== b.dataType || a.udtName !== b.udtName) {
      diffs.push({ column: name, issue: "type_mismatch", a: a.dataType, b: b.dataType });
    } else if (a.isNullable !== b.isNullable) {
      diffs.push({ column: name, issue: "nullability_mismatch", a: a.isNullable, b: b.isNullable });
    }
  }
  return diffs;
}

/**
 * Compare tables between surface A (e.g. production) and surface B (e.g.
 * migration_only or harness reconstruction). `compareSurface` labels which
 * repo reconstruction B represents, so records are never ambiguous between
 * TRUE migration-only evidence and TEST-HARNESS evidence.
 */
export function compareTables(tablesA, tablesB, compareSurface) {
  const byA = indexByQualifiedName(tablesA);
  const byB = indexByQualifiedName(tablesB);
  const allKeys = new Set([...byA.keys(), ...byB.keys()]);
  const records = [];

  for (const key of allKeys) {
    const [schema, name] = splitQualified(key);
    const a = byA.get(key);
    const b = byB.get(key);

    const presence = classify({ kind: "table", schema, name, inA: Boolean(a), inB: Boolean(b) });
    if (presence) {
      records.push(buildRecord({ objectType: "table", schema, name, compareSurface, ...presence }));
      continue;
    }

    const columnDiffs = compareColumnSets(a.columns, b.columns);
    const rlsMismatch = a.rlsEnabled !== b.rlsEnabled || a.rlsForced !== b.rlsForced;

    if (rlsMismatch) {
      records.push(
        buildRecord({
          objectType: "table",
          schema,
          name,
          compareSurface,
          driftClass: DRIFT_CLASSES.POLICY_RLS_MISMATCH,
          details: {
            rlsEnabled: { a: a.rlsEnabled, b: b.rlsEnabled },
            rlsForced: { a: a.rlsForced, b: b.rlsForced },
          },
        })
      );
    }
    if (columnDiffs.length > 0) {
      records.push(
        buildRecord({
          objectType: "table",
          schema,
          name,
          compareSurface,
          driftClass: DRIFT_CLASSES.DEFINITION_MISMATCH,
          details: { columnDiffs },
        })
      );
    }
    if (!rlsMismatch && columnDiffs.length === 0) {
      records.push(
        buildRecord({
          objectType: "table",
          schema,
          name,
          compareSurface,
          driftClass: DRIFT_CLASSES.MATCH,
        })
      );
    }
  }

  return records;
}

export function comparePolicies(policiesA, policiesB, compareSurface) {
  const byA = indexTableScoped(policiesA);
  const byB = indexTableScoped(policiesB);
  const allKeys = new Set([...byA.keys(), ...byB.keys()]);
  const records = [];

  for (const key of allKeys) {
    const [schema, table, name] = key.split(".");
    const a = byA.get(key);
    const b = byB.get(key);
    const presence = classify({ kind: "policy", schema, name: `${table}.${name}`, inA: Boolean(a), inB: Boolean(b) });
    if (presence) {
      records.push(
        buildRecord({ objectType: "policy", schema, name: `${table}.${name}`, compareSurface, ...presence })
      );
      continue;
    }
    const mismatch =
      a.cmd !== b.cmd ||
      a.permissive !== b.permissive ||
      a.qual !== b.qual ||
      a.withCheck !== b.withCheck ||
      !arraysEqualAsSets(a.roles, b.roles);
    records.push(
      buildRecord({
        objectType: "policy",
        schema,
        name: `${table}.${name}`,
        compareSurface,
        driftClass: mismatch ? DRIFT_CLASSES.POLICY_RLS_MISMATCH : DRIFT_CLASSES.MATCH,
        details: mismatch ? { a, b } : null,
      })
    );
  }
  return records;
}

/**
 * Privilege-level grant comparison (ADR 0006). Identity key is:
 *   schema + objectType + objectName + grantee + privilege
 * For functions, `objectName` must include identity/signature (e.g.
 * `has_role(uuid, app_role)`) so overloads disambiguate. `isGrantable` is
 * compared when the privilege is present on both sides.
 *
 * Drift issues:
 *   - privilege_only_in_a          (production-only privilege)
 *   - privilege_only_in_b          (reconstruction-only privilege)
 *   - grantable_state_mismatch     (same privilege, differing is_grantable)
 */
export function grantIdentityKey(g) {
  return [g.schema, g.objectType, g.objectName, g.grantee, g.privilege].join("\0");
}

export function compareGrants(grantsA, grantsB, compareSurface) {
  const mapA = new Map((grantsA ?? []).map((g) => [grantIdentityKey(g), g]));
  const mapB = new Map((grantsB ?? []).map((g) => [grantIdentityKey(g), g]));
  const allKeys = [...new Set([...mapA.keys(), ...mapB.keys()])].sort();
  const records = [];

  for (const key of allKeys) {
    const a = mapA.get(key);
    const b = mapB.get(key);

    if (a && b) {
      if (Boolean(a.isGrantable) !== Boolean(b.isGrantable)) {
        records.push(
          buildRecord({
            objectType: `grant:${a.objectType}`,
            schema: a.schema,
            name: a.objectName,
            compareSurface,
            driftClass: DRIFT_CLASSES.GRANT_MISMATCH,
            details: {
              issue: "grantable_state_mismatch",
              schema: a.schema,
              objectType: a.objectType,
              objectName: a.objectName,
              grantee: a.grantee,
              privilege: a.privilege,
              isGrantable: { a: Boolean(a.isGrantable), b: Boolean(b.isGrantable) },
            },
          })
        );
      }
      continue;
    }

    const g = a ?? b;
    records.push(
      buildRecord({
        objectType: `grant:${g.objectType}`,
        schema: g.schema,
        name: g.objectName,
        compareSurface,
        driftClass: DRIFT_CLASSES.GRANT_MISMATCH,
        details: {
          issue: a ? "privilege_only_in_a" : "privilege_only_in_b",
          schema: g.schema,
          objectType: g.objectType,
          objectName: g.objectName,
          grantee: g.grantee,
          privilege: g.privilege,
          isGrantable: Boolean(g.isGrantable),
          presentIn: a ? "a" : "b",
        },
      })
    );
  }
  return records;
}

export function compareFunctions(functionsA, functionsB, compareSurface) {
  const byA = indexFunctions(functionsA);
  const byB = indexFunctions(functionsB);
  const allKeys = new Set([...byA.keys(), ...byB.keys()]);
  const records = [];

  for (const key of allKeys) {
    const schema = key.split(".")[0];
    const name = key.slice(schema.length + 1).split("(")[0];
    const a = byA.get(key);
    const b = byB.get(key);
    const presence = classify({ kind: "function", schema, name, inA: Boolean(a), inB: Boolean(b) });
    if (presence) {
      records.push(
        buildRecord({ objectType: "function", schema, name, compareSurface, ...presence, details: { identityArgs: key } })
      );
      continue;
    }
    const mismatch =
      a.definitionFingerprint !== b.definitionFingerprint ||
      a.returnType !== b.returnType ||
      a.securityDefiner !== b.securityDefiner ||
      a.volatile !== b.volatile;
    records.push(
      buildRecord({
        objectType: "function",
        schema,
        name,
        compareSurface,
        driftClass: mismatch ? DRIFT_CLASSES.FUNCTION_RPC_MISMATCH : DRIFT_CLASSES.MATCH,
        details: mismatch
          ? {
              identityArgs: key,
              definitionFingerprint: { a: a.definitionFingerprint, b: b.definitionFingerprint },
              returnType: { a: a.returnType, b: b.returnType },
              securityDefiner: { a: a.securityDefiner, b: b.securityDefiner },
            }
          : null,
      })
    );
  }
  return records;
}

function compareTableScopedDefinitions(listA, listB, compareSurface, objectType) {
  const byA = indexTableScoped(listA);
  const byB = indexTableScoped(listB);
  const allKeys = new Set([...byA.keys(), ...byB.keys()]);
  const records = [];
  for (const key of allKeys) {
    const [schema, table, name] = key.split(".");
    const a = byA.get(key);
    const b = byB.get(key);
    const presence = classify({ kind: objectType, schema, name: `${table}.${name}`, inA: Boolean(a), inB: Boolean(b) });
    if (presence) {
      records.push(
        buildRecord({ objectType, schema, name: `${table}.${name}`, compareSurface, ...presence })
      );
      continue;
    }
    const mismatch = a.definition !== b.definition;
    records.push(
      buildRecord({
        objectType,
        schema,
        name: `${table}.${name}`,
        compareSurface,
        driftClass: mismatch ? DRIFT_CLASSES.CONSTRAINT_INDEX_MISMATCH : DRIFT_CLASSES.MATCH,
        details: mismatch ? { a: a.definition, b: b.definition } : null,
      })
    );
  }
  return records;
}

export function compareConstraints(constraintsA, constraintsB, compareSurface) {
  return compareTableScopedDefinitions(constraintsA, constraintsB, compareSurface, "constraint");
}

export function compareIndexes(indexesA, indexesB, compareSurface) {
  return compareTableScopedDefinitions(indexesA, indexesB, compareSurface, "index");
}

export function compareTriggers(triggersA, triggersB, compareSurface) {
  const byA = indexTableScoped(triggersA);
  const byB = indexTableScoped(triggersB);
  const allKeys = new Set([...byA.keys(), ...byB.keys()]);
  const records = [];
  for (const key of allKeys) {
    const [schema, table, name] = key.split(".");
    const a = byA.get(key);
    const b = byB.get(key);
    const presence = classify({ kind: "trigger", schema, name: `${table}.${name}`, inA: Boolean(a), inB: Boolean(b) });
    if (presence) {
      records.push(buildRecord({ objectType: "trigger", schema, name: `${table}.${name}`, compareSurface, ...presence }));
      continue;
    }
    const mismatch =
      a.timing !== b.timing ||
      a.level !== b.level ||
      a.enabled !== b.enabled ||
      a.functionName !== b.functionName ||
      a.functionSchema !== b.functionSchema ||
      !arraysEqualAsSets(a.events, b.events);
    records.push(
      buildRecord({
        objectType: "trigger",
        schema,
        name: `${table}.${name}`,
        compareSurface,
        driftClass: mismatch ? DRIFT_CLASSES.DEFINITION_MISMATCH : DRIFT_CLASSES.MATCH,
        details: mismatch ? { a, b } : null,
      })
    );
  }
  return records;
}

export function compareEnums(enumsA, enumsB, compareSurface) {
  const byA = indexByQualifiedName(enumsA);
  const byB = indexByQualifiedName(enumsB);
  const allKeys = new Set([...byA.keys(), ...byB.keys()]);
  const records = [];
  for (const key of allKeys) {
    const [schema, name] = splitQualified(key);
    const a = byA.get(key);
    const b = byB.get(key);
    const presence = classify({ kind: "enum", schema, name, inA: Boolean(a), inB: Boolean(b) });
    if (presence) {
      records.push(buildRecord({ objectType: "enum", schema, name, compareSurface, ...presence }));
      continue;
    }
    const mismatch = JSON.stringify(a.values) !== JSON.stringify(b.values);
    records.push(
      buildRecord({
        objectType: "enum",
        schema,
        name,
        compareSurface,
        driftClass: mismatch ? DRIFT_CLASSES.DEFINITION_MISMATCH : DRIFT_CLASSES.MATCH,
        details: mismatch ? { a: a.values, b: b.values } : null,
      })
    );
  }
  return records;
}

export function compareViews(viewsA, viewsB, compareSurface) {
  const byA = indexByQualifiedName(viewsA);
  const byB = indexByQualifiedName(viewsB);
  const allKeys = new Set([...byA.keys(), ...byB.keys()]);
  const records = [];
  for (const key of allKeys) {
    const [schema, name] = splitQualified(key);
    const a = byA.get(key);
    const b = byB.get(key);
    const presence = classify({ kind: "view", schema, name, inA: Boolean(a), inB: Boolean(b) });
    if (presence) {
      records.push(buildRecord({ objectType: "view", schema, name, compareSurface, ...presence }));
      continue;
    }
    const mismatch = a.definition !== b.definition || a.securityInvoker !== b.securityInvoker;
    records.push(
      buildRecord({
        objectType: "view",
        schema,
        name,
        compareSurface,
        driftClass: mismatch ? DRIFT_CLASSES.DEFINITION_MISMATCH : DRIFT_CLASSES.MATCH,
        details: mismatch ? { securityInvoker: { a: a.securityInvoker, b: b.securityInvoker } } : null,
      })
    );
  }
  return records;
}

function splitQualified(key) {
  const idx = key.indexOf(".");
  return [key.slice(0, idx), key.slice(idx + 1)];
}

/**
 * Full catalog-vs-catalog comparison across every section. `compareSurface`
 * must be either "migration_only" or "harness" so downstream reports never
 * conflate TRUE migration reconstruction with TEST-HARNESS reconstruction
 * (per this PR's explicit constraint).
 */
export function compareCatalogs(catalogA, catalogB, compareSurface) {
  if (compareSurface !== "migration_only" && compareSurface !== "harness") {
    throw new Error(`compareCatalogs: compareSurface must be "migration_only" or "harness", got "${compareSurface}"`);
  }
  return [
    ...compareTables(catalogA.tables, catalogB.tables, compareSurface),
    ...compareViews(catalogA.views, catalogB.views, compareSurface),
    ...compareEnums(catalogA.enums, catalogB.enums, compareSurface),
    ...compareFunctions(catalogA.functions, catalogB.functions, compareSurface),
    ...compareTriggers(catalogA.triggers, catalogB.triggers, compareSurface),
    ...compareConstraints(catalogA.constraints, catalogB.constraints, compareSurface),
    ...compareIndexes(catalogA.indexes, catalogB.indexes, compareSurface),
    ...comparePolicies(catalogA.policies, catalogB.policies, compareSurface),
    ...compareGrants(catalogA.grants, catalogB.grants, compareSurface),
  ];
}

/**
 * generated_types_mismatch: compare production (preferred) or, if
 * unavailable, migration_only catalog table/column shape against the
 * parsed types.ts output (parseTypes.mjs). Types.ts is never treated as
 * authoritative — mismatches here always describe types.ts as the
 * out-of-date side (ADR 0006 §1 item 5).
 */
export function compareTypesAgainstCatalog(catalog, parsedTypes, sourceLabel) {
  const records = [];
  const catalogTables = indexByQualifiedName(catalog.tables ?? []);
  const typeTableNames = new Set(Object.keys(parsedTypes.tables ?? {}));
  const catalogTableNames = new Set(
    [...catalogTables.keys()].filter((k) => k.startsWith("public.")).map((k) => k.slice("public.".length))
  );
  const allNames = new Set([...typeTableNames, ...catalogTableNames]);

  for (const name of allNames) {
    const inTypes = typeTableNames.has(name);
    const inCatalog = catalogTableNames.has(name);
    if (inTypes && !inCatalog) {
      records.push(
        buildRecord({
          objectType: "table",
          schema: "public",
          name,
          compareSurface: `types_vs_${sourceLabel}`,
          driftClass: DRIFT_CLASSES.GENERATED_TYPES_MISMATCH,
          details: { issue: "in_types_not_in_catalog", source: sourceLabel },
        })
      );
      continue;
    }
    if (!inTypes && inCatalog) {
      records.push(
        buildRecord({
          objectType: "table",
          schema: "public",
          name,
          compareSurface: `types_vs_${sourceLabel}`,
          driftClass: DRIFT_CLASSES.GENERATED_TYPES_MISMATCH,
          details: { issue: "in_catalog_not_in_types", source: sourceLabel },
        })
      );
      continue;
    }
    const catalogTable = catalogTables.get(`public.${name}`);
    const typeColumns = parsedTypes.tables[name].columns.map((c) => c.name);
    const catalogColumns = catalogTable.columns.map((c) => c.name);
    if (!arraysEqualAsSets(typeColumns, catalogColumns)) {
      records.push(
        buildRecord({
          objectType: "table",
          schema: "public",
          name,
          compareSurface: `types_vs_${sourceLabel}`,
          driftClass: DRIFT_CLASSES.GENERATED_TYPES_MISMATCH,
          details: {
            issue: "column_set_mismatch",
            source: sourceLabel,
            onlyInTypes: typeColumns.filter((c) => !catalogColumns.includes(c)),
            onlyInCatalog: catalogColumns.filter((c) => !typeColumns.includes(c)),
          },
        })
      );
    }
  }

  return records;
}

export function summarizeDriftRecords(records) {
  const byClass = {};
  const bySurface = {};
  let highPriorityCount = 0;
  for (const record of records) {
    byClass[record.class] = (byClass[record.class] ?? 0) + 1;
    bySurface[record.compareSurface] = (bySurface[record.compareSurface] ?? 0) + 1;
    if (record.highPriority && record.class !== DRIFT_CLASSES.MATCH) highPriorityCount++;
  }
  return {
    totalRecords: records.length,
    byClass,
    bySurface,
    highPriorityNonMatchCount: highPriorityCount,
  };
}
