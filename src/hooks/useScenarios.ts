import { useState, useEffect, useCallback } from "react";
import { MortgageInputs, MortgageResults, calculateMortgage, DEFAULT_INPUTS } from "@/lib/mortgage";

export interface Scenario {
  id: string;
  name: string;
  inputs: MortgageInputs;
  results: MortgageResults;
  createdAt: Date;
  updatedAt: Date;
}

const STORAGE_KEY = "settlerate_scenarios";

function generateId(): string {
  return `scenario_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function loadScenarios(): Scenario[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((s: any) => ({
        ...s,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
      }));
    }
  } catch (e) {
    console.error("Failed to load scenarios:", e);
  }
  return [];
}

function saveScenarios(scenarios: Scenario[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
  } catch (e) {
    console.error("Failed to save scenarios:", e);
  }
}

export function useScenarios() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load on mount
  useEffect(() => {
    const loaded = loadScenarios();
    setScenarios(loaded);
    setIsLoaded(true);
  }, []);

  // Save on change
  useEffect(() => {
    if (isLoaded) {
      saveScenarios(scenarios);
    }
  }, [scenarios, isLoaded]);

  const createScenario = useCallback((name: string, inputs: MortgageInputs): Scenario => {
    const now = new Date();
    const scenario: Scenario = {
      id: generateId(),
      name,
      inputs,
      results: calculateMortgage(inputs),
      createdAt: now,
      updatedAt: now,
    };
    setScenarios((prev) => [...prev, scenario]);
    return scenario;
  }, []);

  const updateScenario = useCallback((id: string, updates: Partial<Pick<Scenario, "name" | "inputs">>): void => {
    setScenarios((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const newInputs = updates.inputs ?? s.inputs;
        return {
          ...s,
          name: updates.name ?? s.name,
          inputs: newInputs,
          results: updates.inputs ? calculateMortgage(newInputs) : s.results,
          updatedAt: new Date(),
        };
      })
    );
  }, []);

  const duplicateScenario = useCallback((id: string): Scenario | null => {
    const original = scenarios.find((s) => s.id === id);
    if (!original) return null;
    return createScenario(`${original.name} (copy)`, { ...original.inputs });
  }, [scenarios, createScenario]);

  const deleteScenario = useCallback((id: string): void => {
    setScenarios((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const getScenario = useCallback((id: string): Scenario | undefined => {
    return scenarios.find((s) => s.id === id);
  }, [scenarios]);

  return {
    scenarios,
    isLoaded,
    createScenario,
    updateScenario,
    duplicateScenario,
    deleteScenario,
    getScenario,
  };
}
