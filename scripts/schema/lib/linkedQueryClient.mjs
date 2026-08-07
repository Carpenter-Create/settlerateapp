/**
 * Read-only Postgres query client backed by `supabase db query --linked`
 * (Management API temporary login role). Used when SCHEMA_CAPTURE_DATABASE_URL
 * is unavailable but the operator is already authenticated to the linked
 * SettleRate project via the Supabase CLI.
 *
 * Never logs connection strings, passwords, or query results.
 *
 * Dual fail-closed protections on every linked query:
 *   1. Client-side allowlist: only single-statement SELECT / SHOW.
 *   2. Current-transaction READ ONLY wrapper:
 *        BEGIN READ ONLY;
 *        <catalog statement>;
 *        COMMIT;
 *      Verified against `supabase db query --linked`: SELECT/SHOW return
 *      JSON rows with transaction_read_only=on, and mutating statements are
 *      rejected by PostgreSQL with SQLSTATE 25006.
 *
 * Note: `SET default_transaction_read_only = on` alone is NOT sufficient —
 * it only changes the default for *new* transactions and does not make the
 * current statement batch read-only (confirmed: CREATE TEMP succeeded after
 * that SET in the same linked batch).
 */
import { execFileSync } from "node:child_process";
import process from "node:process";

const SAFE_IDENT = /^[a-z_][a-z0-9_]*$/;

/** Documented linked-transport read-only protections (artifact metadata). */
export const LINKED_READ_ONLY_PROTECTIONS = Object.freeze([
  "BEGIN READ ONLY / COMMIT (current transaction)",
  "client SELECT/SHOW allowlist (single statement)",
  "catalogSql SELECT-only",
]);

function toSqlLiteral(value) {
  if (typeof value === "string") {
    if (!SAFE_IDENT.test(value)) {
      throw new Error("linkedQueryClient: refusing to bind non-identifier string parameter");
    }
    return `'${value.replace(/'/g, "''")}'`;
  }
  if (Array.isArray(value)) {
    const parts = value.map((item) => {
      if (typeof item !== "string" || !SAFE_IDENT.test(item)) {
        throw new Error("linkedQueryClient: refusing to bind non-identifier array parameter");
      }
      return `'${item.replace(/'/g, "''")}'`;
    });
    // Omit the cast here — callers already write `$1::text[]`, so replacement
    // yields `ARRAY['public', 'storage']::text[]`.
    return `ARRAY[${parts.join(", ")}]`;
  }
  throw new Error(`linkedQueryClient: unsupported parameter type: ${typeof value}`);
}

/**
 * Substitute $N placeholders with vetted SQL literals. Only identifier
 * strings and identifier-string arrays are accepted (the only parameter
 * shapes used by catalogSql.mjs).
 */
export function bindSqlParams(sql, params = []) {
  if (!params.length) return sql;
  return sql.replace(/\$(\d+)(?!\d)/g, (match, n) => {
    const idx = Number(n) - 1;
    if (idx < 0 || idx >= params.length) {
      throw new Error(`linkedQueryClient: unbound parameter ${match}`);
    }
    return toSqlLiteral(params[idx]);
  });
}

/** Strip `--` and `/* *\/` comments for allowlist classification only. */
export function stripSqlCommentsForAllowlist(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n\r]*/g, " ");
}

const FORBIDDEN_LEADING =
  /^(INSERT|UPDATE|DELETE|MERGE|TRUNCATE|CREATE|ALTER|DROP|GRANT|REVOKE|CALL|COPY|DO|VACUUM|ANALYZE|REFRESH|LISTEN|NOTIFY|REINDEX|CLUSTER|SECURITY|WITH|BEGIN|COMMIT|ROLLBACK|SET|RESET|SELECT\s+INTO)\b/i;

/**
 * Fail closed: linked transport may only run a single SELECT or SHOW.
 * Multi-statement batches and mutating forms are rejected before any
 * network call. SELECT FOR UPDATE/SHARE is also rejected.
 */
