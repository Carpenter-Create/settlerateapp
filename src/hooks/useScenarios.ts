import { useState, useEffect, useCallback, useRef } from "react";
import { MortgageInputs, MortgageResults, calculateMortgage, DEFAULT_INPUTS } from "@/lib/mortgage";

export interface Scenario {
  id: string;
  name: string;
  inputs: MortgageInputs;
  results: MortgageResults;
  createdAt: Date;
  updatedAt: Date;
}

export type SaveStatus = "idle" | "saving" | "saved" | "error";

const STORAGE_KEY = "settlerate_scenarios";
const AUTOSAVE_DEBOUNCE_MS = 500;

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

/**
 * Hook for managing an active scenario with autosave
 */
export function useActiveScenario(scenarioId: string | null) {
  const { scenarios, isLoaded, updateScenario, getScenario, duplicateScenario, createScenario } = useScenarios();
  const [inputs, setInputs] = useState<MortgageInputs>(DEFAULT_INPUTS);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedInputsRef = useRef<string | null>(null);

  // Load scenario when ID changes or scenarios are loaded
  useEffect(() => {
    if (!isLoaded) return;
    
    if (scenarioId) {
      const scenario = getScenario(scenarioId);
      if (scenario) {
        setActiveScenario(scenario);
        setInputs(scenario.inputs);
        lastSavedInputsRef.current = JSON.stringify(scenario.inputs);
        setSaveStatus("saved");
      } else {
        // Scenario not found, reset to defaults
        setActiveScenario(null);
        setInputs(DEFAULT_INPUTS);
        lastSavedInputsRef.current = null;
        setSaveStatus("idle");
      }
    } else {
      setActiveScenario(null);
      setInputs(DEFAULT_INPUTS);
      lastSavedInputsRef.current = null;
      setSaveStatus("idle");
    }
  }, [scenarioId, isLoaded, getScenario]);

  // Update active scenario reference when scenarios change
  useEffect(() => {
    if (scenarioId && isLoaded) {
      const scenario = scenarios.find(s => s.id === scenarioId);
      if (scenario) {
        setActiveScenario(scenario);
      }
    }
  }, [scenarios, scenarioId, isLoaded]);

  // Autosave with debounce
  const saveInputs = useCallback((newInputs: MortgageInputs) => {
    if (!scenarioId || !activeScenario) return;

    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const inputsJson = JSON.stringify(newInputs);
    
    // Skip if nothing changed
    if (inputsJson === lastSavedInputsRef.current) {
      return;
    }

    setSaveStatus("saving");

    debounceRef.current = setTimeout(() => {
      try {
        updateScenario(scenarioId, { inputs: newInputs });
        lastSavedInputsRef.current = inputsJson;
        setSaveStatus("saved");
      } catch (error) {
        console.error("Failed to save scenario:", error);
        setSaveStatus("error");
      }
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [scenarioId, activeScenario, updateScenario]);

  // Update inputs and trigger autosave
  const updateInputs = useCallback((newInputs: MortgageInputs) => {
    setInputs(newInputs);
    if (activeScenario) {
      saveInputs(newInputs);
    }
  }, [activeScenario, saveInputs]);

  // Update a single input field
  const updateInput = useCallback(<K extends keyof MortgageInputs>(
    key: K,
    value: MortgageInputs[K]
  ) => {
    setInputs(prev => {
      const newInputs = { ...prev, [key]: value };
      if (activeScenario) {
        saveInputs(newInputs);
      }
      return newInputs;
    });
  }, [activeScenario, saveInputs]);

  // Batch update inputs
  const batchUpdateInputs = useCallback((updates: Partial<MortgageInputs>) => {
    setInputs(prev => {
      const newInputs = { ...prev, ...updates };
      if (activeScenario) {
        saveInputs(newInputs);
      }
      return newInputs;
    });
  }, [activeScenario, saveInputs]);

  // Create new scenario from current inputs
  const saveAsNew = useCallback((name: string): Scenario => {
    return createScenario(name, inputs);
  }, [createScenario, inputs]);

  // Duplicate current scenario
  const duplicateCurrent = useCallback((): Scenario | null => {
    if (!scenarioId) return null;
    return duplicateScenario(scenarioId);
  }, [scenarioId, duplicateScenario]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Compute results from current inputs
  const results = calculateMortgage(inputs);

  return {
    inputs,
    results,
    activeScenario,
    saveStatus,
    isLoaded,
    updateInput,
    updateInputs,
    batchUpdateInputs,
    saveAsNew,
    duplicateCurrent,
    isEditing: !!activeScenario,
  };
}
