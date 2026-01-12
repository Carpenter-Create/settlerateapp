/**
 * Scenario Store - Unified persistence layer
 * 
 * Handles both localStorage (guests) and Supabase (authenticated users).
 * Provides seamless migration from guest to authenticated state.
 */

import { MortgageInputs, calculateMortgage } from "@/lib/mortgage";
import {
  ScenarioData,
  createScenarioData,
  duplicateScenarioData,
  updateScenarioInputs,
  updateScenarioName,
  CALCULATOR_VERSION,
  LATEST_SCHEMA_VERSION,
} from "@/lib/scenarioContract";
import {
  migrateScenario,
  needsMigration,
} from "@/lib/scenarioMigrations";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

const STORAGE_KEY = "settlerate_scenarios";
const MIGRATED_FLAG_KEY = "settlerate_scenarios_migrated";

type Listener = () => void;

export interface StoreSnapshot {
  scenarios: ScenarioData[];
  isLoaded: boolean;
  isAuthenticatedMode: boolean;
}

/**
 * Load and migrate a single raw scenario from storage.
 */
function loadAndMigrateScenario(raw: unknown): ScenarioData | null {
  const result = migrateScenario(raw);
  
  if (!result.success) {
    const errorResult = result as { success: false; error: string; details: string[] };
    console.error("[Migration] Failed to migrate scenario:", errorResult.error, errorResult.details);
    return null;
  }
  
  const migrated = result.scenario;
  
  const scenario: ScenarioData = {
    id: migrated.id,
    ownerId: migrated.ownerId ?? null,
    name: migrated.name,
    createdAt: new Date(migrated.createdAt),
    updatedAt: new Date(migrated.updatedAt),
    sourceScenarioId: migrated.sourceScenarioId ?? null,
    inputs: migrated.inputs,
    assumptions: migrated.assumptions as ScenarioData["assumptions"],
    results: calculateMortgage(migrated.inputs),
    calculatorVersion: migrated.calculatorVersion,
    schemaVersion: migrated.schemaVersion,
  };
  
  return scenario;
}

function loadScenariosFromLocalStorage(): { scenarios: ScenarioData[]; needsPersist: boolean } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const scenarios: ScenarioData[] = [];
      let anyMigrated = false;
      
      for (const raw of parsed) {
        const migrated = loadAndMigrateScenario(raw);
        if (migrated) {
          scenarios.push(migrated);
          if (needsMigration(raw)) {
            anyMigrated = true;
          }
        }
      }
      
      return { scenarios, needsPersist: anyMigrated };
    }
  } catch (e) {
    console.error("Failed to load scenarios from localStorage:", e);
  }
  return { scenarios: [], needsPersist: false };
}

function saveScenariosToLocalStorage(scenarios: ScenarioData[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
  } catch (e) {
    console.error("Failed to save scenarios to localStorage:", e);
  }
}

function clearLocalStorageScenarios(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(MIGRATED_FLAG_KEY, "true");
  } catch (e) {
    console.error("Failed to clear localStorage scenarios:", e);
  }
}

function hasLocalStorageScenarios(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}

function wasAlreadyMigrated(): boolean {
  return localStorage.getItem(MIGRATED_FLAG_KEY) === "true";
}

/**
 * Convert ScenarioData to Supabase row format
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSupabaseRow(scenario: ScenarioData, userId: string): any {
  return {
    user_id: userId,
    name: scenario.name,
    scenario_type: scenario.inputs.mode || "purchase",
    schema_version: scenario.schemaVersion,
    inputs: scenario.inputs as unknown,
    derived: {
      assumptions: scenario.assumptions,
      sourceScenarioId: scenario.sourceScenarioId,
      calculatorVersion: scenario.calculatorVersion,
    } as unknown,
    is_archived: false,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromSupabaseRow(row: any): ScenarioData {
  const inputs = row.inputs as MortgageInputs;
  const derived = row.derived as { 
    assumptions?: ScenarioData["assumptions"]; 
    sourceScenarioId?: string | null;
    calculatorVersion?: string;
  };
  
  return {
    id: row.id,
    ownerId: row.user_id,
    name: row.name,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    sourceScenarioId: derived.sourceScenarioId ?? null,
    inputs,
    assumptions: derived.assumptions ?? {
      amortizationType: "standard",
      pmiRemovalThreshold: 80,
      defaultPmiRate: 0.5,
      assumePrepaymentPenalty: false,
      taxDeductible: false,
      calculatorVersion: CALCULATOR_VERSION,
    },
    results: calculateMortgage(inputs),
    calculatorVersion: derived.calculatorVersion ?? CALCULATOR_VERSION,
    schemaVersion: row.schema_version,
  };
}

/**
 * Unified Scenario Store
 * 
 * Manages scenarios for both guests (localStorage) and authenticated users (Supabase).
 */
