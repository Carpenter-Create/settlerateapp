/**
 * Client Sentry foundation — Phase 8.1 Epic 3 (ADR 0003).
 *
 * Inert by default: this module only sends events when running a
 * production build (`import.meta.env.MODE === "production"`) with a
 * structurally valid `VITE_SENTRY_DSN`. Any failure during initialization
 * or capture is caught and swallowed — observability must never break the
 * application (fail soft, not fail open). Local development never sends
 * events, regardless of whether a DSN happens to be configured.
 *
 * Scope (ADR 0003 §1): errors and exceptions only. No session replay, no
 * product analytics, no advertising tracking, no performance tracing, no
 * request/response body capture. `defaultIntegrations`/`integrations: []`
 * plus `beforeSend`/`beforeBreadcrumb` redaction hooks (fail-closed) are
 * the enforcement points — see `@settlerate/core/observability-redaction`.
 */
import * as Sentry from "@sentry/react";
import { resolveSentryEnvironment } from "@settlerate/core/edge-observability";
import { redactBreadcrumb, redactEvent } from "@settlerate/core/observability-redaction";

/** Minimal structural validation — not full DSN-format verification, just enough to reject empty/garbage values. */
export function isValidSentryDsn(dsn: string | null | undefined): boolean {
  if (typeof dsn !== "string" || dsn.trim() === "") return false;
  try {
    const url = new URL(dsn.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (!url.username) return false;
    if (!url.pathname || url.pathname === "/") return false;
    return true;
  } catch {
    return false;
  }
}

/** Production-only, valid-DSN-only gate. Local development never enables Sentry. */
export function isObservabilityEnabled(
  mode: string | null | undefined,
  dsn: string | null | undefined
): boolean {
  return mode === "production" && isValidSentryDsn(dsn);
}

/**
 * Reads the release identifier injected by `vite.config.ts`
 * (`src/lib/observabilityRelease.ts`) into `VITE_SENTRY_RELEASE`. Returns
 * `undefined` — never a hardcoded value — when no build-time commit SHA
 * was available (e.g. local dev), matching the Sentry Vite plugin's own
 * release configuration for that same build.
 */
export function resolveClientRelease(): string | undefined {
  const value = import.meta.env.VITE_SENTRY_RELEASE;
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

/**
 * Staging builds are Vite `MODE === "production"` but must not tag Sentry as
 * production. Set `VITE_SENTRY_ENVIRONMENT=staging` on the staging SPA.
 * Authority: docs/adr/0008-environment-topology.md.
 */
export function resolveClientSentryEnvironment(
  mode: string | null | undefined,
  configured: string | null | undefined = import.meta.env.VITE_SENTRY_ENVIRONMENT
): string {
  const fallback = mode === "production" ? "production" : (mode?.trim() || "development");
  return resolveSentryEnvironment(configured, fallback);
}

let attempted = false;
let enabled = false;

/**
 * Call once, before rendering. Idempotent and fail-soft: safe to call in
 * any environment, with or without a DSN, and will never throw.
 */
export function initObservability(): void {
  if (attempted) return;
  attempted = true;

  const mode: string | undefined = import.meta.env.MODE;
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!isObservabilityEnabled(mode, dsn)) {
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment: resolveClientSentryEnvironment(mode),
      release: resolveClientRelease(),
      integrations: [],
      tracesSampleRate: 0,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      sendClientReports: false,
      beforeSend: (event) => redactEvent(event as never) as never,
      beforeBreadcrumb: (breadcrumb) => redactBreadcrumb(breadcrumb as never) as never,
    });
    enabled = true;
  } catch {
    enabled = false;
  }
}

/** No-op whenever observability is disabled or was never successfully initialized. */
export function captureException(error: unknown): void {
  if (!enabled) return;
  try {
    Sentry.captureException(error);
  } catch {
    // Never let observability capture crash the caller.
  }
}

/** True only after a successful production initialization. Exposed for tests and diagnostics. */
export function isObservabilityActive(): boolean {
  return enabled;
}