export function assertLinkedSqlAllowlist(sql) {
  if (typeof sql !== "string" || !sql.trim()) {
    throw new Error("linkedQueryClient: empty SQL rejected by allowlist");
  }

  const stripped = stripSqlCommentsForAllowlist(sql).trim();
  const withoutTrailingSemi = stripped.replace(/;+\s*$/u, "").trim();

  if (!withoutTrailingSemi) {
    throw new Error("linkedQueryClient: empty SQL rejected by allowlist");
  }

  // Reject multi-statement payloads (semicolon not solely trailing).
  if (withoutTrailingSemi.includes(";")) {
    throw new Error("linkedQueryClient: multi-statement SQL rejected by allowlist");
  }

  if (!/^(SELECT|SHOW)\b/i.test(withoutTrailingSemi)) {
    if (FORBIDDEN_LEADING.test(withoutTrailingSemi)) {
      throw new Error("linkedQueryClient: non-read-only SQL rejected by allowlist");
    }
    throw new Error("linkedQueryClient: only SELECT/SHOW statements are permitted");
  }

  // SELECT INTO creates a table — not introspection.
  if (/^SELECT\s+INTO\b/i.test(withoutTrailingSemi) || /\bINTO\s+(TEMP|TEMPORARY|UNLOGGED|TABLE)\b/i.test(withoutTrailingSemi)) {
    throw new Error("linkedQueryClient: SELECT INTO rejected by allowlist");
  }

  // Row-locking SELECT variants are not catalog introspection and can block.
  if (/\bFOR\s+(UPDATE|NO\s+KEY\s+UPDATE|SHARE|KEY\s+SHARE)\b/i.test(withoutTrailingSemi)) {
    throw new Error("linkedQueryClient: SELECT FOR UPDATE/SHARE rejected by allowlist");
  }

  return withoutTrailingSemi;
}

/**
 * Wrap a single allowlisted statement in a current-transaction READ ONLY
 * boundary. PostgreSQL rejects DML/DDL inside this transaction (SQLSTATE 25006).
 */
export function wrapReadOnlySql(sql) {
  const statement = assertLinkedSqlAllowlist(sql);
  return `BEGIN READ ONLY;\n${statement};\nCOMMIT;`;
}

function extractJsonPayload(stdout) {
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");
  if (start < 0 || end < start) {
    throw new Error("linkedQueryClient: supabase db query did not return a JSON object");
  }
  return JSON.parse(stdout.slice(start, end + 1));
}

function sanitizeLinkedError(error) {
  const stderr = typeof error?.stderr === "string" ? error.stderr : "";
  // Keep only a short, non-payload status line. Never include the SQL batch,
  // connection strings, or full Management API bodies.
  const firstLine = stderr
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  let hint = "";
  if (firstLine) {
    if (/25006|read-only transaction/i.test(firstLine)) {
      hint = " (read-only transaction rejected mutation)";
    } else if (/unexpected status \d+/i.test(firstLine)) {
      hint = ` (${firstLine.match(/unexpected status \d+/i)?.[0] ?? "request failed"})`;
    } else if (/ERROR:\s+\w+/i.test(firstLine)) {
      hint = " (postgres rejected statement)";
    } else {
      hint = " (cli failed)";
    }
  }
  return new Error(`linkedQueryClient: supabase db query --linked failed${hint}`);
}

/**
 * Create a pg-Client-shaped adapter: `{ query(sql, params) => { rows } }`.
 */
export function createLinkedQueryClient({ projectRef } = {}) {
  return {
    async query(sql, params = []) {
      const bound = bindSqlParams(sql, params);
      const wrapped = wrapReadOnlySql(bound);
      let stdout;
      try {
        stdout = execFileSync(
          "supabase",
          ["db", "query", "--linked", "-o", "json", wrapped],
          {
            encoding: "utf8",
            maxBuffer: 64 * 1024 * 1024,
            stdio: ["ignore", "pipe", "pipe"],
            env: process.env,
          }
        );
      } catch (error) {
        throw sanitizeLinkedError(error);
      }
      const payload = extractJsonPayload(stdout);
      return { rows: payload.rows ?? [] };
    },
    // Compatibility no-ops so captureFromDatabase can treat this like a Client.
    async connect() {},
    async end() {},
    projectRef: projectRef ?? null,
    transport: "supabase_db_query_linked",
    readOnlyProtections: LINKED_READ_ONLY_PROTECTIONS,
  };
}
