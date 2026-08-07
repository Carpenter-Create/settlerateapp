/**
 * Read-only Postgres catalog introspection (pg_catalog / information_schema
 * only — never row payloads except allowlisted COUNT(*)). Shared by
 * captureFromDatabase.mjs (production, via SCHEMA_CAPTURE_DATABASE_URL) and
 * reconstructLocal.mjs (ephemeral Docker Postgres). Every query here must be
 * safe to run inside `SET default_transaction_read_only = on; BEGIN READ
 * ONLY;`.
 */
import { fingerprintText } from "./fingerprint.mjs";
import { redactIfSecretLike } from "./sanitize.mjs";

const VOLATILITY_MAP = { i: "IMMUTABLE", s: "STABLE", v: "VOLATILE" };

// Bit flags per Postgres's pg_trigger.tgtype (see src/include/catalog/pg_trigger.h).
const TRIGGER_TYPE_ROW = 1 << 0;
const TRIGGER_TYPE_BEFORE = 1 << 1;
const TRIGGER_TYPE_INSERT = 1 << 2;
const TRIGGER_TYPE_DELETE = 1 << 3;
const TRIGGER_TYPE_UPDATE = 1 << 4;
const TRIGGER_TYPE_TRUNCATE = 1 << 5;
const TRIGGER_TYPE_INSTEAD = 1 << 6;

const CONSTRAINT_TYPE_MAP = {
  p: "PRIMARY KEY",
  f: "FOREIGN KEY",
  u: "UNIQUE",
  c: "CHECK",
  x: "EXCLUSION",
  t: "CONSTRAINT_TRIGGER",
};

export function decodeTriggerTiming(tgtype) {
  if (tgtype & TRIGGER_TYPE_INSTEAD) return "INSTEAD OF";
  if (tgtype & TRIGGER_TYPE_BEFORE) return "BEFORE";
  return "AFTER";
}

export function decodeTriggerEvents(tgtype) {
  const events = [];
  if (tgtype & TRIGGER_TYPE_INSERT) events.push("INSERT");
  if (tgtype & TRIGGER_TYPE_UPDATE) events.push("UPDATE");
  if (tgtype & TRIGGER_TYPE_DELETE) events.push("DELETE");
  if (tgtype & TRIGGER_TYPE_TRUNCATE) events.push("TRUNCATE");
  return events;
}

export function decodeTriggerLevel(tgtype) {
  return tgtype & TRIGGER_TYPE_ROW ? "ROW" : "STATEMENT";
}

async function queryRows(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows;
}

export async function captureTables(client, schemas) {
  return queryRows(
    client,
    `
      SELECT
        n.nspname AS schema,
        c.relname AS name,
        c.relrowsecurity AS "rlsEnabled",
        c.relforcerowsecurity AS "rlsForced"
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r' AND n.nspname = ANY($1::text[])
      ORDER BY n.nspname, c.relname
    `,
    [schemas]
  );
}

export async function captureColumns(client, schemas) {
  const rows = await queryRows(
    client,
    `
      SELECT
        table_schema AS schema,
        table_name AS "tableName",
        column_name AS name,
        data_type AS "dataType",
        udt_name AS "udtName",
        is_nullable AS "isNullable",
        column_default AS "default",
        is_identity AS "isIdentity",
        identity_generation AS "identityGeneration",
        is_generated AS "isGenerated",
        generation_expression AS "generationExpression",
        ordinal_position AS "ordinalPosition"
      FROM information_schema.columns
      WHERE table_schema = ANY($1::text[])
      ORDER BY table_schema, table_name, ordinal_position
    `,
    [schemas]
  );
  return rows.map((row) => ({
    ...row,
    isNullable: row.isNullable === "YES",
    isIdentity: row.isIdentity === "YES",
    isGenerated: row.isGenerated !== "NEVER" && row.isGenerated != null,
  }));
}

/**
 * Attach columns to their owning table, dropping the join-only `tableName`
 * field, in the shape required by the catalog schema.
 */
