/**
 * First-Run Experience Standard
 * 
 * Centralized logic for managing configuration overlays across SettleRate.
 * 
 * STANDARD BEHAVIOR:
 * - Guided Start opens automatically when:
 *   - User has no saved scenarios, OR
 *   - User initiates a new scenario (no scenarioId in route)
 * - Guided Start does NOT open automatically when:
 *   - Editing an existing scenario
 *   - Returning to a previously saved scenario
 * 
 * SESSION RULES:
 * - Once completed or skipped, do not reopen automatically during the same session
 * - Reopen only when a new scenario is explicitly created
 * 
 * DESIGN PRINCIPLES:
 * - Configuration overlay, not onboarding
 * - No animations beyond simple fade
 * - No progress celebration
 * - Skip is always available but visually secondary
 */

const SESSION_KEY_PREFIX = "settlerate_first_run_dismissed_";

export type FirstRunContext = "calculator" | "comparison" | "scenario";

/**
 * Check if first-run experience should auto-open for a given context.
 * 
 * @param context - The tool/feature context
 * @param hasExistingData - Whether user has existing data (e.g., scenarioId present)
 * @returns true if the first-run overlay should open
 */
export function shouldShowFirstRun(
  context: FirstRunContext,
  hasExistingData: boolean
): boolean {
  if (hasExistingData) {
    return false;
  }
  
  const sessionKey = `${SESSION_KEY_PREFIX}${context}`;
  const wasDismissed = sessionStorage.getItem(sessionKey) === "true";
  
  return !wasDismissed;
}

/**
 * Mark the first-run experience as dismissed for this session.
 * 
 * @param context - The tool/feature context
 */
export function dismissFirstRun(context: FirstRunContext): void {
  const sessionKey = `${SESSION_KEY_PREFIX}${context}`;
  sessionStorage.setItem(sessionKey, "true");
}

/**
 * Clear the dismissed state (for testing or explicit re-trigger).
 * 
 * @param context - The tool/feature context
 */
export function resetFirstRun(context: FirstRunContext): void {
  const sessionKey = `${SESSION_KEY_PREFIX}${context}`;
  sessionStorage.removeItem(sessionKey);
}

/**
 * Clear all first-run dismissed states.
 * Useful for testing or when user explicitly requests to restart setup.
 */
export function resetAllFirstRun(): void {
  const contexts: FirstRunContext[] = ["calculator", "comparison", "scenario"];
  contexts.forEach((context) => {
    resetFirstRun(context);
  });
}
