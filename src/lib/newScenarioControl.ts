/**
 * Resolve empty-state / header create control so blocked states never expose an active Link.
 */
export type NewScenarioControl =
  | { mode: "link"; to: "/app/calculator" }
  | { mode: "disabled"; title?: string };

export function resolveNewScenarioControl(
  canSave: boolean,
  limitTitle?: string
): NewScenarioControl {
  if (canSave) {
    return { mode: "link", to: "/app/calculator" };
  }
  return { mode: "disabled", title: limitTitle };
}
