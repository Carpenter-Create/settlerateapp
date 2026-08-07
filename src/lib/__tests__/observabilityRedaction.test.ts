/**
 * Compatibility + source-of-truth proof for observability redaction shims.
 * Full behavioral coverage: packages/core/src/observability/observabilityRedaction.test.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { redactEvent, scrubString } from "@/lib/observabilityRedaction";

function stripTsComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .trim();
}

function assertPureReExport(filePath: string, expectedFrom: string): void {
  const body = stripTsComments(readFileSync(filePath, "utf8"));
  const match = /^export\s+\*\s+from\s+["']([^"']+)["']\s*;?\s*$/.exec(body);
  expect(match, `${filePath} must be a pure re-export`).not.toBeNull();
  expect(match?.[1]).toBe(expectedFrom);
}

describe("observabilityRedaction app compatibility shim", () => {
  it("resolves redaction via @/lib re-export", () => {
    expect(scrubString("a@b.co")).toBe("[REDACTED]");
    expect(
      redactEvent({
        message: "ok",
        extra: { user_id: "u1", secret: "nope" },
      })?.extra
    ).toEqual({ user_id: "u1" });
  });

  it("app and Edge paths are pure re-export shims to canonical core", () => {
    const root = process.cwd();
    assertPureReExport(
      join(root, "src/lib/observabilityRedaction.ts"),
      "@settlerate/core/observability-redaction"
    );
    assertPureReExport(
      join(root, "supabase/functions/_shared/observabilityRedaction.ts"),
      "../../../packages/core/src/observability/observabilityRedaction.ts"
    );
  });

  it("canonical module contains redaction business logic", () => {
    const canonical = readFileSync(
      join(process.cwd(), "packages/core/src/observability/observabilityRedaction.ts"),
      "utf8"
    );
    expect(canonical).toContain("export function redactEvent");
    expect(canonical).toContain("export function redactBreadcrumb");
    expect(canonical).not.toMatch(/^export\s+\*\s+from/m);
  });
});
