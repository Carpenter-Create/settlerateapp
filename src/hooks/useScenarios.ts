import { useState, useEffect, useCallback, useRef } from "react";
import { MortgageInputs, MortgageResults, calculateMortgage, DEFAULT_INPUTS } from "@/lib/mortgage";
import {
  ScenarioData,
  ScenarioAssumptions,
  DEFAULT_ASSUMPTIONS,
  createScenarioData,
  duplicateScenarioData,
  updateScenarioInputs,
  updateScenarioName,
  validateScenarioIntegrity,
  validateDuplicateIndependence,
  CALCULATOR_VERSION,
} from "@/lib/scenarioContract";

// Re-export for backward compatibility
export type Scenario = ScenarioData;

export type SaveStatus = "idle" | "draft" | "saving" | "saved" | "error";

const STORAGE_KEY = "settlerate_scenarios";

/**
 * Migrate legacy scenario format to new format with assumptions
 */
function migrateScenario(s: any): ScenarioData {
  return {
    id: s.id,
    ownerId: s.ownerId ?? null,
    name: s.name,
    createdAt: new Date(s.createdAt),
    updatedAt: new Date(s.updatedAt),
    sourceScenarioId: s.sourceScenarioId ?? null,
    inputs: s.inputs,
    assumptions: s.assumptions ?? { ...DEFAULT_ASSUMPTIONS },
    results: s.results ?? calculateMortgage(s.inputs),
    calculatorVersion: s.calculatorVersion ?? CALCULATOR_VERSION,
  };
}

function loadScenarios(): ScenarioData[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map(migrateScenario);
    }
  } catch (e) {
    console.error("Failed to load scenarios:", e);
  }
  return [];
}

function saveScenarios(scenarios: ScenarioData[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
  } catch (e) {
    console.error("Failed to save scenarios:", e);
  }
}

