/**
 * Read-only Postgres query client backed by `supabase db query --linked`
 * (Management API temporary login role). Used when SCHEMA_CAPTURE_DATABASE_URL
 * is unavailable but the operator is already authenticated to the linked
 * SettleRate project via the Supabase CLI.
 *
 * Never logs connection strings, passwords, or query results. Each statement
 * is preceded by `SET default_transaction_read_only = on` so the session is
 * fail-closed against accidental writes even if a mutating SQL string were
 * ever passed in.
 */
import { execFileSync } from "node:child_process";
import process from "node:process";

const SAFE_IDENT = /^[a-z_][a-z0-9_]*$/;

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

function extractJsonPayload(stdout) {
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");
  if (start < 0 || end < start) {
    throw new Error("linkedQueryClient: supabase db query did not return a JSON object");
  }
  return JSON.parse(stdout.slice(start, end + 1));
}

/**
 * Create a pg-Client-shaped adapter: `{ query(sql, params) => { rows } }`.
 */
export function createLinkedQueryClient({ projectRef } = {}) {
  return {
    async query(sql, params = []) {
      const bound = bindSqlParams(sql, params);
      // Force read-only for this statement batch. Management API queries are
      // typically auto-committed per call; SET still blocks DML/DDL in-session.
      const wrapped = `SET default_transaction_read_only = on;\n${bound}`;
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
        const stderr = typeof error?.stderr === "string" ? error.stderr : "";
        // Never include the SQL (may contain function bodies) or any env
        // connection material in the thrown message.
        throw new Error(
          `linkedQueryClient: supabase db query --linked failed${stderr ? ` (${stderr.split("\n")[0]})` : ""}`
        );
      }
      const payload = extractJsonPayload(stdout);
      return { rows: payload.rows ?? [] };
    },
    // Compatibility no-ops so captureFromDatabase can treat this like a Client.
    async connect() {},
    async end() {},
    projectRef: projectRef ?? null,
    transport: "supabase_db_query_linked",
  };
}
