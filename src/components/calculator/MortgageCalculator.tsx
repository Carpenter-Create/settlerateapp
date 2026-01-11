/**
 * MortgageCalculator - Calculator Page (Route Handler)
 * 
 * RESPONSIBILITIES:
 * - Read route state (scenario query param)
 * - Choose mode: new (defaults) vs existing (hydrate)
 * - Handle loading and error states
 * - Wire up navigation after save/duplicate actions
 * - Delegate UI rendering to ScenarioEditor
 * 
 * ROUTING CONTRACT (HARD INVARIANTS):
 * 1. If scenario query param exists → NEVER initialize defaults
 * 2. Any action that creates a scenario → navigate to /?scenario=<newId>
 * 3. Reset is the ONLY action that intentionally returns to defaults
 * 4. Calculator has exactly two modes: new (no param) or existing (param)
 */

import { useCallback } from "react";
import { MortgageInputs, DEFAULT_INPUTS } from "@/lib/mortgage";
import { useActiveScenario, useScenarios } from "@/hooks/useScenarios";
import { useScenarioRoute } from "@/hooks/useScenarioRoute";
import { ScenarioEditor } from "./ScenarioEditor";
import { Button } from "@/components/ui/button";
import { RotateCcw, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export function MortgageCalculator() {
  // Route state - single source of truth for URL
  const { scenarioId, mode, navigateToScenario, navigateToNew } = useScenarioRoute();
  
  // Scenario state - manages loading and draft editing
  const {
    inputs,
    results,
    activeScenario,
    saveStatus,
    isLoaded,
    isDirty,
    scenarioNotFound,
    batchUpdateInputs,
    saveDraft,
    saveAsNew,
    duplicateCurrent,
    discardDraft,
    isEditing,
  } = useActiveScenario(scenarioId);

  const { scenarios, deleteScenario, updateScenario } = useScenarios();

  // ============================================================================
  // ACTION HANDLERS - All navigation happens here, not in ScenarioEditor
  // ============================================================================

  // Save: overwrite existing or create new
  const handleSave = useCallback((): boolean => {
    if (isEditing) {
      // Existing scenario mode: save draft to same ID (no navigation)
      const success = saveDraft();
      if (success) {
        toast("Scenario saved.", { duration: 2000 });
      } else {
        toast.error("Failed to save scenario");
      }
      return success;
    } else {
      // New scenario mode: create and navigate to new ID
      const typeLabel = inputs.mode === "purchase" ? "Purchase" : "Refinance";
      const name = `${typeLabel} ${scenarios.length + 1}`;
      const newScenario = saveAsNew(name);
      
      // ROUTING CONTRACT: Navigate to new scenario
      navigateToScenario(newScenario.id);
      toast("Scenario saved.", { duration: 2000 });
      return true;
    }
  }, [isEditing, saveDraft, inputs.mode, scenarios.length, saveAsNew, navigateToScenario]);

  // Save As New: create new scenario with custom name
  const handleSaveAsNew = useCallback((name: string): string => {
    const newScenario = saveAsNew(name);
    
    // ROUTING CONTRACT: Navigate to new scenario
    navigateToScenario(newScenario.id);
    toast("Scenario created.", { duration: 2000 });
    
    return newScenario.id;
  }, [saveAsNew, navigateToScenario]);

  // Duplicate: deep clone and navigate to new ID
  const handleDuplicate = useCallback((): string | null => {
    const newScenario = duplicateCurrent();
    
    if (newScenario) {
      // ROUTING CONTRACT: Navigate to duplicated scenario
      navigateToScenario(newScenario.id);
      toast("Scenario duplicated.", { duration: 2000 });
      return newScenario.id;
    } else {
      toast.error("Could not duplicate scenario");
      return null;
    }
  }, [duplicateCurrent, navigateToScenario]);

  // Delete: remove and navigate to new calculator
  const handleDelete = useCallback(() => {
    if (activeScenario) {
      deleteScenario(activeScenario.id);
      navigateToNew();
      toast("Scenario deleted.", { duration: 2000 });
    }
  }, [activeScenario, deleteScenario, navigateToNew]);

  // Rename: update name in place (no navigation)
  const handleRename = useCallback((name: string) => {
    if (activeScenario) {
      updateScenario(activeScenario.id, { name });
      toast("Scenario renamed.", { duration: 2000 });
    }
  }, [activeScenario, updateScenario]);

  // Discard changes: reset to saved state (no navigation)
  const handleDiscardChanges = useCallback(() => {
    discardDraft();
    toast("Changes discarded.", { duration: 2000 });
  }, [discardDraft]);

  // Reset: only action that intentionally clears to defaults
  const handleReset = useCallback(() => {
    batchUpdateInputs(structuredClone(DEFAULT_INPUTS));
  }, [batchUpdateInputs]);

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (!isLoaded) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="card-elevated h-96 p-6" />
      </div>
    );
  }

  // ============================================================================
  // GUARDRAIL: Scenario not found
  // If scenario param exists but scenario is missing, show error state.
  // This prevents silently falling back to defaults after duplicate/save.
  // ============================================================================

  if (scenarioNotFound && scenarioId) {
    return (
      <div className="card-elevated flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border">
          <AlertCircle className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <h3 className="mt-4 font-serif text-lg">Scenario not found</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          The requested scenario could not be found. It may have been deleted.
        </p>
        <Button 
          onClick={navigateToNew} 
          size="sm" 
          className="mt-6 gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
          Start new scenario
        </Button>
      </div>
    );
  }

  // ============================================================================
  // RENDER: Delegate to ScenarioEditor
  // ============================================================================

  return (
    <ScenarioEditor
      inputs={inputs}
      results={results}
      activeScenario={activeScenario}
      saveStatus={saveStatus}
      isDirty={isDirty}
      isEditing={isEditing}
      scenarioCount={scenarios.length}
      onBatchUpdate={batchUpdateInputs}
      onSave={handleSave}
      onSaveAsNew={handleSaveAsNew}
      onDuplicate={handleDuplicate}
      onDelete={handleDelete}
      onRename={handleRename}
      onDiscardChanges={handleDiscardChanges}
      onReset={handleReset}
    />
  );
}
