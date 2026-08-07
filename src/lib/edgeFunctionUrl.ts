/**
 * Builds a Supabase Edge Function URL from a validated Supabase project base
 * URL (client config: `VITE_SUPABASE_URL`).
 *
 * This is the single source of truth for client-side Edge Function URL
 * construction — call sites must pass `import.meta.env.VITE_SUPABASE_URL`
 * rather than hardcoding the Supabase project host (Phase 8.1 Epic 2 PR 3,
 * ADR 0002). It reads only the public client base URL and never accepts or
 * exposes service-role keys or other server-side secrets.
 *
 * Kept pure (no direct `import.meta.env` read) so it stays independently
 * unit-testable, matching the pattern in `@settlerate/core/checkout-maintenance`.
 */
export function buildEdgeFunctionUrl(
  baseUrl: string | null | undefined,
  functionName: string
): string {
  if (!baseUrl || baseUrl.trim() === "") {
    throw new Error(
      "VITE_SUPABASE_URL is required to construct an Edge Function URL."
    );
  }

  const trimmed = baseUrl.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`VITE_SUPABASE_URL is malformed: "${baseUrl}"`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`VITE_SUPABASE_URL must use http or https: "${baseUrl}"`);
  }

  // Strip trailing slashes from the original string rather than reserializing
  // the parsed URL, since `new URL(...).toString()` always appends a `/`.
  const normalizedBase = trimmed.replace(/\/+$/, "");
  return `${normalizedBase}/functions/v1/${functionName}`;
}
