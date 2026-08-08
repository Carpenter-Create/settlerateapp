/**
 * Pure application-origin allowlist policy for Checkout / Portal return URLs.
 *
 * Canonical: `@settlerate/core/app-origin`
 * Authority: docs/adr/0002-secrets-and-environment-policy.md;
 * docs/adr/0005-shared-package-architecture.md (Epic 5 PR 4);
 * docs/adr/0008-environment-topology.md (Epic 7 staging origin).
 *
 * Matching is exact-string only — no prefix, suffix, or substring matching.
 * This intentionally rejects lookalike / deceptive-suffix origins
 * (e.g. `https://app.settlerate.com.evil.example`).
 *
 * The obsolete Lovable preview origin
 * (`https://vpcxzbaxhpucvevnkalo.lovable.app`) was removed in Phase 8.1
 * Epic 2 PR 2 (ADR 0002) and must not be restored.
 *
 * Header reading from the incoming HTTP request stays in the Edge adapter
 * (`resolveAppOrigin`).
 */

const ALLOWED_ORIGINS = [
  "https://app.settlerate.com",
  "https://staging.settlerate.com",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8080",
] as const;

/** Canonical production application origin used when Origin is absent or not allowlisted. */
export const DEFAULT_APP_ORIGIN = "https://app.settlerate.com";

/**
 * Resolve an allowlisted origin from an already-read Origin header value.
 * Null, undefined, empty, and non-allowlisted values fall back to
 * {@link DEFAULT_APP_ORIGIN}.
 */
export function resolveAppOriginFromOriginHeader(
  origin: string | null | undefined
): string {
  if (origin && (ALLOWED_ORIGINS as readonly string[]).includes(origin)) {
    return origin;
  }
  return DEFAULT_APP_ORIGIN;
}
