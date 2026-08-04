/**
 * Scenario Store - Supabase-first persistence layer
 *
 * Uses Supabase for both anonymous and authenticated users.
 * LocalStorage is only used as an emergency offline fallback.
 *
 * Calculation dispatch: all create/update/load paths hydrate through
 * calculateScenario via scenarioContract / scenarioPersistence (DEF-001).
 */

import { MortgageInputs } from "@/lib/mortgage";
import {
  ScenarioData,
  createScenarioData,
  duplicateScenarioData,
  updateScenarioInputs,
  updateScenarioName,
  recalculateActiveSnapshot,
  CALCULATOR_VERSION,
  LATEST_SCHEMA_VERSION,
} from "@/lib/scenarioContract";
import {
  migrateScenario,
} from "@/lib/scenarioMigrations";
import {
  hydrateScenarioData,
  toDerivedPersistencePayload,
} from "@/lib/scenarioPersistence";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { serializeInputsForSupabase } from "@/lib/scenarioInputSerialization";
import { User } from "@supabase/supabase-js";

const STORAGE_KEY = "settlerate_scenarios_fallback";

type Listener = () => void;

export interface StoreSnapshot {
  scenarios: ScenarioData[];
  isLoaded: boolean;
  isOnline: boolean;
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
  const rawObj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  return hydrateScenarioData({
    id: migrated.id,
    ownerId: migrated.ownerId ?? null,
    name: migrated.name,
    createdAt: new Date(migrated.createdAt),
    updatedAt: new Date(migrated.updatedAt),
    sourceScenarioId: migrated.sourceScenarioId ?? null,
    inputs: migrated.inputs,
    assumptions: migrated.assumptions as ScenarioData["assumptions"],
    schemaVersion: migrated.schemaVersion,
    calculatorVersion: migrated.calculatorVersion,
    results: migrated.results,
    originalSnapshot: rawObj.originalSnapshot ?? (migrated as unknown as Record<string, unknown>).originalSnapshot,
    activeSnapshot: rawObj.activeSnapshot ?? (migrated as unknown as Record<string, unknown>).activeSnapshot,
    originalCalculatorVersion:
      (rawObj.originalCalculatorVersion as string | undefined) ??
      ((migrated as unknown as Record<string, unknown>).originalCalculatorVersion as string | undefined),
    activeCalculatorVersion:
      (rawObj.activeCalculatorVersion as string | undefined) ??
      ((migrated as unknown as Record<string, unknown>).activeCalculatorVersion as string | undefined),
  });
}

function loadScenariosFromFallbackStorage(): ScenarioData[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const scenarios: ScenarioData[] = [];

      for (const raw of parsed) {
        const migrated = loadAndMigrateScenario(raw);
        if (migrated) {
          scenarios.push(migrated);
        }
      }

      return scenarios;
    }
  } catch (e) {
    console.error("Failed to load scenarios from fallback storage:", e);
  }
  return [];
}

function saveScenariosToFallbackStorage(scenarios: ScenarioData[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
  } catch (e) {
    console.error("Failed to save scenarios to fallback storage:", e);
  }
}

function clearFallbackStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear fallback storage:", e);
  }
}

/**
 * Generate a stable client ID for deduplication across migrations
 */
export function ensureClientId(inputs: MortgageInputs): MortgageInputs {
  const inputsAny = inputs as unknown as Record<string, unknown>;
  if (inputsAny.client_id) {
    return inputs;
  }
  return {
    ...inputs,
    client_id: crypto.randomUUID(),
  } as MortgageInputs;
}

/**
 * Convert ScenarioData to Supabase row format.
 * Dual snapshots live in the existing JSON `derived` column (no table migration).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toSupabaseRow(scenario: ScenarioData, userId: string): any {
  const inputsWithClientId = ensureClientId(scenario.inputs);
  return {
    user_id: userId,
    name: scenario.name,
    scenario_type: inputsWithClientId.mode || "purchase",
    schema_version: scenario.schemaVersion,
    inputs: serializeInputsForSupabase(inputsWithClientId),
    derived: toDerivedPersistencePayload(scenario) as unknown,
    is_archived: false,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromSupabaseRow(row: any): ScenarioData {
  const inputs = row.inputs as MortgageInputs;
  const derived = (row.derived ?? {}) as {
    assumptions?: ScenarioData["assumptions"];
    sourceScenarioId?: string | null;
    calculatorVersion?: string;
    originalCalculatorVersion?: string;
    activeCalculatorVersion?: string;
    originalSnapshot?: unknown;
    activeSnapshot?: unknown;
  };
  const assumptions = derived.assumptions ?? {
    amortizationType: "standard" as const,
    pmiRemovalThreshold: 80,
    defaultPmiRate: 0.5,
    assumePrepaymentPenalty: false,
    taxDeductible: false,
    calculatorVersion: CALCULATOR_VERSION,
  };

  return hydrateScenarioData({
    id: row.id,
    ownerId: row.user_id,
    name: row.name,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    sourceScenarioId: derived.sourceScenarioId ?? null,
    inputs,
    assumptions,
    schemaVersion: row.schema_version,
    calculatorVersion: derived.calculatorVersion ?? CALCULATOR_VERSION,
    originalSnapshot: derived.originalSnapshot,
    activeSnapshot: derived.activeSnapshot,
    originalCalculatorVersion: derived.originalCalculatorVersion,
    activeCalculatorVersion: derived.activeCalculatorVersion,
  });
}

/**
 * Build a schema-v2 dual-snapshot duplicate bound to a server-assigned row id.
 * Used after duplicate_scenario RPC so the DB row is immediately contract-valid.
 */
