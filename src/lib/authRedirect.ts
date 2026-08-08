/**
 * Environment-aware application origin resolution for Supabase Auth email
 * redirects (signup confirmation, magic-link login, password reset).
 *
 * Authority: docs/adr/0002-secrets-and-environment-policy.md §3;
 * docs/adr/0008-environment-topology.md (Epic 7 staging origin).
 *
 * Design constraints (do not weaken without a new ADR decision):
 * - Production always resolves to DEFAULT_APP_ORIGIN unless VITE_APP_ORIGIN
 *   is explicitly set to one of the approved non-production origins below
 *   (local development or staging).
 * - Matching is exact-string only — no prefix, suffix, substring, wildcard,
 *   or regex matching. This mirrors `@settlerate/core/app-origin` and
 *   intentionally rejects lookalike/deceptive-suffix origins.
 * - This module never reads `window.location.origin`. Auth redirect targets
 *   must not accept arbitrary runtime origins (open-redirect risk) — the
 *   only inputs are the build-time `VITE_APP_ORIGIN` value and the hardcoded
 *   default.
 * - Fails safe, not open: any unset/blank/malformed/non-http(s)/unapproved
 *   value falls back to DEFAULT_APP_ORIGIN rather than throwing or passing
 *   the value through, so auth never breaks due to local misconfiguration.
 *
 * Kept pure (accepts the raw env value as an argument) so it stays
 * independently unit-testable, matching the pattern in
 * `@settlerate/core/checkout-maintenance`, `src/lib/edgeFunctionUrl.ts`, and
 * `src/lib/clientEnv.ts`.
 */

/** Canonical production application origin used whenever VITE_APP_ORIGIN is absent or not an approved non-production origin. */
export const DEFAULT_APP_ORIGIN = "https://app.settlerate.com";

/**
 * Approved non-production origins for `VITE_APP_ORIGIN` (exact match only).
 * Staging custom domain is listed per ADR 0008; arbitrary `*.vercel.app`
 * hosts are intentionally NOT accepted (must be added as exact entries if
 * used before DNS exists).
 */
const APPROVED_NON_PRODUCTION_ORIGINS = [
  "https://staging.settlerate.com",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8080",
] as const;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

/**
 * Resolves the application origin to use for auth email redirects.
 *
 * `rawEnvOrigin` should be `import.meta.env.VITE_APP_ORIGIN` — never
 * `window.location.origin`. Returns `DEFAULT_APP_ORIGIN` unless the value is
 * an exact string match for one of `APPROVED_NON_PRODUCTION_ORIGINS`. Because
 * approval requires exact equality against a fixed allowlist (not URL
 * parsing or protocol inspection), unset, blank, malformed, non-http(s), and
 * lookalike/deceptive-suffix values are all rejected by construction.
 */
export function resolveAuthOrigin(rawEnvOrigin: string | null | undefined): string {
  if (!isNonEmptyString(rawEnvOrigin)) {
    return DEFAULT_APP_ORIGIN;
  }

  const trimmed = rawEnvOrigin.trim();

  if ((APPROVED_NON_PRODUCTION_ORIGINS as readonly string[]).includes(trimmed)) {
    return trimmed;
  }

  return DEFAULT_APP_ORIGIN;
}

/**
 * Builds a full auth redirect URL from a resolved origin and a path.
 * Normalizes exactly one boundary slash so callers can pass `path` with or
 * without a leading `/`.
 */
export function buildAuthRedirectUrl(origin: string, path: string): string {
  const normalizedOrigin = origin.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedOrigin}${normalizedPath}`;
}
