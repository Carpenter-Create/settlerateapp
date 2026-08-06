import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Vite does not load .env into process.env for the config file itself.
  const env = loadEnv(mode, process.cwd(), "");

  // Source-map upload (Phase 8.1 Epic 3 / ADR 0003 §7) is authorized only
  // once org/project/auth-token are separately configured — none of this is
  // set by this PR, so the plugin is a no-op and the build succeeds exactly
  // as before. The auth token is a CI/build-machine value only; it is never
  // read by client code and never shipped in the browser bundle.
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
                filesToDeleteAfterUpload: ["./dist/**/*.map"],
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
