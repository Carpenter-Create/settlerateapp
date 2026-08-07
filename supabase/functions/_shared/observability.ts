/**
 * Edge observability adapter — Phase 8.1 Epic 3 / Epic 5 PR 4.
 *
 * Deterministic helpers: packages/core edge-observability (temporary relative bridge).
 * Nondeterministic request-ID generation (`crypto.randomUUID`) retained here.
 *
 * Deletion condition for the relative bridge / re-export surface: remove when
 * Edge Functions resolve `@settlerate/core/edge-observability` via an approved
 * Deno/Supabase import map and CI proves Deno + deploy graph without this
 * path (Epic 5 PR 6). `generateRequestId` remains a runtime adapter concern.
 */

export {
  isEdgeObservabilityEnabled,
  buildEdgeExtra,
} from "../../../packages/core/src/observability/edgeObservability.ts";

export type { EdgeObservabilityContext } from "../../../packages/core/src/observability/edgeObservability.ts";

/** Correlation identifier for a single function invocation. */
export function generateRequestId(): string {
  return crypto.randomUUID();
}
