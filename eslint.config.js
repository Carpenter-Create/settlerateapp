import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // Epic 5 / ADR 0005: packages/core must not import app/runtime surfaces.
  {
    files: ["packages/core/src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {},
    },
    rules: {
      "react-hooks/rules-of-hooks": "off",
      "react-refresh/only-export-components": "off",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/*", "**/src/**", "**/supabase/functions/**"],
              message: "@settlerate/core must not import application or Edge Function code (ADR 0005).",
            },
            {
              group: ["react", "react-dom", "react-*", "@supabase/*", "stripe", "node:*", "npm:*"],
              message: "@settlerate/core must remain free of React/Supabase/Stripe/Node/Deno runtime deps (ADR 0005).",
            },
          ],
        },
      ],
    },
  },
);
