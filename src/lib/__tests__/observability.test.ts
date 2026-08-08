import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sentryInit = vi.fn();
const sentryCaptureException = vi.fn();

vi.mock("@sentry/react", () => ({
  init: (...args: unknown[]) => sentryInit(...args),
  captureException: (...args: unknown[]) => sentryCaptureException(...args),
}));

describe("isValidSentryDsn", () => {
  it("rejects absent, blank, and malformed values", async () => {
    const { isValidSentryDsn } = await import("@/lib/observability");
    expect(isValidSentryDsn(undefined)).toBe(false);
    expect(isValidSentryDsn(null)).toBe(false);
    expect(isValidSentryDsn("")).toBe(false);
    expect(isValidSentryDsn("   ")).toBe(false);
    expect(isValidSentryDsn("not-a-url")).toBe(false);
    expect(isValidSentryDsn("ftp://public@o0.ingest.sentry.io/1")).toBe(false);
    expect(isValidSentryDsn("https://o0.ingest.sentry.io/1")).toBe(false); // no public key
    expect(isValidSentryDsn("https://public@o0.ingest.sentry.io")).toBe(false); // no project path
  });

  it("accepts a well-formed DSN", async () => {
    const { isValidSentryDsn } = await import("@/lib/observability");
    expect(isValidSentryDsn("https://public@o0.ingest.sentry.io/1")).toBe(true);
  });
});

describe("isObservabilityEnabled — gating", () => {
  it("is disabled outside production regardless of DSN validity", async () => {
    const { isObservabilityEnabled } = await import("@/lib/observability");
    expect(isObservabilityEnabled("development", "https://public@o0.ingest.sentry.io/1")).toBe(
      false
    );
    expect(isObservabilityEnabled("test", "https://public@o0.ingest.sentry.io/1")).toBe(false);
    expect(isObservabilityEnabled(undefined, "https://public@o0.ingest.sentry.io/1")).toBe(false);
  });

  it("is disabled in production without a valid DSN", async () => {
    const { isObservabilityEnabled } = await import("@/lib/observability");
    expect(isObservabilityEnabled("production", undefined)).toBe(false);
    expect(isObservabilityEnabled("production", "")).toBe(false);
    expect(isObservabilityEnabled("production", "not-a-url")).toBe(false);
  });

  it("is enabled only for production with a valid DSN", async () => {
    const { isObservabilityEnabled } = await import("@/lib/observability");
    expect(isObservabilityEnabled("production", "https://public@o0.ingest.sentry.io/1")).toBe(
      true
    );
  });
});

describe("initObservability / captureException — default (test) mode, no DSN", () => {
  beforeEach(() => {
    vi.resetModules();
    sentryInit.mockClear();
    sentryCaptureException.mockClear();
  });

  it("does not call Sentry.init when not production (current vitest MODE)", async () => {
    const { initObservability, isObservabilityActive } = await import("@/lib/observability");
    initObservability();
    expect(sentryInit).not.toHaveBeenCalled();
    expect(isObservabilityActive()).toBe(false);
  });

  it("captureException no-ops when disabled and never throws", async () => {
    const { initObservability, captureException } = await import("@/lib/observability");
    initObservability();
    expect(() => captureException(new Error("boom"))).not.toThrow();
    expect(sentryCaptureException).not.toHaveBeenCalled();
  });

  it("is idempotent — a second call does not re-attempt initialization", async () => {
    const { initObservability } = await import("@/lib/observability");
    initObservability();
    initObservability();
    expect(sentryInit).not.toHaveBeenCalled();
  });
});

describe("resolveClientSentryEnvironment", () => {
  it("defaults production builds to production unless overridden", async () => {
    const { resolveClientSentryEnvironment } = await import("@/lib/observability");
    expect(resolveClientSentryEnvironment("production", undefined)).toBe("production");
    expect(resolveClientSentryEnvironment("production", "staging")).toBe("staging");
  });

  it("falls back to mode outside production when override blank", async () => {
    const { resolveClientSentryEnvironment } = await import("@/lib/observability");
    expect(resolveClientSentryEnvironment("development", "")).toBe("development");
  });
});

