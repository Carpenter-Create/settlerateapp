/**
 * Fail-fast validation for required public client environment variables.
 *
 * Authority: docs/adr/0002-secrets-and-environment-policy.md (Phase 8.1 Epic 2).
 *
 * `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are PUBLIC client
 * configuration (safe to bundle into the browser) — not secrets. This module
 * never reads or accepts service-role keys, Stripe secrets, or other
 * server-side values; those remain Supabase Edge Function / platform secrets
 * only and must never be introduced here as VITE_* variables.
 *
 * Kept pure (accepts the raw env values as arguments) so it stays
 * independently unit-testable, matching the pattern in
 * `src/lib/checkoutMaintenance.ts` and `src/lib/edgeFunctionUrl.ts`.
 */

export interface ClientEnv {
  supabaseUrl: string;
  supabasePublishableKey: string;
}

export interface RawClientEnv {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validates the required public client env vars and returns them typed.
 * Throws a single, clear configuration error listing every problem found —
 * fail fast with an actionable message rather than surfacing a confusing
 * downstream error (e.g. `@supabase/supabase-js`'s generic
 * "supabaseUrl is required.") later.
 */
export function validateClientEnv(env: RawClientEnv): ClientEnv {
  const problems: string[] = [];

  if (!isNonEmptyString(env.VITE_SUPABASE_URL)) {
    problems.push("VITE_SUPABASE_URL is missing or empty.");
  } else if (!isValidHttpUrl(env.VITE_SUPABASE_URL)) {
    problems.push(`VITE_SUPABASE_URL is malformed: "${env.VITE_SUPABASE_URL}".`);
  }

  if (!isNonEmptyString(env.VITE_SUPABASE_PUBLISHABLE_KEY)) {
    problems.push("VITE_SUPABASE_PUBLISHABLE_KEY is missing or empty.");
  }

  if (problems.length > 0) {
    throw new Error(
      "Invalid client configuration:\n" +
        problems.map((problem) => `  - ${problem}`).join("\n") +
        "\nSet these in .env (see .env.example) or the deployment environment. " +
        "See docs/adr/0002-secrets-and-environment-policy.md."
    );
  }

  return {
    supabaseUrl: env.VITE_SUPABASE_URL as string,
    supabasePublishableKey: env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
  };
}
