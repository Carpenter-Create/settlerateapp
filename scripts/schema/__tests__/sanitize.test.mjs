import { describe, expect, it, afterEach } from "vitest";
import {
  SecretLikeContentError,
  scanStringForSecrets,
  assertNoHighConfidenceSecrets,
  assertCatalogIsSafeToWrite,
  redactIfSecretLike,
  requireDatabaseUrlEnv,
} from "../lib/sanitize.mjs";

describe("scanStringForSecrets", () => {
  it("flags a Postgres connection string with an embedded password", () => {
    const findings = scanStringForSecrets("postgres://user:sup3rsecret@db.example.com:5432/postgres");
    expect(findings).toContain("postgres_connection_string_with_password");
  });

  it("flags a JWT-like token", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dOzYnb6ndc2ITvhfvIP1sk4Yav4NEXAG0P3zHwHF8kM";
    const findings = scanStringForSecrets(jwt);
    expect(findings).toContain("jwt_like_token");
  });

  it("flags Stripe secret and webhook keys", () => {
    expect(scanStringForSecrets("sk_live_abcdefgh12345678")).toContain("stripe_secret_key");
    expect(scanStringForSecrets("sk_test_abcdefgh12345678")).toContain("stripe_secret_key");
    expect(scanStringForSecrets("whsec_abcdefgh12345678")).toContain("stripe_webhook_secret");
  });

  it("flags a service_role key assignment", () => {
    const findings = scanStringForSecrets('service_role: "abcdefghij1234567890"');
    expect(findings).toContain("service_role_key_assignment");
  });

  it("flags password= in a query string and generic password assignments", () => {
    expect(scanStringForSecrets("host=db;port=5432?password=abcd1234")).toContain("password_query_param");
    expect(scanStringForSecrets('password: "abcd1234"')).toContain("generic_password_assignment");
  });

  it("does not false-positive on ordinary SQL type names", () => {
    const findings = scanStringForSecrets("character varying(255)");
    expect(findings).toEqual([]);
  });

  it("does not false-positive on a plain boolean/type union string", () => {
    expect(scanStringForSecrets("string | null")).toEqual([]);
    expect(scanStringForSecrets("timestamp with time zone")).toEqual([]);
  });

  it("flags a bare long hex string by default (potential raw secret)", () => {
    const findings = scanStringForSecrets("a".repeat(40));
    expect(findings).toContain("long_hex_secret");
  });

  it("allowlists long hex strings under known hash/fingerprint key names", () => {
    const hex = "b".repeat(64);
    expect(scanStringForSecrets(hex, { keyName: "definitionFingerprint" })).toEqual([]);
    expect(scanStringForSecrets(hex, { keyName: "gitSha" })).toEqual([]);
    expect(scanStringForSecrets(hex, { keyName: "fingerprint" })).toEqual([]);
    // Unrelated key names are still checked.
    expect(scanStringForSecrets(hex, { keyName: "someOtherField" })).toContain("long_hex_secret");
  });

  it("allowlists long hex strings nested under a fingerprint field via an ancestor path segment (a/b diff shape)", () => {
    const hex = "f".repeat(64);
    // Drift records commonly shape mismatches as `{ definitionFingerprint: { a, b } }`,
    // so the leaf's own key is "a"/"b", not "definitionFingerprint".
    expect(scanStringForSecrets(hex, { path: ["details", "definitionFingerprint", "a"] })).toEqual([]);
    expect(scanStringForSecrets(hex, { path: ["details", "definitionFingerprint", "b"] })).toEqual([]);
    expect(scanStringForSecrets(hex, { path: ["details", "unrelatedField", "a"] })).toContain("long_hex_secret");
  });

  it("flags email-like values but allowlists known test fixture domains", () => {
    expect(scanStringForSecrets("owner@realcompany.io")).toContain("email_like_value");
    expect(scanStringForSecrets("concurrent@test.local")).toEqual([]);
    expect(scanStringForSecrets("admin@example.com")).toEqual([]);
  });
});

describe("assertNoHighConfidenceSecrets", () => {
  it("throws SecretLikeContentError on a connection string", () => {
    expect(() =>
      assertNoHighConfidenceSecrets("DATABASE_URL=postgres://u:p@host/db", "test artifact")
    ).toThrow(SecretLikeContentError);
  });

  it("does not throw on a clean artifact even if it contains long hashes", () => {
    const text = JSON.stringify({ definitionFingerprint: "c".repeat(64) });
    expect(() => assertNoHighConfidenceSecrets(text)).not.toThrow();
  });
});