export function attachColumnsToTables(tables, columns) {
  const byKey = new Map();
  for (const table of tables) {
    byKey.set(`${table.schema}.${table.name}`, { ...table, columns: [] });
  }
  for (const column of columns) {
    const key = `${column.schema}.${column.tableName}`;
    const entry = byKey.get(key);
    if (!entry) continue; // column belongs to a view or object we don't track as a table
    const { tableName, schema, ...rest } = column;
    void tableName;
    void schema;
    entry.columns.push(rest);
  }
  return [...byKey.values()];
}

export async function captureViews(client, schemas) {
  const rows = await queryRows(
    client,
    `
      SELECT
        n.nspname AS schema,
        c.relname AS name,
        pg_get_viewdef(c.oid, true) AS definition,
        COALESCE(c.reloptions, ARRAY[]::text[]) AS reloptions
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'v' AND n.nspname = ANY($1::text[])
      ORDER BY n.nspname, c.relname
    `,
    [schemas]
  );
  return rows.map(({ reloptions, ...row }) => ({
    ...row,
    securityInvoker: reloptions.some((opt) => opt === "security_invoker=true"),
  }));
}

export async function captureEnums(client, schemas) {
  const rows = await queryRows(
    client,
    `
      SELECT
        n.nspname AS schema,
        t.typname AS name,
        e.enumlabel AS value
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = ANY($1::text[])
      ORDER BY n.nspname, t.typname, e.enumsortorder
    `,
    [schemas]
  );
  const byKey = new Map();
  for (const row of rows) {
    const key = `${row.schema}.${row.name}`;
    if (!byKey.has(key)) byKey.set(key, { schema: row.schema, name: row.name, values: [] });
    byKey.get(key).values.push(row.value);
  }
  return [...byKey.values()];
}

/**
 * Functions: fingerprints the function body via pg_get_functiondef, redacts
 * (never stores) the raw body if it contains anything secret-like, and
 * never includes the raw definition text in the returned catalog object.
 */
export async function captureFunctions(client, schemas) {
  const rows = await queryRows(
    client,
    `
      SELECT
        n.nspname AS schema,
        p.proname AS name,
        pg_get_function_identity_arguments(p.oid) AS "identityArgs",
        pg_get_function_result(p.oid) AS "returnType",
        l.lanname AS language,
        p.provolatile AS "volatileCode",
        p.prosecdef AS "securityDefiner",
        (
          SELECT cfg FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
          WHERE cfg LIKE 'search_path=%'
          LIMIT 1
        ) AS "searchPathRaw",
        pg_get_functiondef(p.oid) AS definition
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      JOIN pg_language l ON l.oid = p.prolang
      WHERE n.nspname = ANY($1::text[])
      ORDER BY n.nspname, p.proname, "identityArgs"
    `,
    [schemas]
  );

  return rows.map((row) => {
    const { volatileCode, searchPathRaw, definition, ...rest } = row;
    const { text: safeDefinitionText, containsSecretLikeLiteral, redacted } =
      redactIfSecretLike(definition);
    return {
      ...rest,
      volatile: VOLATILITY_MAP[volatileCode] ?? volatileCode,
      searchPath: searchPathRaw ? searchPathRaw.replace(/^search_path=/, "") : null,
      definitionFingerprint: fingerprintText(safeDefinitionText),
      definitionRedacted: redacted,
      containsSecretLikeLiteral,
    };
  });
}

export async function captureTriggers(client, schemas) {
  const rows = await queryRows(
    client,
    `
      SELECT
        n.nspname AS schema,
        c.relname AS table,
        t.tgname AS name,
        t.tgtype AS "tgType",
        t.tgenabled AS "tgEnabled",
        pn.nspname AS "functionSchema",
        pf.proname AS "functionName"
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_proc pf ON pf.oid = t.tgfoid
      JOIN pg_namespace pn ON pn.oid = pf.pronamespace
      WHERE NOT t.tgisinternal AND n.nspname = ANY($1::text[])
      ORDER BY n.nspname, c.relname, t.tgname
    `,
    [schemas]
  );
  return rows.map(({ tgType, tgEnabled, ...row }) => ({
    ...row,
    timing: decodeTriggerTiming(tgType),
    events: decodeTriggerEvents(tgType),
    level: decodeTriggerLevel(tgType),
    enabled: tgEnabled !== "D",
  }));
}

