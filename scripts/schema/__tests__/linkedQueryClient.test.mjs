import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import pg from "pg";
import {
  assertLinkedSqlAllowlist,
  bindSqlParams,
  stripSqlCommentsForAllowlist,
  wrapReadOnlySql,
  LINKED_READ_ONLY_PROTECTIONS,
} from "../lib/linkedQueryClient.mjs";
import {
  removeDockerContainer,
  startPostgresContainer,
  waitForPostgresReady,
} from "../../lib/postgresDockerReadiness.mjs";

function dockerExec(cmd, opts = {}) {
  return execSync(cmd, { stdio: "pipe", encoding: "utf8", ...opts }).trim();
}

describe("bindSqlParams", () => {
  it("binds identifier string arrays for ANY($1::text[]) shapes", () => {
    const sql = "SELECT 1 WHERE n.nspname = ANY($1::text[])";
    expect(bindSqlParams(sql, [["public", "storage"]])).toBe(
      "SELECT 1 WHERE n.nspname = ANY(ARRAY['public', 'storage']::text[])"
    );
  });

  it("binds scalar identifier parameters without touching later digits", () => {
    const sql = "SELECT 1 WHERE n.nspname = $1 AND c.relname = $2";
    expect(bindSqlParams(sql, ["public", "subscriptions"])).toBe(
      "SELECT 1 WHERE n.nspname = 'public' AND c.relname = 'subscriptions'"
    );
  });

  it("refuses non-identifier string parameters (fail closed)", () => {
    expect(() => bindSqlParams("SELECT $1", ["'; DROP TABLE"])).toThrow(/non-identifier/);
  });

  it("refuses unbound placeholders", () => {
    expect(() => bindSqlParams("SELECT $1, $2", ["public"])).toThrow(/unbound/);
  });
});

describe("assertLinkedSqlAllowlist", () => {
  it("permits SELECT and SHOW", () => {
    expect(assertLinkedSqlAllowlist("SELECT 1")).toBe("SELECT 1");
    expect(assertLinkedSqlAllowlist("SHOW server_version")).toBe("SHOW server_version");
    expect(assertLinkedSqlAllowlist("  select 1;  ")).toBe("select 1");
  });

  it("permits SELECT after stripping comments", () => {
    expect(assertLinkedSqlAllowlist("-- comment\nSELECT 1")).toBe("SELECT 1");
    expect(assertLinkedSqlAllowlist("/* block */ SELECT current_database()")).toBe(
      "SELECT current_database()"
    );
  });

  it("rejects mutating and non-introspection forms", () => {
    const rejected = [
      "INSERT INTO t VALUES (1)",
      "UPDATE t SET x = 1",
      "DELETE FROM t",
      "MERGE INTO t USING s ON true WHEN MATCHED THEN UPDATE SET x = 1",
      "TRUNCATE t",
      "CREATE TEMP TABLE t(id int)",
      "ALTER TABLE t ADD COLUMN x int",
      "DROP TABLE t",
      "GRANT SELECT ON t TO anon",
      "REVOKE SELECT ON t FROM anon",
      "CALL some_proc()",
      "COPY t TO STDOUT",
      "DO $$ BEGIN NULL; END $$",
      "VACUUM",
      "ANALYZE t",
      "REFRESH MATERIALIZED VIEW v",
      "WITH x AS (SELECT 1) INSERT INTO t SELECT * FROM x",
      "SET transaction_read_only = on",
      "BEGIN",
      "SELECT INTO junk FROM t",
    ];
    for (const sql of rejected) {
      expect(() => assertLinkedSqlAllowlist(sql), sql).toThrow(/allowlist|permitted|non-read-only/);
    }
  });

  it("rejects multi-statement SQL and SELECT FOR UPDATE", () => {
    expect(() => assertLinkedSqlAllowlist("SELECT 1; SELECT 2")).toThrow(/multi-statement/);
    expect(() => assertLinkedSqlAllowlist("SELECT 1 FOR UPDATE")).toThrow(/FOR UPDATE/);
  });
});

