/**
 * Deterministic ordering and canonicalization helpers for schema catalog
 * artifacts (Epic 6 PR 1). Two captures of the *same* underlying schema must
 * normalize to byte-identical JSON so fingerprints and diffs are stable
 * regardless of catalog query result order.
 */

/**
 * Stable multi-key comparator. `keys` is an array of functions that each
 * extract a comparable primitive from an item. Undefined/null sort last.
 */
export function compareByKeys(keys) {
  return (a, b) => {
    for (const keyFn of keys) {
      const av = keyFn(a);
      const bv = keyFn(b);
      if (av === bv) continue;
      if (av === undefined || av === null) return 1;
      if (bv === undefined || bv === null) return -1;
      if (av < bv) return -1;
      if (av > bv) return 1;
    }
    return 0;
  };
}

export function sortByKeys(list, keys) {
  return [...(list ?? [])].sort(compareByKeys(keys));
}

/**
 * Recursively sort object keys alphabetically (arrays keep their element
 * order — callers are responsible for sorting arrays by meaningful keys
 * before calling this). Used to produce deterministic JSON.stringify output.
 */
export function canonicalizeKeyOrder(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalizeKeyOrder);
  }
  if (value !== null && typeof value === "object") {
    const sortedKeys = Object.keys(value).sort();
    const out = {};
    for (const key of sortedKeys) {
      out[key] = canonicalizeKeyOrder(value[key]);
    }
    return out;
  }
  return value;
}

/**
 * Deterministic JSON.stringify: sorted object keys, fixed indentation.
 */
export function stableStringify(value, indent = 2) {
  return JSON.stringify(canonicalizeKeyOrder(value), null, indent);
}

const TABLE_KEYS = [(t) => t.schema, (t) => t.name];
const COLUMN_KEYS = [(c) => c.ordinalPosition, (c) => c.name];
const VIEW_KEYS = [(v) => v.schema, (v) => v.name];
const ENUM_KEYS = [(e) => e.schema, (e) => e.name];
const FUNCTION_KEYS = [(f) => f.schema, (f) => f.name, (f) => f.identityArgs];
const TRIGGER_KEYS = [(t) => t.schema, (t) => t.table, (t) => t.name];
const CONSTRAINT_KEYS = [(c) => c.schema, (c) => c.table, (c) => c.name];
const INDEX_KEYS = [(i) => i.schema, (i) => i.table, (i) => i.name];
const POLICY_KEYS = [(p) => p.schema, (p) => p.table, (p) => p.name];
const GRANT_KEYS = [
  (g) => g.schema,
  (g) => g.objectType,
  (g) => g.objectName,
  (g) => g.grantee,
  (g) => g.privilege,
  (g) => (g.isGrantable ? "1" : "0"),
];
const EXTENSION_KEYS = [(e) => e.schema, (e) => e.name];
const MIGRATION_KEYS = [(m) => m.version];
const ROW_COUNT_KEYS = [(r) => r.schema, (r) => r.table];

/**
 * Sort every section of a raw catalog object into a deterministic order.
 * Does not mutate the input.
 */
export function normalizeCatalog(catalog) {
  const tables = sortByKeys(catalog.tables, TABLE_KEYS).map((table) => ({
    ...table,
    columns: sortByKeys(table.columns, COLUMN_KEYS),
  }));

  return {
    ...catalog,
    tables,
    views: sortByKeys(catalog.views, VIEW_KEYS),
    enums: sortByKeys(catalog.enums, ENUM_KEYS),
    functions: sortByKeys(catalog.functions, FUNCTION_KEYS),
    triggers: sortByKeys(catalog.triggers, TRIGGER_KEYS),
    constraints: sortByKeys(catalog.constraints, CONSTRAINT_KEYS),
    indexes: sortByKeys(catalog.indexes, INDEX_KEYS),
    policies: sortByKeys(catalog.policies, POLICY_KEYS),
    grants: sortByKeys(catalog.grants, GRANT_KEYS),
    extensions: sortByKeys(catalog.extensions, EXTENSION_KEYS),
    migrationVersions: sortByKeys(catalog.migrationVersions, MIGRATION_KEYS),
    rowCounts: sortByKeys(catalog.rowCounts, ROW_COUNT_KEYS),
  };
}

/**
 * Build the qualified `schema.name` key used throughout drift comparison.
 */
export function qualifiedName(schema, name) {
  return `${schema}.${name}`;
}
