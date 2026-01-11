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
import { Save, RotateCcw, ChevronDown, ChevronUp, Copy, MoreHorizontal, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    updateInput,
    batchUpdateInputs,
    saveAsNew,
    duplicateCurrent,
    isEditing,
  } = useActiveScenario(scenarioId);

  const { scenarios, deleteScenario, updateScenario } = useScenarios();
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isRenamingScenario, setIsRenamingScenario] = useState(false);
  const [scenarioName, setScenarioName] = useState("");

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
      // Reset to scenario's original inputs (close without saving further changes)
      navigate("/");
    } else {
      batchUpdateInputs(DEFAULT_INPUTS);
    }
  }, [isEditing, navigate, batchUpdateInputs]);

  const handleSave = useCallback(() => {
    const typeLabel = inputs.scenarioType === "purchase" ? "Purchase" : "Refinance";
    const name = `${typeLabel} ${scenarios.length + 1}`;
    const newScenario = saveAsNew(name);
    
    // Navigate to the new scenario
    setSearchParams({ scenario: newScenario.id });
    
    toast.success("Scenario saved", {
      description: `"${name}" has been saved.`,
    });
  }, [inputs.scenarioType, scenarios.length, saveAsNew, setSearchParams]);

  const handleDuplicate = useCallback(() => {
    const newScenario = duplicateCurrent();
    if (newScenario) {
      setSearchParams({ scenario: newScenario.id });
      toast.success("Scenario duplicated", {
        description: `Created "${newScenario.name}"`,
      });
    }
  }, [duplicateCurrent, setSearchParams]);

  const handleDelete = useCallback(() => {
    if (activeScenario) {
      deleteScenario(activeScenario.id);
      navigate("/");
      toast.success("Scenario deleted");
    }
  }, [activeScenario, deleteScenario, navigate]);

  const handleClose = useCallback(() => {
    navigate("/");
  }, [navigate]);

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

  return (
    <div className="grid w-full max-w-full gap-6 lg:grid-cols-[1fr,380px] lg:gap-10">
      {/* Inputs */}
      <div className="min-w-0 space-y-6">
        {/* Header */}
        <div className="space-y-2">
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
                  className="h-9 max-w-xs text-xl font-semibold"
                  autoFocus
                />
              ) : (
                <h1 
                  className="text-xl font-semibold tracking-tight sm:text-2xl cursor-pointer hover:text-primary transition-colors"
                  onClick={handleStartRename}
                  title="Click to rename"
                >
                  {activeScenario.name}
                </h1>
              )}
              <SaveStatusIndicator status={saveStatus} />
              <Button 
                variant="ghost" 
                size="icon-sm" 
                onClick={handleClose}
                className="ml-auto"
                title="Close scenario"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Mortgage Calculator</h1>
          )}
          <p className="text-sm text-muted-foreground sm:text-base">
            {pageDescription}
          </p>
        </div>

        <div className="card-elevated w-full p-4 sm:p-6 animate-fade-in">
          <div className="space-y-6">
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

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {isEditing ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <MoreHorizontal className="h-4 w-4" />
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={handleStartRename}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDuplicate}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
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
              <Button variant="outline" onClick={handleClose} className="gap-2">
                <X className="h-4 w-4" />
                Close
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" />
                Save scenario
              </Button>
              <Button variant="outline" onClick={handleReset} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </>
          )}
        </div>

        {/* Amortization table */}
        <div className="card-elevated w-full overflow-hidden p-4 sm:p-6">
          <AmortizationTable schedule={results.amortizationSchedule} />
        </div>
      </div>

      {/* Results */}
      <div className="min-w-0 lg:sticky lg:top-20 lg:h-fit">
        <div className="card-elevated w-full p-4 sm:p-6 animate-slide-up">
          <ResultsCard results={results} />
        </div>
      </div>
    </div>
  );
}
