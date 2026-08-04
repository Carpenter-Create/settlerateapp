/**
 * MortgageCalculator - Calculator Page (Route Handler)
 * 
 * RESPONSIBILITIES:
 * - Read route state (scenario query param)
 * - Choose mode: new (defaults) vs existing (hydrate)
 * - Handle loading and error states
 * - Wire up navigation after save/duplicate actions
 * - Delegate UI rendering to ScenarioEditor
 * - Manage GuidedStart modal using first-run experience standard
 */

import { useCallback, useState, useEffect } from "react";
import { MortgageInputs, DEFAULT_INPUTS, TRANSACTION_TYPE_LABELS } from "@/lib/mortgage";
import { useActiveScenario, useScenarios } from "@/hooks/useScenarios";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useScenarioRoute } from "@/hooks/useScenarioRoute";
import { shouldShowFirstRun, dismissFirstRun } from "@/lib/firstRunExperience";
import { SUCCESS_COPY, ERROR_COPY, LOADING_COPY } from "@/lib/calculatorCopy";
import { ScenarioEditor } from "./ScenarioEditor";
import { GuidedStart } from "./GuidedStart";
import { Button } from "@/components/ui/button";
import { RotateCcw, AlertCircle } from "lucide-react";
import { toast } from "sonner";

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
  const { canSave } = useCapabilities();

  const [showGuidedStart, setShowGuidedStart] = useState(false);
  const [hasCheckedAutoOpen, setHasCheckedAutoOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-open Guided Start for new scenarios using centralized first-run logic
  useEffect(() => {
    if (!isLoaded || hasCheckedAutoOpen) return;
    
    // Use centralized first-run experience standard
    const hasExistingData = !!scenarioId;
    if (shouldShowFirstRun("calculator", hasExistingData)) {
      setShowGuidedStart(true);
    }
    
    setHasCheckedAutoOpen(true);
  }, [isLoaded, scenarioId, hasCheckedAutoOpen]);

  // Handle Guided Start close - mark as dismissed for this session
  const handleGuidedStartOpenChange = useCallback((open: boolean) => {
    if (!open) {
      dismissFirstRun("calculator");
    }
    setShowGuidedStart(open);
  }, []);

  const handleGuidedStartComplete = useCallback(async (guidedInputs: MortgageInputs, name: string) => {
    if (!canSave) {
      toast.error("Cannot save more scenarios on your current plan.");
      return;
    }
    try {
      dismissFirstRun("calculator");
      const newScenario = await createScenario(name, guidedInputs, null);
      navigateToScenario(newScenario.id);
      setShowGuidedStart(false);
      toast(SUCCESS_COPY.created, { 
        description: "Inputs may be revised.",
        duration: 3000 
      });
    } catch (error) {
      toast(ERROR_COPY.invalidInputs);
    }
  }, [canSave, createScenario, navigateToScenario]);

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
          toast(SUCCESS_COPY.saved, { duration: 2000 });
        } else {
          toast(ERROR_COPY.saveFailed);
        }
        return success;
      } else {
        const typeLabel = TRANSACTION_TYPE_LABELS[inputs.mode];
        const name = `${typeLabel} ${scenarios.length + 1}`;
        const newScenario = await saveAsNew(name);
        navigateToScenario(newScenario.id);
        toast(SUCCESS_COPY.created, { duration: 2000 });
        return true;
      }
    } catch (error) {
      toast(ERROR_COPY.saveFailed);
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
      toast(SUCCESS_COPY.created, { duration: 2000 });
      return newScenario.id;
    } catch (error) {
      toast(ERROR_COPY.saveFailed);
      return "";
    }
  }, [saveAsNew, navigateToScenario]);

  // Duplicate: deep clone and navigate to new ID
  const handleDuplicate = useCallback(async (): Promise<string | null> => {
    try {
      const newScenario = await duplicateCurrent();
      
      if (newScenario) {
        navigateToScenario(newScenario.id);
        toast(SUCCESS_COPY.duplicated, { duration: 2000 });
        return newScenario.id;
      } else {
        toast(ERROR_COPY.duplicateFailed);
        return null;
      }
    } catch (error) {
      toast(ERROR_COPY.duplicateFailed);
      return null;
    }
  }, [duplicateCurrent, navigateToScenario]);

  // Delete: remove and navigate to new calculator
  const handleDelete = useCallback(async () => {
    if (activeScenario) {
      try {
        await deleteScenario(activeScenario.id);
        navigateToNew();
        toast(SUCCESS_COPY.deleted, { duration: 2000 });
      } catch (error) {
        toast(ERROR_COPY.deleteFailed);
      }
    }
  }, [activeScenario, deleteScenario, navigateToNew]);

  // Rename: update name in place
  const handleRename = useCallback(async (name: string) => {
    if (activeScenario) {
      try {
        await updateScenario(activeScenario.id, { name });
        toast(SUCCESS_COPY.renamed, { duration: 2000 });
      } catch (error) {
        toast(ERROR_COPY.renameFailed);
      }
    }
  }, [activeScenario, updateScenario]);

  const handleDiscardChanges = useCallback(() => {
    discardDraft();
    toast(SUCCESS_COPY.discarded, { duration: 2000 });
  }, [discardDraft]);

  const handleReset = useCallback(() => {
    batchUpdateInputs(structuredClone(DEFAULT_INPUTS));
  }, [batchUpdateInputs]);

  if (!isLoaded) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded bg-muted animate-pulse" />
          <p className="text-sm text-muted-foreground">{LOADING_COPY.initializing}</p>
        </div>
        <div className="card-elevated h-96 p-6 animate-pulse" />
      </div>
    );
  }

  if (scenarioNotFound && scenarioId) {
    return (
      <div className="card-elevated flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border">
          <AlertCircle className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <h3 className="mt-4 font-serif text-lg">{ERROR_COPY.scenarioNotFound}</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          The requested scenario could not be located. It may have been removed.
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
        onOpenChange={handleGuidedStartOpenChange}
        onComplete={handleGuidedStartComplete}
      />
    </>
  );
}
