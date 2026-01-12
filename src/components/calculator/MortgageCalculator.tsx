/**
 * MortgageCalculator - Calculator Page (Route Handler)
 * 
 * RESPONSIBILITIES:
 * - Read route state (scenario query param)
 * - Choose mode: new (defaults) vs existing (hydrate)
 * - Handle loading and error states
 * - Wire up navigation after save/duplicate actions
 * - Delegate UI rendering to ScenarioEditor
 * - Manage GuidedStart modal for new users
 */

import { useCallback, useState, useEffect } from "react";
import { MortgageInputs, DEFAULT_INPUTS, TRANSACTION_TYPE_LABELS } from "@/lib/mortgage";
import { useActiveScenario, useScenarios } from "@/hooks/useScenarios";
import { useScenarioRoute } from "@/hooks/useScenarioRoute";
import { ScenarioEditor } from "./ScenarioEditor";
import { GuidedStart } from "./GuidedStart";
import { Button } from "@/components/ui/button";
import { RotateCcw, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const GUIDED_START_SHOWN_KEY = "settlerate_guided_start_shown";

export function MortgageCalculator() {
  const { scenarioId, mode, navigateToScenario, navigateToNew } = useScenarioRoute();
  
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

  const { scenarios, deleteScenario, updateScenario, createScenario } = useScenarios();

  const [showGuidedStart, setShowGuidedStart] = useState(false);
  const [hasCheckedFirstTime, setHasCheckedFirstTime] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isLoaded || hasCheckedFirstTime) return;
    
    const hasShownBefore = localStorage.getItem(GUIDED_START_SHOWN_KEY) === "true";
    
    if (scenarios.length === 0 && !hasShownBefore && !scenarioId) {
      setShowGuidedStart(true);
      localStorage.setItem(GUIDED_START_SHOWN_KEY, "true");
    }
    
    setHasCheckedFirstTime(true);
  }, [isLoaded, scenarios.length, scenarioId, hasCheckedFirstTime]);

  const handleGuidedStartComplete = useCallback(async (guidedInputs: MortgageInputs, name: string) => {
    try {
      const newScenario = await createScenario(name, guidedInputs, null);
      navigateToScenario(newScenario.id);
      setShowGuidedStart(false);
      toast("Scenario created.", { 
        description: "Inputs may be revised.",
        duration: 3000 
      });
    } catch (error) {
      toast("Modeling error. Review inputs and try again.");
    }
  }, [createScenario, navigateToScenario]);

  const handleOpenGuidedStart = useCallback(() => {
    setShowGuidedStart(true);
  }, []);

  // Save: overwrite existing or create new
  const handleSave = useCallback(async (): Promise<boolean> => {
    if (isSaving) return false;
    setIsSaving(true);
    
    try {
      if (isEditing) {
        const success = await saveDraft();
        if (success) {
          toast("Changes saved.", { duration: 2000 });
        } else {
          toast("Save unsuccessful. Try again.");
        }
        return success;
      } else {
        const typeLabel = TRANSACTION_TYPE_LABELS[inputs.mode];
        const name = `${typeLabel} ${scenarios.length + 1}`;
        const newScenario = await saveAsNew(name);
        navigateToScenario(newScenario.id);
        toast("Scenario created.", { duration: 2000 });
        return true;
      }
    } catch (error) {
      toast("Save unsuccessful. Try again.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [isEditing, saveDraft, inputs.mode, scenarios.length, saveAsNew, navigateToScenario, isSaving]);

  // Save As New: create new scenario with custom name
  const handleSaveAsNew = useCallback(async (name: string): Promise<string> => {
    try {
      const newScenario = await saveAsNew(name);
      navigateToScenario(newScenario.id);
      toast("Scenario created.", { duration: 2000 });
      return newScenario.id;
    } catch (error) {
      toast("Save unsuccessful. Try again.");
      return "";
    }
  }, [saveAsNew, navigateToScenario]);

  // Duplicate: deep clone and navigate to new ID
  const handleDuplicate = useCallback(async (): Promise<string | null> => {
    try {
      const newScenario = await duplicateCurrent();
      
      if (newScenario) {
        navigateToScenario(newScenario.id);
        toast("Scenario duplicated.", { duration: 2000 });
        return newScenario.id;
      } else {
        toast("Duplicate unsuccessful. Try again.");
        return null;
      }
    } catch (error) {
      toast("Duplicate unsuccessful. Try again.");
      return null;
    }
  }, [duplicateCurrent, navigateToScenario]);

  // Delete: remove and navigate to new calculator
  const handleDelete = useCallback(async () => {
    if (activeScenario) {
      try {
        await deleteScenario(activeScenario.id);
        navigateToNew();
        toast("Scenario removed.", { duration: 2000 });
      } catch (error) {
        toast("Delete unsuccessful. Try again.");
      }
    }
  }, [activeScenario, deleteScenario, navigateToNew]);

  // Rename: update name in place
  const handleRename = useCallback(async (name: string) => {
    if (activeScenario) {
      try {
        await updateScenario(activeScenario.id, { name });
        toast("Scenario renamed.", { duration: 2000 });
      } catch (error) {
        toast("Rename unsuccessful. Try again.");
      }
    }
  }, [activeScenario, updateScenario]);

  const handleDiscardChanges = useCallback(() => {
    discardDraft();
    toast("Changes discarded.", { duration: 2000 });
  }, [discardDraft]);

  const handleReset = useCallback(() => {
    batchUpdateInputs(structuredClone(DEFAULT_INPUTS));
  }, [batchUpdateInputs]);

  if (!isLoaded) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="card-elevated h-96 p-6" />
      </div>
    );
  }

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
          Create new scenario
        </Button>
      </div>
    );
  }

  return (
    <>
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
        onOpenGuidedStart={handleOpenGuidedStart}
      />

      <GuidedStart
        open={showGuidedStart}
        onOpenChange={setShowGuidedStart}
        onComplete={handleGuidedStartComplete}
      />
    </>
  );
}
