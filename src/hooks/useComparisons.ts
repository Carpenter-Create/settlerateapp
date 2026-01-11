/**
 * Comparison storage hook - manages saved comparisons with schema versioning.
 * 
 * Comparisons are relational references to scenarios, not snapshots.
 */

import { useCallback, useSyncExternalStore } from "react";
import {
  SavedComparison,
  ScenarioSnapshot,
  createComparison,
  updateComparisonScenarios,
  updateComparisonName,
  markComparisonViewed,
  migrateComparison,
  needsComparisonMigration,
} from "@/lib/comparisonContract";
import type { ScenarioData } from "@/lib/scenarioContract";

const STORAGE_KEY = "settlerate_comparisons";

// ============================================================================
// STORAGE
// ============================================================================

function loadComparisonsFromStorage(): { comparisons: SavedComparison[]; needsPersist: boolean } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const comparisons: SavedComparison[] = [];
      let anyMigrated = false;
      
      for (const raw of parsed) {
        const result = migrateComparison(raw);
        if (result.success && result.comparison) {
          comparisons.push(result.comparison);
          if (needsComparisonMigration(raw)) {
            anyMigrated = true;
          }
        } else {
          console.error("[ComparisonStorage] Failed to migrate:", result.error);
        }
      }
      
      return { comparisons, needsPersist: anyMigrated };
    }
  } catch (e) {
    console.error("Failed to load comparisons:", e);
  }
  return { comparisons: [], needsPersist: false };
}

function saveComparisonsToStorage(comparisons: SavedComparison[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(comparisons));
  } catch (e) {
    console.error("Failed to save comparisons:", e);
  }
}

// ============================================================================
// COMPARISON STORE - Singleton external store
// ============================================================================

type Listener = () => void;

interface StoreSnapshot {
  comparisons: SavedComparison[];
  isLoaded: boolean;
}

class ComparisonStore {
  private comparisons: SavedComparison[] = [];
  private isLoaded = false;
  private listeners = new Set<Listener>();
  private snapshot: StoreSnapshot;

  constructor() {
    const { comparisons, needsPersist } = loadComparisonsFromStorage();
    this.comparisons = comparisons;
    this.isLoaded = true;
    this.snapshot = { comparisons: this.comparisons, isLoaded: this.isLoaded };
    
    if (needsPersist) {
      this.persist();
      console.log("[ComparisonStore] Persisted migrated comparisons");
    }
  }

  getSnapshot = (): StoreSnapshot => {
    return this.snapshot;
  };

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private notify() {
    this.snapshot = { comparisons: this.comparisons, isLoaded: this.isLoaded };
    this.listeners.forEach((listener) => listener());
  }

  private persist() {
    saveComparisonsToStorage(this.comparisons);
  }

  getComparison(id: string): SavedComparison | undefined {
    return this.comparisons.find((c) => c.id === id);
  }

  saveComparison(scenarioIds: string[], scenarios: ScenarioData[], name?: string): SavedComparison {
    const comparison = createComparison(scenarioIds, scenarios, name);
    this.comparisons = [...this.comparisons, comparison];
    this.persist();
    this.notify();
    return comparison;
  }

  updateComparison(
    id: string, 
    updates: Partial<Pick<SavedComparison, "name" | "scenarioIds">>,
    scenarios?: ScenarioData[]
  ): void {
    this.comparisons = this.comparisons.map((c) => {
      if (c.id !== id) return c;
      
      let updated = c;
      
      if (updates.name !== undefined) {
        updated = updateComparisonName(updated, updates.name);
      }
      
      if (updates.scenarioIds !== undefined && scenarios) {
        updated = updateComparisonScenarios(updated, updates.scenarioIds, scenarios);
      }
      
      return updated;
    });
    this.persist();
    this.notify();
  }

  markViewed(id: string, scenarios: ScenarioData[]): void {
    this.comparisons = this.comparisons.map((c) => {
      if (c.id !== id) return c;
      return markComparisonViewed(c, scenarios);
    });
    this.persist();
    this.notify();
  }

  deleteComparison(id: string): void {
    this.comparisons = this.comparisons.filter((c) => c.id !== id);
    this.persist();
    this.notify();
  }
}

// Global singleton store
const comparisonStore = new ComparisonStore();

// ============================================================================
// HOOKS
// ============================================================================

export function useComparisons() {
  const { comparisons, isLoaded } = useSyncExternalStore(
    comparisonStore.subscribe,
    comparisonStore.getSnapshot,
    comparisonStore.getSnapshot
  );

  const getComparison = useCallback((id: string): SavedComparison | undefined => {
    return comparisonStore.getComparison(id);
  }, []);

  const saveComparison = useCallback((
    scenarioIds: string[], 
    scenarios: ScenarioData[],
    name?: string
  ): SavedComparison => {
    return comparisonStore.saveComparison(scenarioIds, scenarios, name);
  }, []);

  const updateComparison = useCallback((
    id: string, 
    updates: Partial<Pick<SavedComparison, "name" | "scenarioIds">>,
    scenarios?: ScenarioData[]
  ): void => {
    comparisonStore.updateComparison(id, updates, scenarios);
  }, []);

  const markComparisonAsViewed = useCallback((id: string, scenarios: ScenarioData[]): void => {
    comparisonStore.markViewed(id, scenarios);
  }, []);

  const deleteComparison = useCallback((id: string): void => {
    comparisonStore.deleteComparison(id);
  }, []);

  return {
    comparisons,
    isLoaded,
    getComparison,
    saveComparison,
    updateComparison,
    markComparisonAsViewed,
    deleteComparison,
  };
}
