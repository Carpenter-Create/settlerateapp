/**
 * Edge adapter compatibility for resolveAppOrigin(Request).
 * Pure origin policy: packages/core/src/origin/appOrigin.test.ts
 */
import { describe, expect, it } from "vitest";
import {
  DEFAULT_APP_ORIGIN,
  resolveAppOrigin,
  resolveAppOriginFromOriginHeader,
} from "../../../supabase/functions/_shared/appOrigin";

function requestWithOrigin(origin: string | null): Request {
  const headers = new Headers();
  if (origin !== null) {
    headers.set("origin", origin);
  }
  return new Request("https://example.invalid/functions/v1/create-checkout", {
    method: "POST",
    headers,
  });
}

describe("resolveAppOrigin Edge adapter", () => {
  it("matches pure header resolution for allowlisted and rejected origins", () => {
    const cases = [
      "https://app.settlerate.com",
      "http://localhost:5173",
      "http://localhost:8080",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:8080",
      "https://evil.example",
      "https://app.settlerate.com.evil.example",
      "https://vpcxzbaxhpucvevnkalo.lovable.app",
      "https://settlerate.com",
      "http://localhost:3000",
      null,
    ] as const;

    for (const origin of cases) {
      const viaRequest = resolveAppOrigin(requestWithOrigin(origin));
      const viaHeader = resolveAppOriginFromOriginHeader(origin);
      expect(viaRequest, String(origin)).toBe(viaHeader);
    }
  });

  it("allows the canonical production origin", () => {
    expect(resolveAppOrigin(requestWithOrigin("https://app.settlerate.com"))).toBe(
      "https://app.settlerate.com"
    );
  });

  it("allows approved local development origins", () => {
    expect(resolveAppOrigin(requestWithOrigin("http://localhost:5173"))).toBe(
      "http://localhost:5173"
    );
    expect(resolveAppOrigin(requestWithOrigin("http://127.0.0.1:8080"))).toBe(
      "http://127.0.0.1:8080"
    );
  });

  it("rejects arbitrary attacker origins", () => {
    expect(resolveAppOrigin(requestWithOrigin("https://evil.example"))).toBe(
      DEFAULT_APP_ORIGIN
    );
    expect(
      resolveAppOrigin(requestWithOrigin("https://app.settlerate.com.evil.example"))
    ).toBe(DEFAULT_APP_ORIGIN);
  });

  it("rejects the removed Lovable preview origin (Epic 2 PR 2 / ADR 0002)", () => {
    expect(
      resolveAppOrigin(requestWithOrigin("https://vpcxzbaxhpucvevnkalo.lovable.app"))
    ).toBe(DEFAULT_APP_ORIGIN);
  });

  it("rejects deceptive suffix and lookalike domains", () => {
    expect(
      resolveAppOrigin(requestWithOrigin("https://app.settlerate.com.attacker.test"))
    ).toBe(DEFAULT_APP_ORIGIN);
    expect(resolveAppOrigin(requestWithOrigin("https://settlerate.com"))).toBe(
      DEFAULT_APP_ORIGIN
    );
    expect(
      resolveAppOrigin(requestWithOrigin("https://app.settlerate.com.evil.example"))
    ).toBe(DEFAULT_APP_ORIGIN);
  });

  it("uses production SettleRate origin as fallback when Origin is missing", () => {
    expect(resolveAppOrigin(requestWithOrigin(null))).toBe("https://app.settlerate.com");
    expect(DEFAULT_APP_ORIGIN).toBe("https://app.settlerate.com");
  });
});
