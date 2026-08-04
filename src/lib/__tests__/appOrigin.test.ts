import { describe, expect, it } from "vitest";
import {
  DEFAULT_APP_ORIGIN,
  resolveAppOrigin,
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

describe("resolveAppOrigin", () => {
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