export async function captureConstraints(client, schemas) {
  const rows = await queryRows(
    client,
    `
      SELECT
        n.nspname AS schema,
        c.relname AS table,
        con.conname AS name,
        con.contype AS "typeCode",
        pg_get_constraintdef(con.oid) AS definition,
        fn.nspname AS "referencedSchema",
        fc.relname AS "referencedTable"
      FROM pg_constraint con
      JOIN pg_class c ON c.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_class fc ON fc.oid = con.confrelid
      LEFT JOIN pg_namespace fn ON fn.oid = fc.relnamespace
      WHERE n.nspname = ANY($1::text[])
      ORDER BY n.nspname, c.relname, con.conname
    `,
    [schemas]
  );
  return rows.map(({ typeCode, ...row }) => ({
    ...row,
    type: CONSTRAINT_TYPE_MAP[typeCode] ?? typeCode,
  }));
}

export async function captureIndexes(client, schemas) {
  const rows = await queryRows(
    client,
    `
      SELECT
        schemaname AS schema,
        tablename AS table,
        indexname AS name,
        indexdef AS definition
      FROM pg_indexes
      WHERE schemaname = ANY($1::text[])
      ORDER BY schemaname, tablename, indexname
    `,
    [schemas]
  );
  return rows.map((row) => ({
    ...row,
    unique: /^CREATE UNIQUE /i.test(row.definition),
  }));
}

export async function capturePolicies(client, schemas) {
  return queryRows(
    client,
    `
      SELECT
        schemaname AS schema,
        tablename AS table,
        policyname AS name,
        cmd,
        roles,
        permissive,
        qual,
        with_check AS "withCheck"
      FROM pg_policies
      WHERE schemaname = ANY($1::text[])
      ORDER BY schemaname, tablename, policyname
    `,
    [schemas]
  );
}

export async function captureGrants(client, schemas) {
  const tableGrants = await queryRows(
    client,
    `
      SELECT
        table_schema AS schema,
        'table'::text AS "objectType",
        table_name AS "objectName",
        grantee,
        privilege_type AS privilege,
        is_grantable AS "isGrantable"
      FROM information_schema.role_table_grants
      WHERE table_schema = ANY($1::text[])
    `,
    [schemas]
  );
  // Use pg_catalog + identity args so overloaded functions disambiguate
  // (information_schema.role_routine_grants only carries routine_name).
  const routineGrants = await queryRows(
    client,
    `
      SELECT
        n.nspname AS schema,
        'function'::text AS "objectType",
        (p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')') AS "objectName",
        COALESCE(grantee.rolname, 'PUBLIC') AS grantee,
        acl.privilege_type AS privilege,
        acl.is_grantable AS "isGrantable"
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      CROSS JOIN LATERAL aclexplode(
        COALESCE(p.proacl, acldefault('f', p.proowner))
      ) AS acl(grantor, grantee_oid, privilege_type, is_grantable)
      LEFT JOIN pg_roles grantee ON grantee.oid = acl.grantee_oid
      WHERE n.nspname = ANY($1::text[])
        AND acl.grantee_oid <> 0
      UNION ALL
      SELECT
        n.nspname AS schema,
        'function'::text AS "objectType",
        (p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')') AS "objectName",
        'PUBLIC'::name AS grantee,
        acl.privilege_type AS privilege,
        acl.is_grantable AS "isGrantable"
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      CROSS JOIN LATERAL aclexplode(
        COALESCE(p.proacl, acldefault('f', p.proowner))
      ) AS acl(grantor, grantee_oid, privilege_type, is_grantable)
      WHERE n.nspname = ANY($1::text[])
        AND acl.grantee_oid = 0
    `,
    [schemas]
  );
  return [...tableGrants, ...routineGrants].map((row) => ({
    ...row,
    // information_schema returns YES/NO strings; aclexplode returns boolean.
    isGrantable: row.isGrantable === true || row.isGrantable === "YES" || row.isGrantable === "t",
  }));
}

export async function captureExtensions(client) {
  return queryRows(
    client,
    `
      SELECT
        e.extname AS name,
        e.extversion AS version,
        n.nspname AS schema
      FROM pg_extension e
      JOIN pg_namespace n ON n.oid = e.extnamespace
      ORDER BY e.extname
    `
  );
}

