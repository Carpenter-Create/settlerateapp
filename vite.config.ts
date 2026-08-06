import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import path from "path";
import { resolveSentryRelease } from "./src/lib/observabilityRelease";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Vite does not load .env into process.env for the config file itself.
  const env = loadEnv(mode, process.cwd(), "");

  // Source-map upload (Phase 8.1 Epic 3 / ADR 0003 §7) only activates once
  // SENTRY_AUTH_TOKEN/SENTRY_ORG/SENTRY_PROJECT are all present — set as
  // server-side-only secrets scoped to the "Build" step in
  // .github/workflows/ci.yml (CI validation builds) and the equivalent
  // Vercel Project → Settings → Environment Variables entries (the
  // production build that actually ships), never as VITE_* variables, so
  // the auth token is never read by client code or shipped in the browser
  // bundle. Local/PR-from-fork builds (no secrets available) and this
  // repository's own tests/dev server always take this disabled branch, so
  // the plugin is a no-op and the build succeeds exactly as without Sentry
  // configured at all.
  const sentryUploadEnabled = Boolean(
    env.SENTRY_AUTH_TOKEN && env.SENTRY_ORG && env.SENTRY_PROJECT
  );

  // One deterministic release identifier for this build, shared by the
  // client SDK (via the VITE_SENTRY_RELEASE define below, read by
  // src/lib/observability.ts) and the Sentry Vite plugin's own release
  // configuration — see src/lib/observabilityRelease.ts. `undefined` on
  // builds with neither VERCEL_GIT_COMMIT_SHA nor GITHUB_SHA (e.g. local
  // dev); never hardcoded, never a secret.
  const sentryRelease = resolveSentryRelease(env);

  return {
    server: {
      host: "::",
      port: 8080,
    },
    build: {
      // "hidden" emits source maps for Sentry to consume without adding a
      // sourceMappingURL comment to shipped files, so maps are never
      // intentionally served publicly.
      sourcemap: "hidden",
    },
    // Injects the resolved (non-secret) release string as a build-time
    // constant, matching how Vite itself exposes VITE_*-prefixed env vars
    // on import.meta.env — but computed here rather than read verbatim
    // from process.env, since VERCEL_GIT_COMMIT_SHA/GITHUB_SHA are not
    // VITE_-prefixed and must not be exposed under their own names.
    define: {
      "import.meta.env.VITE_SENTRY_RELEASE": JSON.stringify(sentryRelease ?? ""),
    },
    plugins: [
      react(),
      // Must be the last plugin — see Sentry Vite plugin docs.
      ...(sentryUploadEnabled
        ? [
            sentryVitePlugin({
              org: env.SENTRY_ORG,
              project: env.SENTRY_PROJECT,
              authToken: env.SENTRY_AUTH_TOKEN,
              release: {
                name: sentryRelease,
                // The client bundle already carries the same value via the
                // VITE_SENTRY_RELEASE define above and passes it to
                // Sentry.init explicitly; a second, independent injection
                // point here would be redundant and risks diverging from
                // that single source of truth.
                inject: false,
                // Without a resolved commit SHA there is nothing
                // deterministic to associate — never fall back to the
                // plugin's own auto-detection (git HEAD, Heroku, etc.),
                // which could disagree with the client's release.
                create: Boolean(sentryRelease),
                finalize: Boolean(sentryRelease),
              },
              sourcemaps: {
                // Upload browser source maps for this Sentry web project
                // only, then delete the local .map files so they are never
                // left behind as deployable/browser-accessible artifacts.
                // Edge Function source maps are explicitly out of scope.
                filesToDeleteAfterUpload: ["./dist/**/*.map"],
              },
              // A source-map upload problem (bad token, org/project not yet
              // provisioned, transient network error, etc.) must never
              // break the application build — the shipped JS bundle itself
              // does not depend on this step succeeding. Never print the
              // raw Sentry CLI error, which can otherwise include request/
              // response detail; emit a fixed, credential-free warning
              // instead and let the build continue.
              errorHandler: (_error) => {
                console.warn(
                  "[sentry] Source-map upload failed; continuing build. Verify SENTRY_AUTH_TOKEN/SENTRY_ORG/SENTRY_PROJECT and that the Sentry project exists (details intentionally omitted from CI logs)."
                );
              },
            }),
          ]
        : []),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
