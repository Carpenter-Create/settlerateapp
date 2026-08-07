import { describe, expect, it } from "vitest";
import {
  DEFAULT_APP_ORIGIN,
  resolveAppOriginFromOriginHeader,
} from "@settlerate/core/app-origin";

describe("resolveAppOriginFromOriginHeader", () => {
  it("allows the canonical production origin", () => {
    expect(resolveAppOriginFromOriginHeader("https://app.settlerate.com")).toBe(
      "https://app.settlerate.com"
    );
  });

  it("allows each approved localhost origin", () => {
    expect(resolveAppOriginFromOriginHeader("http://localhost:5173")).toBe(
      "http://localhost:5173"
    );
    expect(resolveAppOriginFromOriginHeader("http://localhost:8080")).toBe(
      "http://localhost:8080"
    );
  });

  it("allows each approved 127.0.0.1 origin", () => {
    expect(resolveAppOriginFromOriginHeader("http://127.0.0.1:5173")).toBe(
      "http://127.0.0.1:5173"
    );
    expect(resolveAppOriginFromOriginHeader("http://127.0.0.1:8080")).toBe(
      "http://127.0.0.1:8080"
    );
  });

  it("falls back for null, undefined, and empty", () => {
    expect(resolveAppOriginFromOriginHeader(null)).toBe(DEFAULT_APP_ORIGIN);
    expect(resolveAppOriginFromOriginHeader(undefined)).toBe(DEFAULT_APP_ORIGIN);
    expect(resolveAppOriginFromOriginHeader("")).toBe(DEFAULT_APP_ORIGIN);
  });

  it("rejects deceptive suffix, prefix, subdomain, and lookalikes", () => {
    expect(
      resolveAppOriginFromOriginHeader("https://app.settlerate.com.evil.example")
    ).toBe(DEFAULT_APP_ORIGIN);
    expect(
      resolveAppOriginFromOriginHeader("https://evil.app.settlerate.com")
    ).toBe(DEFAULT_APP_ORIGIN);
    expect(resolveAppOriginFromOriginHeader("https://settlerate.com")).toBe(
      DEFAULT_APP_ORIGIN
    );
    expect(
      resolveAppOriginFromOriginHeader("https://app.settlerate.com.attacker.test")
    ).toBe(DEFAULT_APP_ORIGIN);
  });

  it("rejects unsupported ports and arbitrary origins", () => {
    expect(resolveAppOriginFromOriginHeader("http://localhost:3000")).toBe(
      DEFAULT_APP_ORIGIN
    );
    expect(resolveAppOriginFromOriginHeader("https://evil.example")).toBe(
      DEFAULT_APP_ORIGIN
    );
  });

  it("rejects the removed Lovable preview origin", () => {
    expect(
      resolveAppOriginFromOriginHeader("https://vpcxzbaxhpucvevnkalo.lovable.app")
    ).toBe(DEFAULT_APP_ORIGIN);
  });

  it("exports DEFAULT_APP_ORIGIN as production", () => {
    expect(DEFAULT_APP_ORIGIN).toBe("https://app.settlerate.com");
  });
});
