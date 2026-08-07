/**
 * Compatibility shim — canonical implementation lives in @settlerate/core.
 *
 * Temporary relative bridge into packages/core so Supabase Edge bundling can
 * follow the dependency graph without a permanent copy-mirror.
 *
 * Deletion condition: remove when Edge Functions resolve
 * `@settlerate/core/observability-redaction` via an approved Deno/Supabase
 * import map and CI proves Deno + deploy graph without this path (Epic 5 PR 6).
 */
export * from "../../../packages/core/src/observability/observabilityRedaction.ts";