async function relationExists(client, schema, name) {
  const rows = await queryRows(
    client,
    `SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = $1 AND c.relname = $2 LIMIT 1`,
    [schema, name]
  );
  return rows.length > 0;
}

/**
 * Best-effort migration apply-history from Supabase's own bookkeeping
 * table. Never fails the whole capture if the schema/table doesn't exist
 * (e.g. an ephemeral reconstruction database that only ran raw `psql` file
 * application, or a project not managed via `supabase db push`).
 */
export async function captureMigrationVersions(client) {
  const exists = await relationExists(client, "supabase_migrations", "schema_migrations");
  if (!exists) return [];
  const rows = await queryRows(
    client,
    `SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version`
  );
  return rows.map((row) => ({ version: row.version, name: row.name ?? null }));
}

/**
 * COUNT(*) only, and only for the fixed allowlist — never row payloads, and
 * never for tables outside the allowlist even if present. Skips tables that
 * don't exist in this particular capture (e.g. `subscriptions` is absent in
 * the migration_only reconstruction by design).
 */
export async function captureRowCounts(client, allowlistTables, existingTableKeys) {
  const results = [];
  for (const tableName of allowlistTables) {
    const key = `public.${tableName}`;
    if (!existingTableKeys.has(key)) continue;
    const { rows } = await client.query(
      `SELECT count(*)::bigint AS n FROM public.${quoteIdent(tableName)}`
    );
    results.push({ schema: "public", table: tableName, count: Number(rows[0].n) });
  }
  return results;
}

// Allowlist-only identifiers; still quote defensively rather than trust
// caller input verbatim.
function quoteIdent(identifier) {
  if (!/^[a-z_][a-z0-9_]*$/.test(identifier)) {
    throw new Error(`Refusing to quote unexpected identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

export const ROW_COUNT_ALLOWLIST_TABLES = [
  "subscriptions",
  "saved_comparisons",
  "comparison_items",
  "comparison_versions",
  "comparison_shares",
  "export_files",
  "export_shares",
  "advisor_access_requests",
  "pdf_exports",
  "user_comparisons",
  "profiles",
  "billing",
  "admin_bootstrap_tokens",
  "stripe_webhook_events",
  "entitlement_bypass_log",
  "scenarios",
  "user_roles",
  "contact_messages",
  "admin_audit_log",
];

/**
 * Full read-only catalog capture against an already-connected client.
 * `client` must already be inside `BEGIN READ ONLY` (see
 * captureFromDatabase.mjs / reconstructLocal.mjs) — this module never issues
 * transaction control statements itself so it can be reused by both an
 * ephemeral local DB and a production read replica connection.
 */
export async function buildCatalog(client, { schemas, includeRowCounts = true } = {}) {
  const resolvedSchemas = schemas ?? ["public", "storage"];

  // A single pg.Client (as opposed to a Pool) cannot run overlapping
  // queries concurrently — run sequentially rather than Promise.all.
  const rawTables = await captureTables(client, resolvedSchemas);
  const columns = await captureColumns(client, resolvedSchemas);
  const views = await captureViews(client, resolvedSchemas);
  const enums = await captureEnums(client, resolvedSchemas);
  const functions = await captureFunctions(client, resolvedSchemas);
  const triggers = await captureTriggers(client, resolvedSchemas);
  const constraints = await captureConstraints(client, resolvedSchemas);
  const indexes = await captureIndexes(client, resolvedSchemas);
  const policies = await capturePolicies(client, resolvedSchemas);
  const grants = await captureGrants(client, resolvedSchemas);
  const extensions = await captureExtensions(client);
  const migrationVersions = await captureMigrationVersions(client);

  const tables = attachColumnsToTables(rawTables, columns);

  let rowCounts = [];
  if (includeRowCounts) {
    const existingTableKeys = new Set(tables.map((t) => `${t.schema}.${t.name}`));
    rowCounts = await captureRowCounts(client, ROW_COUNT_ALLOWLIST_TABLES, existingTableKeys);
  }

  return {
    tables,
    views,
    enums,
    functions,
    triggers,
    constraints,
    indexes,
    policies,
    grants,
    extensions,
    migrationVersions,
    rowCounts,
  };
}
