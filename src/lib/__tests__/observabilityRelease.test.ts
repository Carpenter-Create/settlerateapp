import { describe, expect, it } from "vitest";
import { resolveSentryRelease } from "@/lib/observabilityRelease";

describe("resolveSentryRelease — deterministic release resolution", () => {
  it("prefers VERCEL_GIT_COMMIT_SHA when present", () => {
    expect(
      resolveSentryRelease({
        VERCEL_GIT_COMMIT_SHA: "abc123vercel",
        GITHUB_SHA: "def456github",
      })
    ).toBe("abc123vercel");
  });

  it("falls back to GITHUB_SHA when VERCEL_GIT_COMMIT_SHA is absent", () => {
    expect(resolveSentryRelease({ GITHUB_SHA: "def456github" })).toBe("def456github");
  });

  it("falls back to GITHUB_SHA when VERCEL_GIT_COMMIT_SHA is blank", () => {
    expect(
      resolveSentryRelease({ VERCEL_GIT_COMMIT_SHA: "   ", GITHUB_SHA: "def456github" })
    ).toBe("def456github");
  });

  it("returns undefined when neither is set (local development)", () => {
    expect(resolveSentryRelease({})).toBeUndefined();
  });

  it("returns undefined when both are blank", () => {
    expect(resolveSentryRelease({ VERCEL_GIT_COMMIT_SHA: "", GITHUB_SHA: "  " })).toBeUndefined();
  });

  it("trims surrounding whitespace", () => {
    expect(resolveSentryRelease({ VERCEL_GIT_COMMIT_SHA: "  abc123  " })).toBe("abc123");
  });

  it("never hardcodes a value — output depends only on input env", () => {
    const a = resolveSentryRelease({ VERCEL_GIT_COMMIT_SHA: "sha-one" });
    const b = resolveSentryRelease({ VERCEL_GIT_COMMIT_SHA: "sha-two" });
    expect(a).toBe("sha-one");
    expect(b).toBe("sha-two");
    expect(a).not.toBe(b);
  });

  it("ignores unrelated env vars", () => {
    expect(
      resolveSentryRelease({ NODE_ENV: "production", SENTRY_AUTH_TOKEN: "should-not-matter" })
    ).toBeUndefined();
  });
});
