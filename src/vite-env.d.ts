/// <reference types="vite/client" />

/**
 * Public client env vars only (ADR 0002). Server secrets
 * (SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, etc.)
 * must never be declared here or exposed as VITE_* variables.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  /**
   * Optional. Local-development-only auth redirect origin override.
   * Validated by `src/lib/authRedirect.ts` against an exact-match allowlist;
   * production always falls back to DEFAULT_APP_ORIGIN when unset.
   */
  readonly VITE_APP_ORIGIN?: string;
  /**
   * Optional. Sentry client DSN (public identifier, safe to expose in the
   * browser bundle — not a secret). Validated by
   * `src/lib/observability.ts`; absent, blank, or malformed values leave
   * observability disabled with no effect on application behavior.
   * Authority: docs/adr/0003-observability-policy.md.
   */
  readonly VITE_SENTRY_DSN?: string;
  /**
   * Optional. Sentry environment tag override (e.g. `staging`). Staging SPA
   * builds use Vite `MODE === "production"`; without this override events would
   * incorrectly tag as `production`. Authority: ADR 0008.
   */
  readonly VITE_SENTRY_ENVIRONMENT?: string;
  /**
   * Optional. Deterministic release identifier injected at build time by
   * `vite.config.ts` (not read from a real `VITE_*` env file/secret) —
   * see `src/lib/observabilityRelease.ts`. Not a secret: a public commit
   * SHA or empty string. Consumed by `src/lib/observability.ts` so the
   * browser SDK's release matches the one used for source-map upload.
   */
  readonly VITE_SENTRY_RELEASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
