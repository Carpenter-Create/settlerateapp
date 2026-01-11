/**
 * ScenarioEditor - Pure editor UI component
 * 
 * RESPONSIBILITIES:
 * - Renders the mortgage calculator form
 * - Displays results and amortization table
 * - Handles user input changes
 * - Triggers save/duplicate/delete actions via callbacks
 * 
 * NON-RESPONSIBILITIES:
 * - Does NOT read URL/route
 * - Does NOT decide whether to use defaults
 * - Does NOT manage scenario loading logic
 */

import { useState, useCallback, useMemo } from "react";
import { MortgageInputs, MortgageResults, ScenarioType, DEFAULT_INPUTS, calculateLoanAmount } from "@/lib/mortgage";
import { Scenario, SaveStatus } from "@/hooks/useScenarios";
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

export interface ScenarioEditorProps {
  // Current state
  inputs: MortgageInputs;
  results: MortgageResults;
  activeScenario: Scenario | null;
  saveStatus: SaveStatus;
  isDirty: boolean;
  isEditing: boolean;
  scenarioCount: number;
  
  // Input change handlers
  onUpdateInput: <K extends keyof MortgageInputs>(key: K, value: MortgageInputs[K]) => void;
  onBatchUpdate: (updates: Partial<MortgageInputs>) => void;
  
  // Scenario actions - return new scenario ID for navigation
  onSave: () => boolean;
  onSaveAsNew: (name: string) => string; // Returns new scenario ID
  onDuplicate: () => string | null; // Returns new scenario ID or null
  onDelete: () => void;
  onRename: (name: string) => void;
  onDiscardChanges: () => void;
  onReset: () => void;
  onClose: () => void;
}

export function ScenarioEditor({
  inputs,
  results,
  activeScenario,
  saveStatus,
  isDirty,
  isEditing,
  scenarioCount,
  onUpdateInput,
  onBatchUpdate,
  onSave,
  onSaveAsNew,
  onDuplicate,
  onDelete,
  onRename,
  onDiscardChanges,
  onReset,
  onClose,
}: ScenarioEditorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isRenamingScenario, setIsRenamingScenario] = useState(false);
  const [scenarioName, setScenarioName] = useState("");
  const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);
  const [saveAsName, setSaveAsName] = useState("");
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  // Start renaming
  const handleStartRename = useCallback(() => {
    if (activeScenario) {
      setScenarioName(activeScenario.name);
      setIsRenamingScenario(true);
    }
  }, [activeScenario]);

  // Save rename
  const handleSaveRename = useCallback(() => {
    if (scenarioName.trim()) {
      onRename(scenarioName.trim());
    }
    setIsRenamingScenario(false);
  }, [scenarioName, onRename]);

  const handleScenarioTypeChange = useCallback((type: ScenarioType) => {
    onBatchUpdate({ scenarioType: type });
  }, [onBatchUpdate]);

  const handleReset = useCallback(() => {
    if (isEditing) {
      onDiscardChanges();
    } else {
      onReset();
    }
  }, [isEditing, onDiscardChanges, onReset]);

  // Open Save As dialog
  const handleOpenSaveAs = useCallback(() => {
    const typeLabel = inputs.scenarioType === "purchase" ? "Purchase" : "Refinance";
    const baseName = activeScenario?.name ?? `${typeLabel} ${scenarioCount + 1}`;
    setSaveAsName(baseName);
    setShowSaveAsDialog(true);
  }, [inputs.scenarioType, scenarioCount, activeScenario]);

  // Handle close with unsaved changes check
  const handleClose = useCallback(() => {
    if (isDirty) {
      setShowDiscardDialog(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  // Confirm discard and close
  const handleConfirmDiscard = useCallback(() => {
    setShowDiscardDialog(false);
    onClose();
  }, [onClose]);

  // Calculate LTV for PMI logic
  const ltvRatio = useMemo(() => {
    const { loanAmount, homeValue } = calculateLoanAmount(inputs);
    return homeValue > 0 ? (loanAmount / homeValue) * 100 : 0;
  }, [inputs]);

  // Helper text based on scenario type
  const pageDescription = inputs.scenarioType === "purchase"
    ? "Calculate your monthly payment and total costs for a new home purchase"
    : "Compare your new loan terms and see potential savings";

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
                  onUpdate={onUpdateInput}
                  onBatchUpdate={onBatchUpdate}
                />
              ) : (
                <RefinanceInputs
                  inputs={inputs}
                  onUpdate={onUpdateInput}
                  onBatchUpdate={onBatchUpdate}
                />
              )}

              {/* Shared loan terms */}
              <div className="grid gap-5 md:grid-cols-2">
                <InputField 
                  label={inputs.scenarioType === "purchase" ? "Interest rate" : "New interest rate"}
                >
                  <PercentInput
                    value={inputs.interestRate}
                    onChange={(v) => onUpdateInput("interestRate", v)}
                    min={0}
                    max={25}
                    step={0.125}
                  />
                </InputField>

                <LoanTermInput
                  value={inputs.loanTerm}
                  onChange={(v) => onUpdateInput("loanTerm", v)}
                  label={inputs.scenarioType === "purchase" ? "Loan term" : "New loan term"}
                />
              </div>

              <div className="divider-subtle" />

              {/* Taxes & Insurance Section (Optional) */}
              <TaxInsuranceSection
                inputs={inputs}
                ltvRatio={ltvRatio}
                onUpdate={onUpdateInput}
                onBatchUpdate={onBatchUpdate}
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
                      onChange={(v) => onUpdateInput("extraMonthlyPayment", v)}
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
                      onChange={(v) => onUpdateInput("oneTimePrincipalPayment", v)}
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
                  onClick={onSave} 
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
                    <DropdownMenuItem onClick={onDuplicate}>
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
                      onClick={onDelete}
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
                <Button onClick={onSave} size="sm" className="gap-1.5">
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
                if (e.key === "Enter" && saveAsName.trim()) {
                  setShowSaveAsDialog(false);
                  onSaveAsNew(saveAsName.trim());
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveAsDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (saveAsName.trim()) {
                  setShowSaveAsDialog(false);
                  onSaveAsNew(saveAsName.trim());
                }
              }} 
              disabled={!saveAsName.trim()}
            >
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