describe("wrapReadOnlySql", () => {
  it("wraps allowlisted SQL in BEGIN READ ONLY / COMMIT", () => {
    expect(wrapReadOnlySql("SELECT 1")).toBe("BEGIN READ ONLY;\nSELECT 1;\nCOMMIT;");
    expect(wrapReadOnlySql("SHOW server_version;")).toBe(
      "BEGIN READ ONLY;\nSHOW server_version;\nCOMMIT;"
    );
  });

  it("applies parameter binding before wrap when composed like the client", () => {
    const bound = bindSqlParams("SELECT $1 AS schema", ["public"]);
    expect(wrapReadOnlySql(bound)).toBe("BEGIN READ ONLY;\nSELECT 'public' AS schema;\nCOMMIT;");
  });

  it("documents linked protections without claiming default_transaction_read_only alone", () => {
    expect(LINKED_READ_ONLY_PROTECTIONS.join(" ")).toMatch(/BEGIN READ ONLY/);
    expect(LINKED_READ_ONLY_PROTECTIONS.join(" ")).not.toMatch(/default_transaction_read_only/);
  });

  it("does not embed caller SQL in allowlist rejection errors", () => {
    const secretish = "INSERT INTO secrets VALUES ('super-secret-value-xyz')";
    try {
      wrapReadOnlySql(secretish);
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(String(error.message)).not.toContain("super-secret-value-xyz");
      expect(String(error.message)).not.toContain(secretish);
      expect(String(error.stack ?? "")).not.toContain("super-secret-value-xyz");
    }
  });
});

describe("stripSqlCommentsForAllowlist", () => {
  it("removes line and block comments", () => {
    expect(stripSqlCommentsForAllowlist("--x\nSELECT 1 /*y*/").replace(/\s+/g, " ").trim()).toBe(
      "SELECT 1"
    );
  });
});

describe("disposable Postgres: current-transaction READ ONLY rejects mutations", () => {
  const CONTAINER = "settlerate-schema-ro-proof";
  const PORT = 54341;
  let client;

  beforeAll(async () => {
    startPostgresContainer({
      containerName: CONTAINER,
      password: "postgres",
      hostPort: PORT,
      exec: dockerExec,
    });
    await waitForPostgresReady({
      containerName: CONTAINER,
      user: "postgres",
      exec: dockerExec,
    });
    client = new pg.Client({
      host: "127.0.0.1",
      port: PORT,
      user: "postgres",
      password: "postgres",
      database: "postgres",
    });
    await client.connect();
  }, 120_000);

  afterAll(async () => {
    await client?.end().catch(() => {});
    removeDockerContainer(CONTAINER, dockerExec);
  });

  function rowsFromPossiblyMultiResult(result) {
    // node-pg returns Result[] for multi-statement batches (BEGIN/SELECT/COMMIT).
    if (Array.isArray(result)) {
      const withRows = result.find((part) => Array.isArray(part.rows) && part.rows.length > 0);
      return withRows?.rows ?? [];
    }
    return result.rows ?? [];
  }

  it("allows a normal catalog SELECT under the READ ONLY wrapper", async () => {
    const sql = wrapReadOnlySql(
      "SELECT n.nspname AS schema FROM pg_namespace n WHERE n.nspname = 'public'"
    );
    const rows = rowsFromPossiblyMultiResult(await client.query(sql));
    expect(rows).toEqual([{ schema: "public" }]);
  });

  it("reports transaction_read_only=on inside the wrapped transaction", async () => {
    const rows = rowsFromPossiblyMultiResult(
      await client.query(wrapReadOnlySql("SELECT current_setting('transaction_read_only') AS tro"))
    );
    expect(rows[0]?.tro).toBe("on");
  });

  it("rejects a mutating statement because the current transaction is READ ONLY", async () => {
    // Bypass the client allowlist intentionally: prove the *transaction*
    // wrapper alone is sufficient against mutation.
    const mutatingBatch =
      "BEGIN READ ONLY;\nCREATE TEMP TABLE __ro_probe(id int);\nCOMMIT;";
    await expect(client.query(mutatingBatch)).rejects.toThrow(/read-only transaction/i);
  });

  it("allowlist rejects mutations before they can reach Postgres", () => {
    expect(() => wrapReadOnlySql("CREATE TEMP TABLE __ro_probe(id int)")).toThrow(/allowlist|non-read-only/);
  });
});