export function useScenarios() {
  const [scenarios, setScenarios] = useState<ScenarioData[]>([]);
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

  const createScenario = useCallback((name: string, inputs: MortgageInputs, sourceScenarioId?: string | null): ScenarioData => {
    const scenario = createScenarioData(name, inputs, null, sourceScenarioId ?? null);
    setScenarios((prev) => [...prev, scenario]);
    return scenario;
  }, []);

  const updateScenario = useCallback((id: string, updates: Partial<Pick<ScenarioData, "name" | "inputs">>): void => {
    setScenarios((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        
        let updated = s;
        
        if (updates.name !== undefined) {
          updated = updateScenarioName(updated, updates.name);
        }
        
        if (updates.inputs !== undefined) {
          updated = updateScenarioInputs(updated, updates.inputs);
        }
        
        return updated;
      })
    );
  }, []);

  const duplicateScenario = useCallback((id: string): ScenarioData | null => {
    const original = scenarios.find((s) => s.id === id);
    if (!original) return null;
    
    // Create deep clone with lineage tracking
    const duplicate = duplicateScenarioData(original);
    
    // Validate independence in development
    if (process.env.NODE_ENV === "development") {
      const validation = validateDuplicateIndependence(original, duplicate);
      if (!validation.valid) {
        console.error("Duplicate independence validation failed:", validation.errors);
      }
    }
    
    setScenarios((prev) => [...prev, duplicate]);
    return duplicate;
  }, [scenarios]);

  const deleteScenario = useCallback((id: string): void => {
    setScenarios((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const getScenario = useCallback((id: string): ScenarioData | undefined => {
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
 * Hook for managing an active scenario with draft editing semantics.
 * 
 * Draft Mode:
 * - When a scenario is loaded, it enters draft state
 * - Changes are held locally until explicitly saved
 * - User must click "Save" to persist changes
 * - "Save As New" creates a new scenario with lineage
 */
export function useActiveScenario(scenarioId: string | null) {
  const { scenarios, isLoaded, updateScenario, getScenario, duplicateScenario, createScenario } = useScenarios();
  
  // Draft state - local edits not yet persisted
  const [draftInputs, setDraftInputs] = useState<MortgageInputs>(DEFAULT_INPUTS);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [activeScenario, setActiveScenario] = useState<ScenarioData | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  
  // Track original inputs for dirty detection
  const originalInputsRef = useRef<string | null>(null);

  // Load scenario when ID changes or scenarios are loaded
  useEffect(() => {
    if (!isLoaded) return;
    
    if (scenarioId) {
      const scenario = getScenario(scenarioId);
      if (scenario) {
        setActiveScenario(scenario);
        setDraftInputs(structuredClone(scenario.inputs));
        originalInputsRef.current = JSON.stringify(scenario.inputs);
        setSaveStatus("saved");
        setIsDirty(false);
      } else {
        // Scenario not found, reset to defaults
        setActiveScenario(null);
        setDraftInputs(DEFAULT_INPUTS);
        originalInputsRef.current = null;
        setSaveStatus("idle");
        setIsDirty(false);
      }
    } else {
      setActiveScenario(null);
      setDraftInputs(DEFAULT_INPUTS);
      originalInputsRef.current = null;
      setSaveStatus("idle");
      setIsDirty(false);
    }
  }, [scenarioId, isLoaded, getScenario]);

  // Update active scenario reference when scenarios change (for name updates etc)
  useEffect(() => {
    if (scenarioId && isLoaded) {
      const scenario = scenarios.find(s => s.id === scenarioId);
      if (scenario) {
        setActiveScenario(scenario);
      }
    }
  }, [scenarios, scenarioId, isLoaded]);

  // Check if draft has unsaved changes
  const checkDirty = useCallback((newInputs: MortgageInputs) => {
    if (!originalInputsRef.current) {
      setIsDirty(false);
      return;
    }
    const currentJson = JSON.stringify(newInputs);
    const dirty = currentJson !== originalInputsRef.current;
    setIsDirty(dirty);
    if (dirty) {
      setSaveStatus("draft");
    }
  }, []);

  // Update draft inputs (does NOT persist)
  const updateInputs = useCallback((newInputs: MortgageInputs) => {
    setDraftInputs(newInputs);
    if (activeScenario) {
      checkDirty(newInputs);
    }
  }, [activeScenario, checkDirty]);

  // Update a single input field
  const updateInput = useCallback(<K extends keyof MortgageInputs>(
    key: K,
    value: MortgageInputs[K]
  ) => {
    setDraftInputs(prev => {
      const newInputs = { ...prev, [key]: value };
      if (activeScenario) {
        checkDirty(newInputs);
      }
      return newInputs;
    });
  }, [activeScenario, checkDirty]);

  // Batch update inputs
  const batchUpdateInputs = useCallback((updates: Partial<MortgageInputs>) => {
    setDraftInputs(prev => {
      const newInputs = { ...prev, ...updates };
      if (activeScenario) {
        checkDirty(newInputs);
      }
      return newInputs;
    });
  }, [activeScenario, checkDirty]);

  // Save draft to existing scenario (overwrite)
  const saveDraft = useCallback((): boolean => {
    if (!activeScenario) return false;
    
    try {
      setSaveStatus("saving");
      updateScenario(activeScenario.id, { inputs: draftInputs });
      originalInputsRef.current = JSON.stringify(draftInputs);
      setIsDirty(false);
      setSaveStatus("saved");
      return true;
    } catch (error) {
      console.error("Failed to save scenario:", error);
      setSaveStatus("error");
      return false;
    }
  }, [activeScenario, draftInputs, updateScenario]);

  // Save as new scenario (with lineage)
  const saveAsNew = useCallback((name: string): ScenarioData => {
    const sourceId = activeScenario?.id ?? null;
    const newScenario = createScenario(name, draftInputs, sourceId);
    return newScenario;
  }, [createScenario, draftInputs, activeScenario]);

  // Duplicate current scenario
  const duplicateCurrent = useCallback((): ScenarioData | null => {
    if (!scenarioId) return null;
    return duplicateScenario(scenarioId);
  }, [scenarioId, duplicateScenario]);

  // Discard draft changes and reload from saved
  const discardDraft = useCallback(() => {
    if (activeScenario) {
      setDraftInputs(structuredClone(activeScenario.inputs));
      originalInputsRef.current = JSON.stringify(activeScenario.inputs);
      setIsDirty(false);
      setSaveStatus("saved");
    }
  }, [activeScenario]);

  // Compute results from current draft inputs
  const results = calculateMortgage(draftInputs);

  return {
    inputs: draftInputs,
    results,
    activeScenario,
    saveStatus,
    isLoaded,
    isDirty,
    updateInput,
    updateInputs,
    batchUpdateInputs,
    saveDraft,
    saveAsNew,
    duplicateCurrent,
    discardDraft,
    isEditing: !!activeScenario,
  };
}
