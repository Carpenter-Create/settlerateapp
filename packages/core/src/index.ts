/**
 * @settlerate/core public entry (Epic 5).
 *
 * Authority: docs/adr/0005-shared-package-architecture.md
 *
 * PR 1 scaffold only — no business contracts. Future extractions require
 * separate founder authorization (Epic 5 PR 2+).
 */

/** Inert scaffold marker for import-resolution proofs. Not a business API. */
export const SETTLERATE_CORE_SCAFFOLD_MARKER = "epic5-pr1-scaffold" as const;

export type SettlerateCoreScaffoldMarker = typeof SETTLERATE_CORE_SCAFFOLD_MARKER;
