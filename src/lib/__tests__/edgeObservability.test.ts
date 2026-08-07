/**
 * Edge observability adapter coverage (incl. generateRequestId).
 * Deterministic helpers: packages/core/src/observability/edgeObservability.test.ts
 */
import { describe, expect, it } from "vitest";
import {
  buildEdgeExtra,
  generateRequestId,
  isEdgeObservabilityEnabled,
} from "../../../supabase/functions/_shared/observability";
import * as coreEdgeObs from "@settlerate/core/edge-observability";

describe("isEdgeObservabilityEnabled — no-op without SENTRY_DSN", () => {
  it("is disabled when the DSN is absent, null, or blank", () => {
    expect(isEdgeObservabilityEnabled(undefined)).toBe(false);
    expect(isEdgeObservabilityEnabled(null)).toBe(false);
    expect(isEdgeObservabilityEnabled("")).toBe(false);
    expect(isEdgeObservabilityEnabled("   ")).toBe(false);
  });

  it("is enabled for any non-blank DSN string", () => {
    expect(isEdgeObservabilityEnabled("https://public@o0.ingest.sentry.io/1")).toBe(true);
  });
});

describe("generateRequestId — correlation ID generation", () => {
  it("returns a well-formed UUID", () => {
    const id = generateRequestId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it("generates a fresh ID on every call", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateRequestId()));
    expect(ids.size).toBe(20);
  });

  it("remains runtime-only (absent from core edge-observability)", () => {
    expect(
      Object.prototype.hasOwnProperty.call(coreEdgeObs, "generateRequestId")
    ).toBe(false);
    expect(typeof generateRequestId).toBe("function");
  });
});

describe("buildEdgeExtra — edge redaction behavior", () => {
  it("keeps approved identifiers and drops prohibited fields", () => {
    const result = buildEdgeExtra({
      function_name: "create-checkout",
      request_id: "req-1",
      user_id: "u1",
      price_id: "price_123",
      customerEmail: "jane@example.com",
      loanAmount: 400000,
    });
    expect(result).toEqual({
      function_name: "create-checkout",
      request_id: "req-1",
      user_id: "u1",
      price_id: "price_123",
    });
    expect(result).not.toHaveProperty("customerEmail");
    expect(result).not.toHaveProperty("loanAmount");
  });
});