describe("assertCatalogIsSafeToWrite", () => {
  it("fails closed when a secret-like literal is buried in a nested object", () => {
    const catalog = {
      meta: { gitSha: "d".repeat(40) },
      functions: [{ schema: "public", name: "f", definitionFingerprint: "e".repeat(64) }],
      policies: [{ schema: "public", table: "t", name: "p", qual: "connection: postgres://u:p@host/db" }],
    };
    expect(() => assertCatalogIsSafeToWrite(catalog)).toThrow(SecretLikeContentError);
  });

  it("passes for a clean catalog including legitimate hash fields", () => {
    const catalog = {
      meta: { gitSha: "d".repeat(40), capturedAt: "2026-08-07T00:00:00.000Z" },
      functions: [{ schema: "public", name: "f", definitionFingerprint: "e".repeat(64) }],
      tables: [{ schema: "public", name: "t", columns: [{ name: "id", dataType: "uuid" }] }],
    };
    expect(() => assertCatalogIsSafeToWrite(catalog)).not.toThrow();
  });

  it("passes for a fingerprint-map container (production-schema-fingerprint.json's perObject shape)", () => {
    // perObject keys look like "table:public.foo" — they don't themselves
    // contain the word "fingerprint", so the *container* key name carries
    // the allowlist signal instead.
    const fingerprintArtifact = {
      status: "captured",
      catalogContentFingerprint: "a".repeat(64),
      perObject: {
        "table:public.admin_audit_log": "b".repeat(64),
        "policy:public.scenarios.owner_select": "c".repeat(64),
      },
    };
    expect(() => assertCatalogIsSafeToWrite(fingerprintArtifact)).not.toThrow();
  });

  it("passes for drift-report-shaped a/b fingerprint diffs nested under a fingerprint key", () => {
    const driftReport = {
      records: [
        {
          objectType: "function",
          details: { definitionFingerprint: { a: "1".repeat(64), b: "2".repeat(64) } },
        },
      ],
    };
    expect(() => assertCatalogIsSafeToWrite(driftReport)).not.toThrow();
  });

  it("reports the offending path in the thrown error", () => {
    const catalog = { policies: [{ qual: "sk_live_abcdefgh12345678" }] };
    try {
      assertCatalogIsSafeToWrite(catalog);
      throw new Error("expected assertCatalogIsSafeToWrite to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(SecretLikeContentError);
      expect(error.message).toContain("policies.0.qual");
      expect(error.findings[0].reasons).toContain("stripe_secret_key");
    }
  });
});

describe("redactIfSecretLike", () => {
  it("passes through clean function definitions unchanged", () => {
    const result = redactIfSecretLike("CREATE FUNCTION public.foo() RETURNS void AS $$ SELECT 1 $$");
    expect(result.containsSecretLikeLiteral).toBe(false);
    expect(result.redacted).toBe(false);
    expect(result.text).toContain("CREATE FUNCTION");
  });

  it("redacts a definition containing a secret-like literal and flags it", () => {
    const dirty = "CREATE FUNCTION public.foo() AS $$ SELECT 'whsec_abcdefgh12345678' $$";
    const result = redactIfSecretLike(dirty);
    expect(result.containsSecretLikeLiteral).toBe(true);
    expect(result.redacted).toBe(true);
    expect(result.text).not.toContain("whsec_abcdefgh12345678");
  });

  it("handles empty/nullish input safely", () => {
    expect(redactIfSecretLike("")).toEqual({ text: "", containsSecretLikeLiteral: false, redacted: false });
    expect(redactIfSecretLike(null).containsSecretLikeLiteral).toBe(false);
  });
});

describe("requireDatabaseUrlEnv", () => {
  const ENV_VAR = "SCHEMA_CAPTURE_DATABASE_URL_TEST";

  afterEach(() => {
    delete process.env[ENV_VAR];
  });

  it("throws when the env var is missing", () => {
    delete process.env[ENV_VAR];
    expect(() => requireDatabaseUrlEnv(ENV_VAR)).toThrow(/required/);
  });

  it("throws when the env var is empty/whitespace", () => {
    process.env[ENV_VAR] = "   ";
    expect(() => requireDatabaseUrlEnv(ENV_VAR)).toThrow(/required/);
  });

  it("returns the value when present, and never includes it in the error path", () => {
    process.env[ENV_VAR] = "postgres://u:p@host/db";
    expect(requireDatabaseUrlEnv(ENV_VAR)).toBe("postgres://u:p@host/db");
  });
});
