/**
 * Final architecture proof for observability redaction package import.
 * Full behavioral coverage: packages/core/src/observability/observabilityRedaction.test.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { redactEvent, scrubString } from "@settlerate/core/observability-redaction";

describe("observabilityRedaction canonical package import", () => {
  it("resolves redaction via @settlerate/core/observability-redaction", () => {
    expect(scrubString("a@b.co")).toBe("[REDACTED]");
    expect(
      redactEvent({
        message: "ok",
        extra: { user_id: "u1", secret: "nope" },
      })?.extra
    ).toEqual({ user_id: "u1" });
  });

  it("obsolete pure shims are deleted", () => {
    const root = process.cwd();
    expect(existsSync(join(root, "src/lib/observabilityRedaction.ts"))).toBe(false);
    expect(
      existsSync(join(root, "supabase/functions/_shared/observabilityRedaction.ts"))
    ).toBe(false);
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
