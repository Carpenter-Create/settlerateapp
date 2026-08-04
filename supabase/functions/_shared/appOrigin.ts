/** Allowlisted browser origins for Checkout / Portal return URLs. */
const ALLOWED_ORIGINS = [
  "https://vpcxzbaxhpucvevnkalo.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8080",
] as const;

const DEFAULT_ORIGIN = ALLOWED_ORIGINS[0];

export function resolveAppOrigin(req: Request): string {
  const origin = req.headers.get("origin");
  if (origin && (ALLOWED_ORIGINS as readonly string[]).includes(origin)) {
    return origin;
  }
  return DEFAULT_ORIGIN;
}
