/**
 * Allowlisted browser origins for Checkout / Portal return URLs.
 *
 * Matching is exact-string only (see `resolveAppOrigin` below) — no prefix,
 * suffix, or substring matching. This intentionally rejects lookalike /
 * deceptive-suffix origins (e.g. `https://app.settlerate.com.evil.example`)
 * that would pass a naive `startsWith` / `includes` check.
 *
 * The obsolete Lovable preview origin (`https://vpcxzbaxhpucvevnkalo.lovable.app`)
 * was removed in Phase 8.1 Epic 2 PR 2 (ADR 0002) as it is no longer used.
 */
const ALLOWED_ORIGINS = [
  "https://app.settlerate.com",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8080",
] as const;

/** Canonical production application origin used when request Origin is absent or not allowlisted. */
export const DEFAULT_APP_ORIGIN = "https://app.settlerate.com";

export function resolveAppOrigin(req: Request): string {
  const origin = req.headers.get("origin");
  if (origin && (ALLOWED_ORIGINS as readonly string[]).includes(origin)) {
    return origin;
  }
  return DEFAULT_APP_ORIGIN;
}
