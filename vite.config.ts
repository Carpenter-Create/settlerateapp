import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Vite does not load .env into process.env for the config file itself.
  const env = loadEnv(mode, process.cwd(), "");

  // Source-map upload (Phase 8.1 Epic 3 / ADR 0003 §7) only activates once
  // SENTRY_AUTH_TOKEN/SENTRY_ORG/SENTRY_PROJECT are all present — set as
  // CI-only secrets scoped to the "Build" step in .github/workflows/ci.yml,
  // never as VITE_* variables, so the auth token is never read by client
  // code or shipped in the browser bundle. Local/PR-from-fork builds (no
  // secrets available) and this repository's own tests/dev server always
  // take this disabled branch, so the plugin is a no-op and the build
  // succeeds exactly as without Sentry configured at all.
  const sentryUploadEnabled = Boolean(
    env.SENTRY_AUTH_TOKEN && env.SENTRY_ORG && env.SENTRY_PROJECT
  );

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
    plugins: [
      react(),
      // Must be the last plugin — see Sentry Vite plugin docs.
      ...(sentryUploadEnabled
        ? [
            sentryVitePlugin({
              org: env.SENTRY_ORG,
              project: env.SENTRY_PROJECT,
              authToken: env.SENTRY_AUTH_TOKEN,
              sourcemaps: {
                // Upload browser source maps for this Sentry web project
                // only, then delete the local .map files so they are never
                // left behind as deployable/browser-accessible artifacts.
                // Edge Function source maps are explicitly out of scope.
                filesToDeleteAfterUpload: ["./dist/**/*.map"],
              },
              // Never let an upload failure (bad token, network error, etc.)
              // print the raw Sentry CLI error — which can otherwise
              // include request/response detail — to CI logs. Replace it
              // with a generic, credential-free message and keep default
              // fail-the-build behavior for a real configuration problem.
              errorHandler: (_error) => {
                throw new Error(
                  "Sentry source-map upload failed. Verify SENTRY_AUTH_TOKEN/SENTRY_ORG/SENTRY_PROJECT and the Sentry project configuration (details intentionally omitted from CI logs)."
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