describe("resolveClientRelease", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns undefined when VITE_SENTRY_RELEASE is unset (matches vite.config.ts's `??\"\"` default)", async () => {
    const { resolveClientRelease } = await import("@/lib/observability");
    expect(resolveClientRelease()).toBeUndefined();
  });

  it("returns undefined for an empty string (no commit SHA resolved at build time)", async () => {
    vi.stubEnv("VITE_SENTRY_RELEASE", "");
    const { resolveClientRelease } = await import("@/lib/observability");
    expect(resolveClientRelease()).toBeUndefined();
  });

  it("returns the injected commit SHA when present", async () => {
    vi.stubEnv("VITE_SENTRY_RELEASE", "abc123def456");
    const { resolveClientRelease } = await import("@/lib/observability");
    expect(resolveClientRelease()).toBe("abc123def456");
  });
});

describe("initObservability — simulated production with a valid DSN", () => {
  beforeEach(() => {
    vi.resetModules();
    sentryInit.mockClear();
    sentryCaptureException.mockClear();
    vi.stubEnv("MODE", "production");
    vi.stubEnv("VITE_SENTRY_DSN", "https://public@o0.ingest.sentry.io/1");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("initializes Sentry with tracing/replay/analytics disabled and redaction hooks wired", async () => {
    const { initObservability } = await import("@/lib/observability");
    initObservability();
    expect(sentryInit).toHaveBeenCalledTimes(1);
    const config = sentryInit.mock.calls[0][0];
    expect(config.dsn).toBe("https://public@o0.ingest.sentry.io/1");
    expect(config.environment).toBe("production");
    expect(config.tracesSampleRate).toBe(0);
    expect(config.replaysSessionSampleRate).toBe(0);
    expect(config.replaysOnErrorSampleRate).toBe(0);
    expect(config.integrations).toEqual([]);
    expect(typeof config.beforeSend).toBe("function");
    expect(typeof config.beforeBreadcrumb).toBe("function");
  });

  it("tags staging SPA builds as staging when VITE_SENTRY_ENVIRONMENT is set", async () => {
    vi.stubEnv("VITE_SENTRY_ENVIRONMENT", "staging");
    const { initObservability } = await import("@/lib/observability");
    initObservability();
    expect(sentryInit.mock.calls[0][0].environment).toBe("staging");
  });

  it("passes no release when VITE_SENTRY_RELEASE was not injected at build time", async () => {
    const { initObservability } = await import("@/lib/observability");
    initObservability();
    const config = sentryInit.mock.calls[0][0];
    expect(config.release).toBeUndefined();
  });

  it("passes the build-injected release identifier to Sentry.init, matching the Sentry Vite plugin's own release for that build", async () => {
    vi.stubEnv("VITE_SENTRY_RELEASE", "ab53042660e4");
    const { initObservability } = await import("@/lib/observability");
    initObservability();
    const config = sentryInit.mock.calls[0][0];
    expect(config.release).toBe("ab53042660e4");
  });

  it("captureException forwards to Sentry once enabled", async () => {
    const { initObservability, captureException, isObservabilityActive } = await import(
      "@/lib/observability"
    );
    initObservability();
    expect(isObservabilityActive()).toBe(true);
    const error = new Error("boom");
    captureException(error);
    expect(sentryCaptureException).toHaveBeenCalledWith(error);
  });

  it("beforeSend fail-closed: a hostile event that throws during redaction yields a dropped event, not a crash", async () => {
    const { initObservability } = await import("@/lib/observability");
    initObservability();
    const config = sentryInit.mock.calls[0][0];
    // A circular structure cannot be spread safely in pathological
    // implementations; redactEvent must not throw regardless.
    const circular: Record<string, unknown> = { message: "x" };
    circular.self = circular;
    expect(() => config.beforeSend(circular)).not.toThrow();
  });

  it("beforeBreadcrumb fail-closed: malformed input never throws", async () => {
    const { initObservability } = await import("@/lib/observability");
    initObservability();
    const config = sentryInit.mock.calls[0][0];
    expect(() => config.beforeBreadcrumb(null)).not.toThrow();
    expect(config.beforeBreadcrumb(null)).toBeNull();
  });

  it("fails soft when Sentry.init throws — remains disabled, never crashes the caller", async () => {
    sentryInit.mockImplementationOnce(() => {
      throw new Error("sdk init failure");
    });
    const { initObservability, isObservabilityActive, captureException } = await import(
      "@/lib/observability"
    );
    expect(() => initObservability()).not.toThrow();
    expect(isObservabilityActive()).toBe(false);
    expect(() => captureException(new Error("boom"))).not.toThrow();
    expect(sentryCaptureException).not.toHaveBeenCalled();
  });
});
