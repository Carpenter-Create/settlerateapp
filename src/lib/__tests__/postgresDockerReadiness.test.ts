import { describe, expect, it } from "vitest";
import {
  DEFAULT_READINESS,
  buildPgIsreadyCommand,
  buildPsqlProbeCommand,
  formatReadinessFailure,
  shouldRetryReadiness,
} from "../../../scripts/lib/postgresDockerReadiness.mjs";

describe("postgresDockerReadiness", () => {
  it("retries until the final attempt", () => {
    expect(shouldRetryReadiness(0, 3)).toBe(true);
    expect(shouldRetryReadiness(1, 3)).toBe(true);
    expect(shouldRetryReadiness(2, 3)).toBe(false);
  });

  it("builds pg_isready and psql probe commands", () => {
    expect(buildPgIsreadyCommand("settlerate-entitlement-test", "postgres")).toBe(
      "docker exec settlerate-entitlement-test pg_isready -U postgres -d postgres"
    );
    expect(buildPsqlProbeCommand("settlerate-entitlement-test", "postgres")).toContain(
      "SELECT 1"
    );
  });

  it("formats readiness failure with timeout and logs", () => {
    const message = formatReadinessFailure({
      containerName: "settlerate-entitlement-test",
      maxAttempts: DEFAULT_READINESS.maxAttempts,
      intervalMs: DEFAULT_READINESS.intervalMs,
      lastError: "connection refused",
      logs: "postgres: ready",
    });
    expect(message).toMatch(/did not become ready within 60s/);
    expect(message).toMatch(/connection refused/);
    expect(message).toMatch(/postgres: ready/);
  });
});