export function materializeDuplicatedScenario(
  source: ScenarioData,
  server: {
    id: string;
    name: string;
    ownerId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }
): ScenarioData {
  const fresh = duplicateScenarioData(source, server.ownerId);
  return {
    ...fresh,
    id: server.id,
    name: server.name,
    createdAt: server.createdAt,
    updatedAt: server.updatedAt,
    ownerId: server.ownerId,
    sourceScenarioId: source.id,
    schemaVersion: LATEST_SCHEMA_VERSION,
  };
}

/**
 * Unified Scenario Store - Supabase-first
 *
 * All scenarios are stored in Supabase using auth.uid() (anonymous or real).
 * LocalStorage is only used as offline fallback.
 */
export class ScenarioStore {
  private scenarios: ScenarioData[] = [];
  private isLoaded = false;
  private isOnline = true;
  private currentUser: User | null = null;
  private listeners = new Set<Listener>();
  private snapshot: StoreSnapshot;
  private fallbackMode = false;

  constructor() {
    this.snapshot = {
      scenarios: [],
      isLoaded: false,
      isOnline: true,
    };
  }

  /**
   * Initialize store with current user (anonymous or authenticated)
   */
  async initialize(user: User | null): Promise<void> {
    this.currentUser = user;

    if (user) {
      await this.loadFromSupabase(user.id);
      // Sync any fallback data if we were offline
      await this.syncFallbackToSupabase();
    } else {
      // No session yet - wait for auth to initialize
      this.scenarios = [];
      this.isLoaded = true;
      this.notify();
    }
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
      this.isOnline = true;
      this.fallbackMode = false;
      this.notify();
    } catch (e) {
      console.error("Failed to load scenarios from Supabase:", e);
      // Fall back to local storage
      this.scenarios = loadScenariosFromFallbackStorage();
      this.isLoaded = true;
      this.isOnline = false;
      this.fallbackMode = true;
      this.notify();
    }
  }

  private async syncFallbackToSupabase(): Promise<void> {
    if (!this.currentUser || !this.isOnline) return;

    const fallbackScenarios = loadScenariosFromFallbackStorage();
    if (fallbackScenarios.length === 0) return;

    try {
      // Upload fallback scenarios to Supabase
      const rows = fallbackScenarios.map((s) => toSupabaseRow(s, this.currentUser!.id));
      const { error } = await supabase.from("scenarios").insert(rows);

      if (!error) {
        clearFallbackStorage();
        // Reload to get canonical state
        await this.loadFromSupabase(this.currentUser.id);
      }
    } catch (e) {
      console.error("Failed to sync fallback scenarios:", e);
    }
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
      isOnline: this.isOnline,
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

  private async updateInSupabase(scenario: ScenarioData): Promise<void> {
    if (!this.currentUser) throw new Error("Not authenticated");

    const row = toSupabaseRow(scenario, this.currentUser.id);
    const updatePayload: Database["public"]["Tables"]["scenarios"]["Update"] = {
      name: row.name,
      inputs: row.inputs,
      scenario_type: row.scenario_type,
      schema_version: row.schema_version,
      derived: row.derived,
    };

    const { error } = await supabase
      .from("scenarios")
      .update(updatePayload)
      .eq("id", scenario.id)
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
    const inputsWithClientId = ensureClientId(inputs);
    const scenario = createScenarioData(
      name,
      inputsWithClientId,
      this.currentUser?.id ?? null,
      sourceScenarioId ?? null
    );

    if (this.currentUser && !this.fallbackMode) {
      try {
        const persisted = await this.persistToSupabase(scenario);
        this.scenarios = [persisted, ...this.scenarios];
        this.notify();
        return persisted;
      } catch (e) {
        console.error("Failed to create scenario in Supabase:", e);
        // Fall back to local storage
        this.fallbackMode = true;
        this.isOnline = false;
        this.scenarios = [scenario, ...this.scenarios];
        saveScenariosToFallbackStorage(this.scenarios);
        this.notify();
        return scenario;
      }
    } else {
      // Fallback mode
      this.scenarios = [scenario, ...this.scenarios];
      saveScenariosToFallbackStorage(this.scenarios);
      this.notify();
      return scenario;
    }
  }

  /**
   * Persist an already-computed scenario update through the shared update path.
   * Keeps in-memory state and durable storage aligned (no deferred write).
   */
  private async persistScenarioUpdate(scenario: ScenarioData): Promise<void> {
    this.scenarios = this.scenarios.map((s) =>
      s.id === scenario.id ? scenario : s
    );
    this.notify();

    if (this.currentUser && !this.fallbackMode) {
      try {
        await this.updateInSupabase(scenario);
      } catch (e) {
        console.error("Failed to update scenario in Supabase:", e);
        this.fallbackMode = true;
        this.isOnline = false;
        saveScenariosToFallbackStorage(this.scenarios);
        this.notify();
      }
    } else {
      saveScenariosToFallbackStorage(this.scenarios);
    }
  }

  async updateScenario(
    id: string,
    updates: Partial<Pick<ScenarioData, "name" | "inputs">>
  ): Promise<void> {
    const existing = this.scenarios.find((s) => s.id === id);
    if (!existing) return;

    let updated = existing;
    if (updates.name !== undefined) {
      updated = updateScenarioName(updated, updates.name);
    }
    if (updates.inputs !== undefined) {
      updated = updateScenarioInputs(updated, updates.inputs);
    }

    await this.persistScenarioUpdate(updated);
  }

  /**
   * Explicit recalculation: updates activeSnapshot only and persists immediately
   * through the same update path as other scenario writes.
   */
  async recalculateScenario(id: string): Promise<ScenarioData | null> {
    const existing = this.scenarios.find((s) => s.id === id);
    if (!existing) return null;

    const recalculated = recalculateActiveSnapshot(existing);
    await this.persistScenarioUpdate(recalculated);
    return this.scenarios.find((s) => s.id === id) ?? recalculated;
  }

  async duplicateScenario(id: string): Promise<ScenarioData | null> {
    const original = this.scenarios.find((s) => s.id === id);
    if (!original) return null;

    if (this.currentUser && !this.fallbackMode) {
      try {
        // RPC inserts a row (may copy pre-v2 derived). Immediately normalize
        // to schema v2 dual-snapshot contract and persist — no deferred recovery.
        const { data, error } = await supabase.rpc("duplicate_scenario", {
          source_scenario_id: id,
        });

        if (error) throw error;

        const newId = data as string;
        const { data: row, error: fetchError } = await supabase
          .from("scenarios")
          .select("*")
          .eq("id", newId)
          .eq("user_id", this.currentUser.id)
          .single();

        if (fetchError) throw fetchError;
        if (!row) throw new Error("Duplicated scenario row not found");

        const materialized = materializeDuplicatedScenario(original, {
          id: row.id,
          name: row.name,
          ownerId: row.user_id,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(),
        });

        await this.updateInSupabase(materialized);
        this.scenarios = [materialized, ...this.scenarios];
        this.notify();
        return materialized;
      } catch (e) {
        console.error("Failed to duplicate scenario:", e);
        throw e;
      }
    } else {
      // Fallback mode: local duplication (already schema v2 dual-snapshot)
      const duplicate = duplicateScenarioData(original);
      this.scenarios = [duplicate, ...this.scenarios];
      saveScenariosToFallbackStorage(this.scenarios);
      this.notify();
      return duplicate;
    }
  }

  async deleteScenario(id: string): Promise<void> {
    // Optimistic update
    this.scenarios = this.scenarios.filter((s) => s.id !== id);
    this.notify();

    if (this.currentUser && !this.fallbackMode) {
      try {
        await this.deleteFromSupabase(id);
      } catch (e) {
        console.error("Failed to delete scenario:", e);
        // Reload to restore state
        await this.loadFromSupabase(this.currentUser.id);
        throw e;
      }
    } else {
      saveScenariosToFallbackStorage(this.scenarios);
    }
  }

  /**
   * Force reload from Supabase
   */
  async reload(): Promise<void> {
    if (this.currentUser) {
      await this.loadFromSupabase(this.currentUser.id);
    }
  }

  /**
   * Check if user has any scenarios (for first-run experience)
   */
  hasScenarios(): boolean {
    return this.scenarios.length > 0;
  }
}

// Singleton instance
export const scenarioStore = new ScenarioStore();
