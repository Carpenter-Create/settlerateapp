/**
 * Calculator Copy Constants
 * 
 * Centralized copy for all calculator empty, loading, and transitional states.
 * Follows institutional tone: calm, factual, non-promotional.
 * 
 * PRINCIPLES:
 * - No encouragement language
 * - No apology-heavy phrasing
 * - No emoji or excessive punctuation
 * - Muted, analytical voice
 */

// Loading states - neutral, informational
export const LOADING_COPY = {
  /** Initial calculator load */
  initializing: "Loading calculator…",
  /** Scenario is being fetched from server */
  loadingScenario: "Loading scenario…",
  /** Saving scenario to server */
  saving: "Saving…",
  /** Results recalculating after input change */
  calculating: "Updating results…",
  /** Exporting PDF */
  exporting: "Preparing export…",
  /** Switching between scenarios */
  switching: "Loading scenario…",
} as const;

// Empty states - factual guidance only
export const EMPTY_COPY = {
  /** No scenario selected in list view */
  noScenarioSelected: "No scenario selected.",
  /** Calculator with no inputs yet */
  noInputs: "Results will appear after inputs are set.",
  /** No saved scenarios exist */
  noSavedScenarios: "No saved scenarios.",
  /** Search returned no results */
  noSearchResults: "No matching scenarios.",
  /** Amortization table empty */
  noSchedule: "Schedule unavailable.",
} as const;

// Error states - calm, factual
export const ERROR_COPY = {
  /** Generic save failure */
  saveFailed: "Save unsuccessful. Try again.",
  /** Scenario not found */
  scenarioNotFound: "Scenario not found.",
  /** Network error */
  networkError: "Unable to connect. Check your connection.",
  /** Validation error */
  invalidInputs: "Review inputs and try again.",
  /** Export failed */
  exportFailed: "Export unsuccessful. Try again.",
  /** Duplicate failed */
  duplicateFailed: "Duplicate unsuccessful. Try again.",
  /** Delete failed */
  deleteFailed: "Delete unsuccessful. Try again.",
  /** Rename failed */
  renameFailed: "Rename unsuccessful. Try again.",
} as const;

// Success states - understated, no celebration
export const SUCCESS_COPY = {
  /** Scenario saved */
  saved: "Changes saved.",
  /** New scenario created */
  created: "Scenario created.",
  /** Scenario duplicated */
  duplicated: "Scenario duplicated.",
  /** Scenario deleted */
  deleted: "Scenario removed.",
  /** Scenario renamed */
  renamed: "Scenario renamed.",
  /** Changes discarded */
  discarded: "Changes discarded.",
  /** Export complete */
  exported: "Export complete.",
} as const;

// Methodology panel content - analytical transparency
export const METHODOLOGY_COPY = {
  title: "Scenario methodology",
  points: [
    "Calculations are based on standard amortization formulas.",
    "Rates shown are inputs provided by the user or lender and are not lender quotes.",
    "Property taxes and insurance are estimates where applicable.",
    "Summary reflects modeled totals under stated assumptions. Not financial advice.",
  ],
} as const;

// Transitional/status indicators
export const STATUS_COPY = {
  /** Draft scenario indicator */
  draft: "Draft",
  /** Unsaved changes indicator */
  unsaved: "Unsaved changes",
  /** All changes saved */
  allSaved: "Saved",
  /** Saving in progress */
  saving: "Saving…",
} as const;
