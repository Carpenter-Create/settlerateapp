import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import { MortgageInputs, calculateMortgage, DEFAULT_INPUTS } from "@/lib/mortgage";
import {
  ScenarioData,
  validateDuplicateIndependence,
} from "@/lib/scenarioContract";
import { scenarioStore, StoreSnapshot } from "@/lib/scenarioStore";
import { useAuth } from "@/contexts/AuthContext";

// Re-export for backward compatibility
export type Scenario = ScenarioData;

export type SaveStatus = "idle" | "draft" | "saving" | "saved" | "error";

/**
 * Hook for managing scenarios with unified localStorage/Supabase persistence
 */
export function useScenarios() {
  const { user, isLoading: authLoading } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const initRef = useRef(false);

  // Initialize store when auth state changes
  useEffect(() => {
    if (authLoading) return;

    // Prevent double initialization
    if (initRef.current) return;
    initRef.current = true;

    scenarioStore.initialize(user).then(() => {
      setIsInitialized(true);
    });
  }, [user, authLoading]);

  // Re-initialize when user changes (login/logout)
  useEffect(() => {
    if (authLoading || !isInitialized) return;

    // Check if user changed
    const currentSnapshot = scenarioStore.getSnapshot();
    const shouldReinit = user 
      ? !currentSnapshot.isAuthenticatedMode 
      : currentSnapshot.isAuthenticatedMode;

    if (shouldReinit) {
      initRef.current = false;
      setIsInitialized(false);
      scenarioStore.initialize(user).then(() => {
        initRef.current = true;
        setIsInitialized(true);
      });
    }
  }, [user, authLoading, isInitialized]);

  const { scenarios, isLoaded, isAuthenticatedMode } = useSyncExternalStore(
    scenarioStore.subscribe,
    scenarioStore.getSnapshot,
    scenarioStore.getSnapshot
  );

  const getScenario = useCallback((id: string): ScenarioData | undefined => {
    return scenarioStore.getScenario(id);
  }, []);

  const createScenario = useCallback(async (
    name: string, 
    inputs: MortgageInputs, 
    sourceScenarioId?: string | null
  ): Promise<ScenarioData> => {
    return scenarioStore.createScenario(name, inputs, sourceScenarioId);
  }, []);

  const updateScenario = useCallback(async (
    id: string, 
    updates: Partial<Pick<ScenarioData, "name" | "inputs">>
  ): Promise<void> => {
    return scenarioStore.updateScenario(id, updates);
  }, []);

  const duplicateScenario = useCallback(async (id: string): Promise<ScenarioData | null> => {
    return scenarioStore.duplicateScenario(id);
  }, []);

  const deleteScenario = useCallback(async (id: string): Promise<void> => {
    return scenarioStore.deleteScenario(id);
  }, []);

  const reload = useCallback(async (): Promise<void> => {
    return scenarioStore.reload();
  }, []);

  // Migration helpers
  const hasPendingMigration = useCallback((): boolean => {
    return scenarioStore.hasPendingMigration();
  }, []);

  const getPendingMigrationCount = useCallback((): number => {
    return scenarioStore.getPendingMigrationCount();
  }, []);

  const migrateToAccount = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    return scenarioStore.migrateLocalStorageToSupabase();
  }, []);

  const dismissMigration = useCallback((): void => {
    scenarioStore.dismissMigration();
  }, []);

  return {
    scenarios,
    isLoaded: isLoaded && isInitialized && !authLoading,
    isAuthenticatedMode,
    createScenario,
    updateScenario,
    duplicateScenario,
    deleteScenario,
    getScenario,
    reload,
    // Migration
    hasPendingMigration,
    getPendingMigrationCount,
    migrateToAccount,
    dismissMigration,
  };
}

/**
 * Hook for managing an active scenario with draft editing semantics.
 */
export function useActiveScenario(scenarioId: string | null) {
  const { 
    scenarios, 
    isLoaded, 
    updateScenario, 
    getScenario, 
    duplicateScenario, 
    createScenario 
  } = useScenarios();

  // Draft state
  const [draftInputs, setDraftInputs] = useState<MortgageInputs>(DEFAULT_INPUTS);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [activeScenario, setActiveScenario] = useState<ScenarioData | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [scenarioNotFound, setScenarioNotFound] = useState(false);

  const originalInputsRef = useRef<string | null>(null);
  const loadedScenarioIdRef = useRef<string | null>(null);

  // Load scenario when ID changes
  useEffect(() => {
    if (!isLoaded) return;

    if (scenarioId) {
      const scenario = getScenario(scenarioId);

      if (scenario) {
        setActiveScenario(scenario);
        setDraftInputs(structuredClone(scenario.inputs));
        originalInputsRef.current = JSON.stringify(scenario.inputs);
        loadedScenarioIdRef.current = scenarioId;
        setSaveStatus("saved");
        setIsDirty(false);
        setScenarioNotFound(false);
      } else {
        console.error(`Scenario ${scenarioId} not found`);
        setActiveScenario(null);
        setDraftInputs(DEFAULT_INPUTS);
        originalInputsRef.current = null;
        loadedScenarioIdRef.current = null;
        setSaveStatus("idle");
        setIsDirty(false);
        setScenarioNotFound(true);
      }
    } else {
      setActiveScenario(null);
      setDraftInputs(DEFAULT_INPUTS);
      originalInputsRef.current = null;
      loadedScenarioIdRef.current = null;
      setSaveStatus("idle");
      setIsDirty(false);
      setScenarioNotFound(false);
    }
  }, [scenarioId, isLoaded, getScenario]);

  // Update active scenario when scenarios change
  useEffect(() => {
    if (scenarioId && isLoaded) {
      const scenario = scenarios.find((s) => s.id === scenarioId);
      if (scenario) {
        setActiveScenario(scenario);
      }
    }
  }, [scenarios, scenarioId, isLoaded]);

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

  const updateInputs = useCallback(
    (newInputs: MortgageInputs) => {
      setDraftInputs(newInputs);
      if (activeScenario) {
        checkDirty(newInputs);
      }
    },
    [activeScenario, checkDirty]
  );

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

  const saveDraft = useCallback(async (): Promise<boolean> => {
    if (!activeScenario) return false;

    try {
      setSaveStatus("saving");
      await updateScenario(activeScenario.id, { inputs: draftInputs });
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

  const saveAsNew = useCallback(
    async (name: string): Promise<ScenarioData> => {
      const sourceId = activeScenario?.id ?? null;
      return createScenario(name, draftInputs, sourceId);
    },
    [createScenario, draftInputs, activeScenario]
  );

  const duplicateCurrent = useCallback(async (): Promise<ScenarioData | null> => {
    if (!activeScenario) {
      console.warn("Cannot duplicate: no active scenario");
      return null;
    }
    return duplicateScenario(activeScenario.id);
  }, [activeScenario, duplicateScenario]);

  const discardDraft = useCallback(() => {
    if (activeScenario) {
      setDraftInputs(structuredClone(activeScenario.inputs));
      originalInputsRef.current = JSON.stringify(activeScenario.inputs);
      setIsDirty(false);
      setSaveStatus("saved");
    }
  }, [activeScenario]);

  const results = calculateMortgage(draftInputs);

  return {
    inputs: draftInputs,
    results,
    activeScenario,
    saveStatus,
    isLoaded,
    isDirty,
    scenarioNotFound,
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
