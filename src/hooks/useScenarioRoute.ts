/**
 * useScenarioRoute - Single responsibility: parse scenario query param
 * 
 * ROUTING CONTRACT:
 * - Returns scenarioId if "scenario" query param exists
 * - Returns null if no param (new scenario mode)
 * - Provides navigation helpers that enforce the contract
 */

import { useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

export type CalculatorMode = "new" | "existing";

export interface ScenarioRouteState {
  /** The scenario ID from query param, or null if new scenario mode */
  scenarioId: string | null;
  
  /** Calculator mode: "new" (no param) or "existing" (param present) */
  mode: CalculatorMode;
  
  /** Navigate to a specific scenario (existing mode) */
  navigateToScenario: (id: string) => void;
  
  /** Navigate to new calculator (clears scenario param) */
  navigateToNew: () => void;
  
  /** Navigate to scenarios list */
  navigateToList: () => void;
}

/**
 * Hook for reading and managing scenario route state.
 * 
 * HARD INVARIANTS:
 * 1. If scenarioId is present, mode is ALWAYS "existing"
 * 2. If scenarioId is null, mode is ALWAYS "new"
 * 3. Any action that creates a scenario must use navigateToScenario(newId)
 * 4. Only explicit user action (Reset/navigateToNew) returns to defaults
 */
export function useScenarioRoute(): ScenarioRouteState {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const scenarioId = searchParams.get("scenario");
  const mode: CalculatorMode = scenarioId ? "existing" : "new";
  
  // Navigate to a specific scenario
  const navigateToScenario = useCallback((id: string) => {
    setSearchParams({ scenario: id });
  }, [setSearchParams]);
  
  // Navigate to new calculator (clear scenario param)
  const navigateToNew = useCallback(() => {
    navigate("/app/calculator");
  }, [navigate]);
  
  // Navigate to scenarios list (app index)
  const navigateToList = useCallback(() => {
    navigate("/app");
  }, [navigate]);
  
  return {
    scenarioId,
    mode,
    navigateToScenario,
    navigateToNew,
    navigateToList,
  };
}