export class ScenarioStore {
  private scenarios: ScenarioData[] = [];
  private isLoaded = false;
  private isAuthenticatedMode = false;
  private currentUser: User | null = null;
  private listeners = new Set<Listener>();
  private snapshot: StoreSnapshot;
  private pendingMigration: ScenarioData[] | null = null;

  constructor() {
    // Start with empty state, will be initialized based on auth
    this.snapshot = { 
      scenarios: [], 
      isLoaded: false, 
      isAuthenticatedMode: false 
    };
  }

  /**
   * Initialize store based on authentication state
   */
  async initialize(user: User | null): Promise<void> {
    this.currentUser = user;
    this.isAuthenticatedMode = !!user;

    if (user) {
      // Authenticated: load from Supabase
      await this.loadFromSupabase(user.id);
    } else {
      // Guest: load from localStorage
      this.loadFromLocalStorage();
    }
  }

  private loadFromLocalStorage(): void {
    const { scenarios, needsPersist } = loadScenariosFromLocalStorage();
    this.scenarios = scenarios;
    this.isLoaded = true;
    this.isAuthenticatedMode = false;
    
    if (needsPersist) {
      saveScenariosToLocalStorage(this.scenarios);
    }
    
    this.notify();
  }

  private async loadFromSupabase(userId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from("scenarios")
        .select("*")
        .eq("user_id", userId)
        .eq("is_archived", false)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      this.scenarios = (data || []).map((row) => fromSupabaseRow(row));
      this.isLoaded = true;
      this.isAuthenticatedMode = true;
      this.notify();
    } catch (e) {
      console.error("Failed to load scenarios from Supabase:", e);
      // Fall back to empty state, don't break the app
      this.scenarios = [];
      this.isLoaded = true;
      this.isAuthenticatedMode = true;
      this.notify();
    }
  }

  /**
   * Check if there are localStorage scenarios to migrate
   */
  hasPendingMigration(): boolean {
    if (!this.currentUser || wasAlreadyMigrated()) return false;
    return hasLocalStorageScenarios();
  }

  /**
   * Get count of scenarios pending migration
   */
  getPendingMigrationCount(): number {
    if (!this.hasPendingMigration()) return 0;
    const { scenarios } = loadScenariosFromLocalStorage();
    return scenarios.length;
  }

  /**
   * Get scenarios pending migration
   */
  getPendingMigrationScenarios(): ScenarioData[] {
    if (!this.hasPendingMigration()) return [];
    const { scenarios } = loadScenariosFromLocalStorage();
    return scenarios;
  }

  /**
   * Migrate localStorage scenarios to Supabase
   */
  async migrateLocalStorageToSupabase(): Promise<{ success: boolean; error?: string }> {
    if (!this.currentUser) {
      return { success: false, error: "Not authenticated" };
    }

    const { scenarios } = loadScenariosFromLocalStorage();
    if (scenarios.length === 0) {
      return { success: true };
    }

    try {
      // Prepare rows for insert
      const rows = scenarios.map((s) => toSupabaseRow(s, this.currentUser!.id));

      // Insert scenarios
      const { error } = await supabase
        .from("scenarios")
        .insert(rows);

      if (error) throw error;

      // Clear localStorage after successful migration
      clearLocalStorageScenarios();

      // Reload from Supabase to get canonical state
      await this.loadFromSupabase(this.currentUser.id);

      return { success: true };
    } catch (e: any) {
      console.error("Failed to migrate scenarios:", e);
      return { success: false, error: e.message || "Migration failed" };
    }
  }

  /**
   * Dismiss migration (user chose "Not now")
   */
  dismissMigration(): void {
    // Mark as migrated to prevent showing prompt again this session
    // But don't clear localStorage - they may want to migrate later
    localStorage.setItem(MIGRATED_FLAG_KEY, "true");
  }

  getSnapshot = (): StoreSnapshot => {
    return this.snapshot;
  };

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private notify(): void {
    this.snapshot = { 
      scenarios: this.scenarios, 
      isLoaded: this.isLoaded,
      isAuthenticatedMode: this.isAuthenticatedMode,
    };
    this.listeners.forEach((listener) => listener());
  }

  private async persistToSupabase(scenario: ScenarioData): Promise<ScenarioData> {
    if (!this.currentUser) throw new Error("Not authenticated");

    const row = toSupabaseRow(scenario, this.currentUser.id);
    
    const { data, error } = await supabase
      .from("scenarios")
      .insert(row)
      .select()
      .single();

    if (error) throw error;
    
    return fromSupabaseRow(data);
  }

  private async updateInSupabase(id: string, updates: Partial<{
    name: string;
    inputs: MortgageInputs;
  }>): Promise<void> {
    if (!this.currentUser) throw new Error("Not authenticated");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatePayload: Record<string, any> = {};
    
    if (updates.name !== undefined) {
      updatePayload.name = updates.name;
    }
    
    if (updates.inputs !== undefined) {
      updatePayload.inputs = updates.inputs;
      updatePayload.scenario_type = updates.inputs.mode || "purchase";
    }

    const { error } = await supabase
      .from("scenarios")
      .update(updatePayload)
      .eq("id", id)
      .eq("user_id", this.currentUser.id);

    if (error) throw error;
  }

  private async deleteFromSupabase(id: string): Promise<void> {
    if (!this.currentUser) throw new Error("Not authenticated");

    const { error } = await supabase
      .from("scenarios")
      .delete()
      .eq("id", id)
      .eq("user_id", this.currentUser.id);

    if (error) throw error;
  }

  getScenario(id: string): ScenarioData | undefined {
    return this.scenarios.find((s) => s.id === id);
  }

  async createScenario(
    name: string, 
    inputs: MortgageInputs, 
    sourceScenarioId?: string | null
  ): Promise<ScenarioData> {
    const scenario = createScenarioData(
      name, 
      inputs, 
      this.currentUser?.id ?? null, 
      sourceScenarioId ?? null
    );

    if (this.isAuthenticatedMode && this.currentUser) {
      try {
        const persisted = await this.persistToSupabase(scenario);
        this.scenarios = [persisted, ...this.scenarios];
        this.notify();
        return persisted;
      } catch (e) {
        console.error("Failed to create scenario in Supabase:", e);
        throw e;
      }
    } else {
      // Guest mode: localStorage
      this.scenarios = [scenario, ...this.scenarios];
      saveScenariosToLocalStorage(this.scenarios);
      this.notify();
      return scenario;
    }
  }

  async updateScenario(
    id: string, 
    updates: Partial<Pick<ScenarioData, "name" | "inputs">>
  ): Promise<void> {
    // Update local state first for responsiveness
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
    this.notify();

    if (this.isAuthenticatedMode && this.currentUser) {
      try {
        await this.updateInSupabase(id, updates);
      } catch (e) {
        console.error("Failed to update scenario in Supabase:", e);
        // Reload to get consistent state
        await this.loadFromSupabase(this.currentUser.id);
        throw e;
      }
    } else {
      saveScenariosToLocalStorage(this.scenarios);
    }
  }

  async duplicateScenario(id: string): Promise<ScenarioData | null> {
    const original = this.scenarios.find((s) => s.id === id);
    if (!original) return null;

    if (this.isAuthenticatedMode && this.currentUser) {
      try {
        // Use server-side RPC for authenticated duplication
        const { data, error } = await supabase.rpc("duplicate_scenario", {
          source_scenario_id: id,
        });

        if (error) throw error;

        // Reload to get the new scenario
        await this.loadFromSupabase(this.currentUser.id);
        
        return this.scenarios.find((s) => s.id === data) ?? null;
      } catch (e) {
        console.error("Failed to duplicate scenario:", e);
        throw e;
      }
    } else {
      // Guest mode: local duplication
      const duplicate = duplicateScenarioData(original);
      this.scenarios = [duplicate, ...this.scenarios];
      saveScenariosToLocalStorage(this.scenarios);
      this.notify();
      return duplicate;
    }
  }

  async deleteScenario(id: string): Promise<void> {
    // Optimistic update
    this.scenarios = this.scenarios.filter((s) => s.id !== id);
    this.notify();

    if (this.isAuthenticatedMode && this.currentUser) {
      try {
        await this.deleteFromSupabase(id);
      } catch (e) {
        console.error("Failed to delete scenario:", e);
        // Reload to restore state
        await this.loadFromSupabase(this.currentUser.id);
        throw e;
      }
    } else {
      saveScenariosToLocalStorage(this.scenarios);
    }
  }

  /**
   * Force reload from current data source
   */
  async reload(): Promise<void> {
    if (this.isAuthenticatedMode && this.currentUser) {
      await this.loadFromSupabase(this.currentUser.id);
    } else {
      this.loadFromLocalStorage();
    }
  }
}

// Singleton instance
export const scenarioStore = new ScenarioStore();
