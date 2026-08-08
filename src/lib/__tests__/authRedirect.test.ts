import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_APP_ORIGIN,
  buildAuthRedirectUrl,
  resolveAuthOrigin,
} from "@/lib/authRedirect";

describe("resolveAuthOrigin", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the production default when unset", () => {
    expect(resolveAuthOrigin(undefined)).toBe(DEFAULT_APP_ORIGIN);
    expect(resolveAuthOrigin(null)).toBe(DEFAULT_APP_ORIGIN);
  });

  it("uses the production default for a blank value", () => {
    expect(resolveAuthOrigin("")).toBe(DEFAULT_APP_ORIGIN);
    expect(resolveAuthOrigin("   ")).toBe(DEFAULT_APP_ORIGIN);
  });

  it("uses the production default for a malformed value", () => {
    expect(resolveAuthOrigin("not-a-url")).toBe(DEFAULT_APP_ORIGIN);
    expect(resolveAuthOrigin("://///")).toBe(DEFAULT_APP_ORIGIN);
  });

  it("uses the production default for a non-http(s) value", () => {
    expect(resolveAuthOrigin("ftp://localhost:5173")).toBe(DEFAULT_APP_ORIGIN);
    expect(resolveAuthOrigin("file:///etc/passwd")).toBe(DEFAULT_APP_ORIGIN);
  });

  it("uses the production default for an unapproved (but well-formed) origin", () => {
    expect(resolveAuthOrigin("https://evil.example")).toBe(DEFAULT_APP_ORIGIN);
    expect(resolveAuthOrigin("https://settlerate-app-staging.vercel.app")).toBe(
      DEFAULT_APP_ORIGIN
    );
    expect(resolveAuthOrigin("http://localhost:3000")).toBe(DEFAULT_APP_ORIGIN);
  });

  it("accepts the approved staging origin exactly", () => {
    expect(resolveAuthOrigin("https://staging.settlerate.com")).toBe(
      "https://staging.settlerate.com"
    );
  });

  it("rejects lookalike / deceptive-suffix production origins", () => {
    expect(resolveAuthOrigin("https://app.settlerate.com.evil.example")).toBe(
      DEFAULT_APP_ORIGIN
    );
    expect(resolveAuthOrigin("https://app.settlerate.com.attacker.test")).toBe(
      DEFAULT_APP_ORIGIN
    );
    expect(resolveAuthOrigin("https://settlerate.com")).toBe(DEFAULT_APP_ORIGIN);
  });

  it("accepts each approved localhost and 127.0.0.1 origin exactly", () => {
    expect(resolveAuthOrigin("http://localhost:5173")).toBe("http://localhost:5173");
    expect(resolveAuthOrigin("http://localhost:8080")).toBe("http://localhost:8080");
    expect(resolveAuthOrigin("http://127.0.0.1:5173")).toBe("http://127.0.0.1:5173");
    expect(resolveAuthOrigin("http://127.0.0.1:8080")).toBe("http://127.0.0.1:8080");
  });

  it("rejects an approved local origin with a trailing slash (exact match only, no normalization on input)", () => {
    expect(resolveAuthOrigin("http://localhost:5173/")).toBe(DEFAULT_APP_ORIGIN);
  });

  it("rejects a substring or prefix match against an approved local origin", () => {
    expect(resolveAuthOrigin("http://localhost:51730")).toBe(DEFAULT_APP_ORIGIN);
    expect(resolveAuthOrigin("http://localhost")).toBe(DEFAULT_APP_ORIGIN);
  });

  it("never reads window.location — hostile global window values do not affect output", () => {
    vi.stubGlobal("window", {
      location: {
        origin: "https://evil.example",
        href: "https://evil.example/pwn",
        hostname: "evil.example",
      },
    });

    expect(resolveAuthOrigin(undefined)).toBe(DEFAULT_APP_ORIGIN);
    expect(resolveAuthOrigin("http://localhost:5173")).toBe("http://localhost:5173");
    expect(resolveAuthOrigin("https://evil.example")).toBe(DEFAULT_APP_ORIGIN);
  });
});

describe("buildAuthRedirectUrl", () => {
  it("constructs the exact default production signup/magic-link redirect URL", () => {
    expect(buildAuthRedirectUrl(DEFAULT_APP_ORIGIN, "/app/scenarios")).toBe(
      "https://app.settlerate.com/app/scenarios"
    );
  });

  it("constructs the exact default production password-reset redirect URL", () => {
    expect(buildAuthRedirectUrl(DEFAULT_APP_ORIGIN, "/reset-password/confirm")).toBe(
      "https://app.settlerate.com/reset-password/confirm"
    );
  });

  it("normalizes a trailing slash on the origin", () => {
    expect(buildAuthRedirectUrl("https://app.settlerate.com/", "/app/scenarios")).toBe(
      "https://app.settlerate.com/app/scenarios"
    );
  });

  it("normalizes multiple trailing slashes on the origin", () => {
    expect(buildAuthRedirectUrl("https://app.settlerate.com///", "/app/scenarios")).toBe(
      "https://app.settlerate.com/app/scenarios"
    );
  });

  it("accepts a path without a leading slash", () => {
    expect(buildAuthRedirectUrl(DEFAULT_APP_ORIGIN, "app/scenarios")).toBe(
      "https://app.settlerate.com/app/scenarios"
    );
  });

  it("builds correct redirect URLs for approved local-development origins", () => {
    expect(buildAuthRedirectUrl("http://localhost:5173", "/app/scenarios")).toBe(
      "http://localhost:5173/app/scenarios"
    );
    expect(buildAuthRedirectUrl("http://127.0.0.1:8080", "/reset-password/confirm")).toBe(
      "http://127.0.0.1:8080/reset-password/confirm"
    );
  });
});

describe("auth redirect origin + URL composition (end-to-end of the two exports)", () => {
  it("resolves to the exact current production URLs by default, matching the three auth call sites", () => {
    const origin = resolveAuthOrigin(undefined);
    expect(buildAuthRedirectUrl(origin, "/app/scenarios")).toBe(
      "https://app.settlerate.com/app/scenarios"
    );
    expect(buildAuthRedirectUrl(origin, "/reset-password/confirm")).toBe(
      "https://app.settlerate.com/reset-password/confirm"
    );
  });
});
