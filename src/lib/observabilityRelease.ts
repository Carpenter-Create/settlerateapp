/**
 * Deterministic Sentry release identifier resolution — Phase 8.1 Epic 3.
 *
 * Authority: docs/adr/0003-observability-policy.md §7 ("Tag events with
 * environment and a release/build identifier where available").
 *
 * Single source of truth shared by `vite.config.ts` (which computes the
 * release once at build time, injects it into the client bundle as
 * `VITE_SENTRY_RELEASE`, and passes it to the Sentry Vite source-map
 * upload plugin) and `src/lib/observability.ts` (which reads the injected
 * value at `Sentry.init` time). Using one function in one place guarantees
 * the browser SDK and the source-map upload always agree on the same
 * release for a given build — required for Sentry to resolve a stack
 * frame back to original source.
 *
 * Preference order: the production commit SHA supplied by the build
 * platform — Vercel's `VERCEL_GIT_COMMIT_SHA` first (the authoritative
 * production artifact), then GitHub Actions' `GITHUB_SHA` (CI validation
 * builds, not the deployed artifact). Neither is a secret — both are
 * public commit hashes, safe to ship in the browser bundle. Resolves to
 * `undefined` for local/dev builds where neither is set; the release is
 * never hardcoded.
 */
export function resolveSentryRelease(
  env: Record<string, string | undefined>
): string | undefined {
  const vercelSha = env.VERCEL_GIT_COMMIT_SHA;
  if (typeof vercelSha === "string" && vercelSha.trim() !== "") {
    return vercelSha.trim();
  }
  const githubSha = env.GITHUB_SHA;
  if (typeof githubSha === "string" && githubSha.trim() !== "") {
    return githubSha.trim();
  }
  return undefined;
}
