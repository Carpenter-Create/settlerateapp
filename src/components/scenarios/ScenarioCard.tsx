/**
 * ScenarioCard - Scenario-specific mobile card implementation
 * 
 * Built on MobileCard primitive (LOCKED standard).
 * See docs/MOBILE_STANDARD.md for design rules.
 */

import { MoreHorizontal, Copy, Trash2 } from "lucide-react";
import { ScenarioData } from "@/lib/scenarioContract";
import {
  MobileCard,
  MobileCardLabel,
  MobileCardMetric,
  MobileCardMetadata,
  MobileCardDot,
} from "@/components/mobile/MobileCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface ScenarioCardProps {
  scenario: ScenarioData;
  onOpen: (scenario: ScenarioData) => void;
  onDuplicate: (scenario: ScenarioData) => void;
  onDelete: (scenario: ScenarioData) => void;
}

/**
 * Format currency for display
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format relative time for display
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Get monthly payment from scenario
 */
function getMonthlyPayment(scenario: ScenarioData): number | null {
  if (scenario.results?.monthlyTotal != null && scenario.results.monthlyTotal > 0) {
    return scenario.results.monthlyTotal;
  }
  
  const results = scenario.results;
  const inputs = scenario.inputs;
  
  if (!results || !inputs) return null;
  
  const loanAmount = results.loanAmount;
  const interestRate = inputs.shared?.interestRate;
  const loanTerm = inputs.shared?.loanTerm;
  
  if (loanAmount == null || interestRate == null || loanTerm == null) {
    return null;
  }
  
  const monthlyRate = interestRate / 100 / 12;
  const totalPayments = loanTerm * 12;
  
  let monthlyPI = 0;
  if (loanAmount > 0 && monthlyRate > 0) {
    monthlyPI = (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments))) /
      (Math.pow(1 + monthlyRate, totalPayments) - 1);
  } else if (loanAmount > 0 && monthlyRate === 0) {
    monthlyPI = loanAmount / totalPayments;
  }
  
  const propertyTaxMonthly = results.monthlyPropertyTax ?? 0;
  const homeInsuranceMonthly = results.monthlyHomeInsurance ?? 0;
  const hoaMonthly = results.monthlyHOA ?? 0;
  const pmiMonthly = results.monthlyPMI ?? 0;
  
  return monthlyPI + propertyTaxMonthly + homeInsuranceMonthly + hoaMonthly + pmiMonthly;
}

/**
 * Get scenario type label
 */
function getScenarioTypeLabel(scenario: ScenarioData): string {
  const type = scenario.inputs.mode === "refinance" ? "Refinance" : "Purchase";
  const term = scenario.inputs.shared?.loanTerm;
  const termLabel = term ? `${term}-yr fixed` : "";
  return termLabel ? `${type} • ${termLabel}` : type;
}

export function ScenarioCard({ scenario, onOpen, onDuplicate, onDelete }: ScenarioCardProps) {
  const monthlyPayment = getMonthlyPayment(scenario);
  const typeLabel = getScenarioTypeLabel(scenario);
  const updatedAt = formatRelativeTime(new Date(scenario.updatedAt));

  const actions = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 md:opacity-100"
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover">
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(scenario); }}>
          <Copy className="mr-2 h-4 w-4" />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive"
          onClick={(e) => { e.stopPropagation(); onDelete(scenario); }}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <MobileCard onClick={() => onOpen(scenario)} actions={actions}>
      <MobileCardLabel>
        {scenario.name || "Untitled scenario"}
      </MobileCardLabel>
      
      <MobileCardMetric suffix="/ month">
        {monthlyPayment != null ? formatCurrency(monthlyPayment) : "—"}
      </MobileCardMetric>
      
      <MobileCardMetadata>
        <span>{typeLabel}</span>
        <MobileCardDot />
        <span>Updated {updatedAt}</span>
      </MobileCardMetadata>
    </MobileCard>
  );
}
