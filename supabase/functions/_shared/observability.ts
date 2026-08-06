/**
 * Portable observability core for Supabase Edge Functions — Phase 8.1
 * Epic 3 (ADR 0003).
 *
 * Contains no Deno-specific globals and no remote/`npm:` imports, so it can
 * be unit tested directly under vitest (see
 * src/lib/__tests__/edgeObservability.test.ts), mirroring the pattern used
 * by supabase/functions/_shared/appOrigin.ts and
 * supabase/functions/_shared/checkoutMaintenance.ts.
 *
 * The actual Sentry Deno SDK wiring (which requires an `npm:` specifier
 * import and therefore cannot load under Node/vitest) lives in
 * supabase/functions/_shared/sentry.ts and calls into these pure helpers.
 */

import { redactExtra } from "./observabilityRedaction.ts";

/** No-op unless a non-empty SENTRY_DSN secret is configured. Fails closed (absent/blank → disabled). */
export function isEdgeObservabilityEnabled(dsn: string | null | undefined): boolean {
  return typeof dsn === "string" && dsn.trim() !== "";
}

/** Correlation identifier for a single function invocation. */
export function generateRequestId(): string {
  return crypto.randomUUID();
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
