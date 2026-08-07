/**
 * Compatibility shim — canonical implementation lives in @settlerate/core.
 *
 * Deletion condition: remove when all app importers use
 * `@settlerate/core/entitlement` (or `@settlerate/core`) and CI proves
 * browser/Node resolution without this path (Epic 5 PR 6).
 */
export * from "@settlerate/core/entitlement";
