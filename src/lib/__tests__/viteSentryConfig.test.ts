import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

/**
 * Static source checks for vite.config.ts's Sentry wiring (Phase 8.1
 * Epic 3 browser symbolication fix). These deliberately inspect the
 * source text rather than execute the config (which would require
 * mocking the Sentry Vite plugin's network-touching internals) — the
 * goal is a fast, reliable guardrail against a secret ever being routed
 * to a VITE_*-prefixed name or the client `define` block, not a full
 * build simulation. The build-verification step (documented in the PR)
 * additionally confirms this against a real built bundle.
 */
describe("vite.config.ts — Sentry secret handling (static checks)", () => {
  const source = readFileSync(join(process.cwd(), "vite.config.ts"), "utf8");

  it("never exposes SENTRY_AUTH_TOKEN (or any secret) under a VITE_-prefixed name", () => {
    expect(source).not.toMatch(/VITE_SENTRY_AUTH_TOKEN/);
    expect(source).not.toMatch(/VITE_[A-Z_]*AUTH_TOKEN/);
    expect(source).not.toMatch(/VITE_SENTRY_ORG/);
    expect(source).not.toMatch(/VITE_SENTRY_PROJECT/);
  });

  it("the client `define` block only injects the resolved release string, never SENTRY_AUTH_TOKEN/ORG/PROJECT", () => {
    const defineBlockMatch = source.match(/define:\s*\{[^}]*\}/s);
    expect(defineBlockMatch).not.toBeNull();
    const defineBlock = defineBlockMatch?.[0] ?? "";
    expect(defineBlock).toMatch(/VITE_SENTRY_RELEASE/);
    expect(defineBlock).not.toMatch(/AUTH_TOKEN/);
    expect(defineBlock).not.toMatch(/SENTRY_ORG/);
    expect(defineBlock).not.toMatch(/SENTRY_PROJECT/);
  });

  it("SENTRY_AUTH_TOKEN is only read from server-side env (env.SENTRY_AUTH_TOKEN), never from import.meta.env", () => {
    expect(source).toMatch(/env\.SENTRY_AUTH_TOKEN/);
    expect(source).not.toMatch(/import\.meta\.env\.SENTRY_AUTH_TOKEN/);
    expect(source).not.toMatch(/import\.meta\.env\.VITE_SENTRY_AUTH_TOKEN/);
  });

  it("keeps hidden source maps and deletes local .map files after upload", () => {
    expect(source).toMatch(/sourcemap:\s*"hidden"/);
    expect(source).toMatch(/filesToDeleteAfterUpload/);
  });

  it("the Sentry Vite plugin release name and the client release define reference the same resolved variable", () => {
    expect(source).toMatch(/const sentryRelease = resolveSentryRelease\(env\)/);
    // Client bundle define:
    expect(source).toMatch(/JSON\.stringify\(sentryRelease/);
    // Plugin release name:
    expect(source).toMatch(/name:\s*sentryRelease/);
  });

  it("disables the plugin's own release auto-detection/global-injection (single source of truth)", () => {
    expect(source).toMatch(/inject:\s*false/);
  });

  it("still fails soft (does not throw/break the build) if source-map upload fails", () => {
    expect(source).toMatch(/errorHandler:/);
  });
});
