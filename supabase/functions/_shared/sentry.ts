/**
 * Edge Function Sentry wiring — Phase 8.1 Epic 3 (ADR 0003).
 *
 * Deno-only (uses an `npm:` specifier import), so this file is never
 * imported by the Node/vitest test suite. Its logic is intentionally thin:
 * all decision/redaction logic lives in the portable, unit-tested
 * `./observability.ts` adapter and `@settlerate/core/observability-redaction`
 * — this file only wires the Sentry Deno SDK to those helpers.
 *
 * Inert by construction: `initEdgeSentry` and `captureEdgeException` are
 * both no-ops whenever `SENTRY_DSN` is absent/blank
 * (`isEdgeObservabilityEnabled`), independent of whatever the Sentry SDK
 * itself does with an undefined DSN. No request/response bodies, raw
 * headers, cookies, or Authorization values are ever passed to Sentry.
 *
 * Reference: https://supabase.com/docs/guides/functions/examples/sentry-monitoring
 */
import * as Sentry from "npm:@sentry/deno@^8";
import { buildEdgeExtra, generateRequestId, isEdgeObservabilityEnabled } from "./observability.ts";
import { redactBreadcrumb, redactEvent } from "@settlerate/core/observability-redaction";

let initializedForDsn: string | null = null;

/**
 * Idempotent, fail-soft. Safe to call on every cold start with whatever
 * `Deno.env.get("SENTRY_DSN")` returns, including `undefined`.
 */
export function initEdgeSentry(dsn: string | null | undefined, environment = "production"): void {
  if (!isEdgeObservabilityEnabled(dsn)) return;
  if (initializedForDsn === dsn) return;

  try {
    Sentry.init({
      dsn,
      environment,
      // No auto-instrumentation: prevents automatic request/response,
      // console, or fetch breadcrumbs from ever being generated.
      defaultIntegrations: false,
      tracesSampleRate: 0,
      beforeSend: (event: unknown) => redactEvent(event as never) as never,
      beforeBreadcrumb: (breadcrumb: unknown) => redactBreadcrumb(breadcrumb as never) as never,
    });
    initializedForDsn = dsn ?? null;
  } catch {
    // Fail soft — observability must never break request handling.
  }
}

/**
 * Captures an exception already represented as an error/failure branch.
 * No-ops when observability is disabled. `context` must contain only
 * approved opaque identifiers (see docs/adr/0003-observability-policy.md
 * §4); it is additionally allowlist-filtered by `buildEdgeExtra` before
 * being attached.
 */
export function captureEdgeException(
  error: unknown,
  dsn: string | null | undefined,
  context: { function_name: string; request_id?: string; [key: string]: unknown }
): void {
  if (!isEdgeObservabilityEnabled(dsn)) return;
  try {
    const requestId = context.request_id ?? generateRequestId();
    Sentry.captureException(error, {
      extra: buildEdgeExtra({ ...context, request_id: requestId }),
    });
  } catch {
    // Never let observability capture crash the caller.
  }
}
