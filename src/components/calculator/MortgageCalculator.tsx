import { useState, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { MortgageInputs, ScenarioType, calculateMortgage, DEFAULT_INPUTS, calculateLoanAmount } from "@/lib/mortgage";
import { useActiveScenario, useScenarios, Scenario } from "@/hooks/useScenarios";
import { PercentInput } from "./PercentInput";
import { InputField } from "./InputField";
import { LoanTermInput } from "./LoanTermInput";
import { ScenarioTypeSelector } from "./ScenarioTypeSelector";
import { PurchaseInputs } from "./PurchaseInputs";
import { RefinanceInputs } from "./RefinanceInputs";
import { TaxInsuranceSection } from "./TaxInsuranceSection";
import { ResultsCard } from "./ResultsCard";
import { AmortizationTable } from "./AmortizationTable";
import { SaveStatusIndicator } from "./SaveStatusIndicator";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "./CurrencyInput";
import { Input } from "@/components/ui/input";
import { Save, RotateCcw, ChevronDown, ChevronUp, Copy, MoreHorizontal, X, Pencil, FilePlus } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function MortgageCalculator() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scenarioId = searchParams.get("scenario");
  
  const {
    inputs,
    results,
    activeScenario,
    saveStatus,
    isLoaded,
    isDirty,
    scenarioNotFound,
    updateInput,
    batchUpdateInputs,
    saveDraft,
    saveAsNew,
    duplicateCurrent,
    discardDraft,
    isEditing,
  } = useActiveScenario(scenarioId);

  const { scenarios, deleteScenario, updateScenario } = useScenarios();
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isRenamingScenario, setIsRenamingScenario] = useState(false);
  const [scenarioName, setScenarioName] = useState("");
  const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);
  const [saveAsName, setSaveAsName] = useState("");
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [pendingNavigate, setPendingNavigate] = useState<string | null>(null);

  // Start renaming
  const handleStartRename = useCallback(() => {
    if (activeScenario) {
      setScenarioName(activeScenario.name);
      setIsRenamingScenario(true);
    }
  }, [activeScenario]);

  // Save rename
  const handleSaveRename = useCallback(() => {
    if (activeScenario && scenarioName.trim()) {
      updateScenario(activeScenario.id, { name: scenarioName.trim() });
      toast.success("Scenario renamed");
    }
    setIsRenamingScenario(false);
  }, [activeScenario, scenarioName, updateScenario]);

  const handleScenarioTypeChange = useCallback((type: ScenarioType) => {
    batchUpdateInputs({ scenarioType: type });
  }, [batchUpdateInputs]);

  const handleReset = useCallback(() => {
    if (isEditing) {
      // Reset to scenario's original inputs
      discardDraft();
      toast.success("Changes discarded");
    } else {
      batchUpdateInputs(DEFAULT_INPUTS);
    }
  }, [isEditing, discardDraft, batchUpdateInputs]);

  // Save existing scenario (overwrite)
  const handleSave = useCallback(() => {
    if (isEditing) {
      // Save draft to existing scenario
      const success = saveDraft();
      if (success) {
        toast.success("Scenario saved");
      } else {
        toast.error("Failed to save scenario");
      }
    } else {
      // Create new scenario
      const typeLabel = inputs.scenarioType === "purchase" ? "Purchase" : "Refinance";
      const name = `${typeLabel} ${scenarios.length + 1}`;
      const newScenario = saveAsNew(name);
      setSearchParams({ scenario: newScenario.id });
      toast.success("Scenario saved", {
        description: `"${name}" has been saved.`,
      });
    }
  }, [isEditing, saveDraft, inputs.scenarioType, scenarios.length, saveAsNew, setSearchParams]);

  // Open Save As dialog
  const handleOpenSaveAs = useCallback(() => {
    const typeLabel = inputs.scenarioType === "purchase" ? "Purchase" : "Refinance";
    const baseName = activeScenario?.name ?? `${typeLabel} ${scenarios.length + 1}`;
    setSaveAsName(baseName);
    setShowSaveAsDialog(true);
  }, [inputs.scenarioType, scenarios.length, activeScenario]);

  // Confirm Save As
  const handleConfirmSaveAs = useCallback(() => {
    if (!saveAsName.trim()) return;
    
    const newScenario = saveAsNew(saveAsName.trim());
    setShowSaveAsDialog(false);
    setSearchParams({ scenario: newScenario.id });
    
    toast.success("Scenario created", {
      description: `"${newScenario.name}" has been saved.`,
    });
  }, [saveAsName, saveAsNew, setSearchParams]);

  const handleDuplicate = useCallback(() => {
    const newScenario = duplicateCurrent();
    if (newScenario) {
      // Navigate to the newly created duplicate scenario
      setSearchParams({ scenario: newScenario.id });
      toast("Scenario duplicated.", {
        duration: 3000,
      });
    } else {
      toast.error("Could not duplicate scenario");
    }
  }, [duplicateCurrent, setSearchParams]);

  const handleDelete = useCallback(() => {
    if (activeScenario) {
      deleteScenario(activeScenario.id);
      navigate("/");
      toast.success("Scenario deleted");
    }
  }, [activeScenario, deleteScenario, navigate]);

  // Handle close with unsaved changes check
  const handleClose = useCallback(() => {
    if (isDirty) {
      setPendingNavigate("/");
      setShowDiscardDialog(true);
    } else {
      navigate("/");
    }
  }, [isDirty, navigate]);

  // Confirm discard and navigate
  const handleConfirmDiscard = useCallback(() => {
    setShowDiscardDialog(false);
    if (pendingNavigate) {
      navigate(pendingNavigate);
      setPendingNavigate(null);
    }
  }, [navigate, pendingNavigate]);

  // Calculate LTV for PMI logic
  const ltvRatio = useMemo(() => {
    const { loanAmount, homeValue } = calculateLoanAmount(inputs);
    return homeValue > 0 ? (loanAmount / homeValue) * 100 : 0;
  }, [inputs]);

  // Helper text based on scenario type
  const pageDescription = inputs.scenarioType === "purchase"
    ? "Calculate your monthly payment and total costs for a new home purchase"
    : "Compare your new loan terms and see potential savings";

  if (!isLoaded) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="card-elevated h-96 p-6" />
      </div>
    );
  }

  // GUARDRAIL: If a scenario param was provided but not found, show error state
  // This prevents silently falling back to defaults after duplicate/save actions
  if (scenarioNotFound && scenarioId) {
    return (
      <div className="card-elevated flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border">
          <X className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <h3 className="mt-4 font-serif text-lg">Scenario not found</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          The scenario "{scenarioId}" could not be found. It may have been deleted.
        </p>
        <Button 
          onClick={() => navigate("/")} 
          size="sm" 
          className="mt-6 gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
          Start new scenario
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="grid w-full max-w-full gap-8 lg:grid-cols-[1fr,360px] lg:gap-12">
        {/* Inputs */}
        <div className="min-w-0 space-y-6">
          {/* Header - serif, understated */}
          <div className="space-y-1">
            {isEditing && activeScenario ? (
              <div className="flex items-center gap-3">
                {isRenamingScenario ? (
                  <Input
                    value={scenarioName}
                    onChange={(e) => setScenarioName(e.target.value)}
                    onBlur={handleSaveRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveRename();
                      if (e.key === "Escape") setIsRenamingScenario(false);
                    }}
                    className="h-9 max-w-xs font-serif text-xl"
                    autoFocus
                  />
                ) : (
                  <h1 
                    className="cursor-pointer hover:text-muted-foreground transition-colors"
                    onClick={handleStartRename}
                    title="Click to rename"
                  >
                    {activeScenario.name}
                  </h1>
                )}
                <SaveStatusIndicator status={saveStatus} isDirty={isDirty} />
                <Button 
                  variant="ghost" 
                  size="icon-sm" 
                  onClick={handleClose}
                  className="ml-auto"
                  title="Close scenario"
                >
                  <X className="h-4 w-4" strokeWidth={1.5} />
                </Button>
              </div>
            ) : (
              <h1>Mortgage Calculator</h1>
            )}
            <p className="text-muted-foreground">
              {pageDescription}
            </p>
          </div>

          <div className="card-elevated w-full p-5 sm:p-6">
            <div className="space-y-5">
              {/* Scenario Type Selector */}
              <ScenarioTypeSelector
                value={inputs.scenarioType}
                onChange={handleScenarioTypeChange}
              />

              <div className="divider-subtle" />

              {/* Conditional inputs based on scenario type */}
              {inputs.scenarioType === "purchase" ? (
                <PurchaseInputs
                  inputs={inputs}
                  onUpdate={updateInput}
                  onBatchUpdate={batchUpdateInputs}
                />
              ) : (
                <RefinanceInputs
                  inputs={inputs}
                  onUpdate={updateInput}
                  onBatchUpdate={batchUpdateInputs}
                />
              )}

              {/* Shared loan terms */}
              <div className="grid gap-5 md:grid-cols-2">
                <InputField 
                  label={inputs.scenarioType === "purchase" ? "Interest rate" : "New interest rate"}
                >
                  <PercentInput
                    value={inputs.interestRate}
                    onChange={(v) => updateInput("interestRate", v)}
                    min={0}
                    max={25}
                    step={0.125}
                  />
                </InputField>

                <LoanTermInput
                  value={inputs.loanTerm}
                  onChange={(v) => updateInput("loanTerm", v)}
                  label={inputs.scenarioType === "purchase" ? "Loan term" : "New loan term"}
                />
              </div>

              <div className="divider-subtle" />

              {/* Taxes & Insurance Section (Optional) */}
              <TaxInsuranceSection
                inputs={inputs}
                ltvRatio={ltvRatio}
                onUpdate={updateInput}
                onBatchUpdate={batchUpdateInputs}
              />

              <div className="divider-subtle" />

              {/* Advanced options toggle */}
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex w-full items-center justify-between py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <span>Extra payments</span>
                {showAdvanced ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {/* Advanced inputs */}
              {showAdvanced && (
                <div className="space-y-5 animate-slide-up">
                  <InputField
                    label="Extra monthly payment"
                    description="Additional principal payment each month"
                    optional
                  >
                    <CurrencyInput
                      value={inputs.extraMonthlyPayment}
                      onChange={(v) => updateInput("extraMonthlyPayment", v)}
                      min={0}
                    />
                  </InputField>

                  <InputField
                    label="One-time principal payment"
                    description="Lump sum payment toward principal"
                    optional
                  >
                    <CurrencyInput
                      value={inputs.oneTimePrincipalPayment ?? 0}
                      onChange={(v) => updateInput("oneTimePrincipalPayment", v)}
                      min={0}
                    />
                  </InputField>
                </div>
              )}
            </div>
          </div>

          {/* Actions - minimal */}
          <div className="flex flex-wrap items-center gap-2">
            {isEditing ? (
              <>
                <Button 
                  onClick={handleSave} 
                  size="sm" 
                  className="gap-1.5"
                  disabled={!isDirty}
                >
                  <Save className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Save
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={handleOpenSaveAs}>
                      <FilePlus className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
                      Save as new
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDuplicate}>
                      <Copy className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleStartRename}>
                      <Pencil className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleReset}
                      disabled={!isDirty}
                    >
                      <RotateCcw className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
                      Discard changes
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleDelete}
                      className="text-destructive focus:text-destructive"
                    >
                      Delete scenario
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="sm" onClick={handleClose} className="gap-1.5">
                  <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Close
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handleSave} size="sm" className="gap-1.5">
                  <Save className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Save scenario
                </Button>
                <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Reset
                </Button>
              </>
            )}
          </div>

          {/* Amortization table */}
          <div className="card-elevated w-full overflow-hidden p-5 sm:p-6">
            <AmortizationTable schedule={results.amortizationSchedule} />
          </div>
        </div>

        {/* Results - sticky sidebar */}
        <div className="min-w-0 lg:sticky lg:top-16 lg:h-fit">
          <div className="card-elevated w-full p-5 sm:p-6">
            <ResultsCard results={results} />
          </div>
        </div>
      </div>

      {/* Save As Dialog */}
      <Dialog open={showSaveAsDialog} onOpenChange={setShowSaveAsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as new scenario</DialogTitle>
            <DialogDescription>
              Create a new scenario with the current inputs. The original scenario will remain unchanged.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={saveAsName}
              onChange={(e) => setSaveAsName(e.target.value)}
              placeholder="Scenario name"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirmSaveAs();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveAsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSaveAs} disabled={!saveAsName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discard Changes Dialog */}
      <Dialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes to this scenario. Do you want to discard them?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDiscardDialog(false)}>
              Keep editing
            </Button>
            <Button variant="destructive" onClick={handleConfirmDiscard}>
              Discard changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
