import { describe, expect, it } from "vitest";
import { bindSqlParams } from "../lib/linkedQueryClient.mjs";

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
