/**
 * Edge observability adapter — Phase 8.1 Epic 3 / Epic 5.
 *
 * Deterministic helpers: `@settlerate/core/edge-observability` (via Edge deno.json).
 * Nondeterministic request-ID generation (`crypto.randomUUID`) retained here.
 */

export {
  isEdgeObservabilityEnabled,
  buildEdgeExtra,
} from "@settlerate/core/edge-observability";

export type { EdgeObservabilityContext } from "@settlerate/core/edge-observability";

/** Correlation identifier for a single function invocation. */
export function generateRequestId(): string {
  return crypto.randomUUID();
}
