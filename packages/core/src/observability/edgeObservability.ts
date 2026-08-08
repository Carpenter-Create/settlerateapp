/**
 * Deterministic Edge observability helpers.
 *
 * Canonical: `@settlerate/core/edge-observability`
 * Authority: docs/adr/0003-observability-policy.md;
 * docs/adr/0005-shared-package-architecture.md (Epic 5 PR 4).
 *
 * Request-ID generation (`generateRequestId`) remains in the Edge runtime
 * adapter — nondeterministic UUID generation is excluded from core.
 */

import { redactExtra } from "./observabilityRedaction.ts";

/** No-op unless a non-empty SENTRY_DSN secret is configured. Fails closed (absent/blank → disabled). */
export function isEdgeObservabilityEnabled(dsn: string | null | undefined): boolean {
  return typeof dsn === "string" && dsn.trim() !== "";
}

/**
 * Resolve Sentry `environment` tag (ADR 0008 staging separation).
 * Blank/absent configured values fall back to `fallback` (production default).
 */
export function resolveSentryEnvironment(
  configured: string | null | undefined,
  fallback = "production"
): string {
  if (typeof configured !== "string") return fallback;
  const trimmed = configured.trim();
  return trimmed !== "" ? trimmed : fallback;
}

export interface EdgeObservabilityContext {
  function_name: string;
  request_id: string;
  [key: string]: unknown;
}

/**
 * Builds the allowlisted `extra` payload attached to a captured exception.
 * Delegates to the shared redaction policy so Edge Functions apply the same
 * fail-closed scrubbing as the client.
 */
export function buildEdgeExtra(context: EdgeObservabilityContext): Record<string, unknown> {
  return redactExtra(context);
}
