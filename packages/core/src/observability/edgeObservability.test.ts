import { describe, expect, it } from "vitest";
import {
  buildEdgeExtra,
  isEdgeObservabilityEnabled,
} from "@settlerate/core/edge-observability";
import * as edgeObservability from "@settlerate/core/edge-observability";

describe("isEdgeObservabilityEnabled", () => {
  it("is disabled when the DSN is absent, null, empty, or whitespace", () => {
    expect(isEdgeObservabilityEnabled(undefined)).toBe(false);
    expect(isEdgeObservabilityEnabled(null)).toBe(false);
    expect(isEdgeObservabilityEnabled("")).toBe(false);
    expect(isEdgeObservabilityEnabled("   ")).toBe(false);
  });

  it("is enabled for any non-blank DSN string", () => {
    expect(isEdgeObservabilityEnabled("https://public@o0.ingest.sentry.io/1")).toBe(true);
  });
});

describe("buildEdgeExtra", () => {
  it("keeps approved identifiers and drops prohibited fields via redaction", () => {
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

describe("edge-observability core architecture boundary", () => {
  it("does not export generateRequestId", () => {
    expect(
      Object.prototype.hasOwnProperty.call(edgeObservability, "generateRequestId")
    ).toBe(false);
    expect("generateRequestId" in edgeObservability).toBe(false);
  });
});
