import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import { MortgageInputs, calculateMortgage, DEFAULT_INPUTS } from "@/lib/mortgage";
import {
  ScenarioData,
  DEFAULT_ASSUMPTIONS,
  createScenarioData,
  duplicateScenarioData,
  updateScenarioInputs,
  updateScenarioName,
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

function loadScenariosFromStorage(): ScenarioData[] {
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

function saveScenariosToStorage(scenarios: ScenarioData[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
  } catch (e) {
    console.error("Failed to save scenarios:", e);
  }
}

// ============================================================================
// SCENARIO STORE - Singleton external store for consistent state across hooks
// ============================================================================

type Listener = () => void;

interface StoreSnapshot {
  scenarios: ScenarioData[];
  isLoaded: boolean;
}

class ScenarioStore {
  private scenarios: ScenarioData[] = [];
  private isLoaded = false;
  private listeners = new Set<Listener>();
  private snapshot: StoreSnapshot;

  constructor() {
    // Load from storage on initialization
    this.scenarios = loadScenariosFromStorage();
    this.isLoaded = true;
    // Create initial snapshot
    this.snapshot = { scenarios: this.scenarios, isLoaded: this.isLoaded };
  }

  getSnapshot = (): StoreSnapshot => {
    return this.snapshot;
  };

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private notify() {
    // Create new snapshot reference only when data changes
    this.snapshot = { scenarios: this.scenarios, isLoaded: this.isLoaded };
    this.listeners.forEach((listener) => listener());
  }

  private persist() {
    saveScenariosToStorage(this.scenarios);
  }

  getScenario(id: string): ScenarioData | undefined {
    return this.scenarios.find((s) => s.id === id);
  }

  createScenario(name: string, inputs: MortgageInputs, sourceScenarioId?: string | null): ScenarioData {
    const scenario = createScenarioData(name, inputs, null, sourceScenarioId ?? null);
    this.scenarios = [...this.scenarios, scenario];
    this.persist();
    this.notify();
    return scenario;
  }

  updateScenario(id: string, updates: Partial<Pick<ScenarioData, "name" | "inputs">>): void {
    this.scenarios = this.scenarios.map((s) => {
      if (s.id !== id) return s;

      let updated = s;

      if (updates.name !== undefined) {
        updated = updateScenarioName(updated, updates.name);
      }

      if (updates.inputs !== undefined) {
        updated = updateScenarioInputs(updated, updates.inputs);
      }

      return updated;
    });
    this.persist();
    this.notify();
  }

  duplicateScenario(id: string): ScenarioData | null {
    const original = this.scenarios.find((s) => s.id === id);
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

    // Persist synchronously before returning
    this.scenarios = [...this.scenarios, duplicate];
    this.persist();
    this.notify();

    return duplicate;
  }

  deleteScenario(id: string): void {
    this.scenarios = this.scenarios.filter((s) => s.id !== id);
    this.persist();
    this.notify();
  }
}

// Global singleton store
const scenarioStore = new ScenarioStore();

// ============================================================================
// HOOKS
// ============================================================================

export function useScenarios() {
  const { scenarios, isLoaded } = useSyncExternalStore(
    scenarioStore.subscribe,
    scenarioStore.getSnapshot,
    scenarioStore.getSnapshot // Server snapshot (same for client-only app)
  );

  const getScenario = useCallback((id: string): ScenarioData | undefined => {
    return scenarioStore.getScenario(id);
  }, []);

  const createScenario = useCallback((name: string, inputs: MortgageInputs, sourceScenarioId?: string | null): ScenarioData => {
    return scenarioStore.createScenario(name, inputs, sourceScenarioId);
  }, []);

  const updateScenario = useCallback((id: string, updates: Partial<Pick<ScenarioData, "name" | "inputs">>): void => {
    scenarioStore.updateScenario(id, updates);
  }, []);

  const duplicateScenario = useCallback((id: string): ScenarioData | null => {
    return scenarioStore.duplicateScenario(id);
  }, []);

  const deleteScenario = useCallback((id: string): void => {
    scenarioStore.deleteScenario(id);
  }, []);

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

  // Track if we've loaded for this scenarioId
  const loadedScenarioIdRef = useRef<string | null>(null);

  // Load scenario when ID changes or scenarios are loaded
  // INVARIANT: If scenarioId is present, we MUST load from storage, never use defaults
  useEffect(() => {
    if (!isLoaded) return;

    if (scenarioId) {
      // Get scenario from the store (which is always in sync)
      const scenario = getScenario(scenarioId);

      if (scenario) {
        setActiveScenario(scenario);
        setDraftInputs(structuredClone(scenario.inputs));
        originalInputsRef.current = JSON.stringify(scenario.inputs);
        loadedScenarioIdRef.current = scenarioId;
        setSaveStatus("saved");
        setIsDirty(false);
      } else {
        // Scenario param exists but scenario not found - this is an error state
        console.error(`Scenario ${scenarioId} not found in storage`);
        setActiveScenario(null);
        setDraftInputs(DEFAULT_INPUTS);
        originalInputsRef.current = null;
        loadedScenarioIdRef.current = null;
        setSaveStatus("idle");
        setIsDirty(false);
      }
    } else {
      // No scenario param = new scenario mode, use defaults
      setActiveScenario(null);
      setDraftInputs(DEFAULT_INPUTS);
      originalInputsRef.current = null;
      loadedScenarioIdRef.current = null;
      setSaveStatus("idle");
      setIsDirty(false);
    }
  }, [scenarioId, isLoaded, getScenario]);

  // Update active scenario reference when scenarios change (for name updates etc)
  useEffect(() => {
    if (scenarioId && isLoaded) {
      const scenario = scenarios.find((s) => s.id === scenarioId);
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
  const updateInputs = useCallback(
    (newInputs: MortgageInputs) => {
      setDraftInputs(newInputs);
      if (activeScenario) {
        checkDirty(newInputs);
      }
    },
    [activeScenario, checkDirty]
  );

  // Update a single input field
  const updateInput = useCallback(
    <K extends keyof MortgageInputs>(key: K, value: MortgageInputs[K]) => {
      setDraftInputs((prev) => {
        const newInputs = { ...prev, [key]: value };
        if (activeScenario) {
          checkDirty(newInputs);
        }
        return newInputs;
      });
    },
    [activeScenario, checkDirty]
  );

  // Batch update inputs
  const batchUpdateInputs = useCallback(
    (updates: Partial<MortgageInputs>) => {
      setDraftInputs((prev) => {
        const newInputs = { ...prev, ...updates };
        if (activeScenario) {
          checkDirty(newInputs);
        }
        return newInputs;
      });
    },
    [activeScenario, checkDirty]
  );

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
  const saveAsNew = useCallback(
    (name: string): ScenarioData => {
      const sourceId = activeScenario?.id ?? null;
      const newScenario = createScenario(name, draftInputs, sourceId);
      return newScenario;
    },
    [createScenario, draftInputs, activeScenario]
  );

  // Duplicate current scenario - must duplicate from the SAVED scenario, not draft
  const duplicateCurrent = useCallback((): ScenarioData | null => {
    if (!activeScenario) {
      console.warn("Cannot duplicate: no active scenario");
      return null;
    }

    // Duplicate from the persisted scenario
    return duplicateScenario(activeScenario.id);
  }, [activeScenario, duplicateScenario]);

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
