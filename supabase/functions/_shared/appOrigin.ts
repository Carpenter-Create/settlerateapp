/** Allowlisted browser origins for Checkout / Portal return URLs (exact match only). */
const ALLOWED_ORIGINS = [
  "https://app.settlerate.com",
  "https://vpcxzbaxhpucvevnkalo.lovable.app",
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
