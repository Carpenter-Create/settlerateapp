/**
 * Export Button Components
 * 
 * Professional export actions for scenarios and comparisons.
 * Access control: Professional Review tier and admin only.
 */

import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCapabilities } from "@/hooks/useCapabilities";
import { ScenarioData } from "@/lib/scenarioContract";
import {
  exportScenarioPDF,
  exportComparisonPDF,
} from "@/lib/exports/exportPDF";

interface ScenarioExportButtonProps {
  scenario: ScenarioData;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

/**
 * Single Scenario PDF Export Button
 * 
 * Exports a single scenario as a lender-ready PDF document.
 * Disabled if user doesn't have export capabilities.
 */
export function ScenarioExportButton({
  scenario,
  variant = "outline",
  size = "default",
  className,
}: ScenarioExportButtonProps) {
  const { canExport, isLoading } = useCapabilities();

  const handleExport = () => {
    exportScenarioPDF(scenario);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={isLoading || !canExport}
      className={className}
    >
      <FileText className="mr-2 h-4 w-4" />
      Export PDF
    </Button>
  );
}

interface ComparisonExportButtonProps {
  scenarioA: ScenarioData;
  scenarioB: ScenarioData;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

/**
 * Comparison PDF Export Button
 * 
 * Exports a side-by-side comparison as a lender-ready PDF document.
 * Disabled if user doesn't have export capabilities.
 */
export function ComparisonExportButton({
  scenarioA,
  scenarioB,
  variant = "outline",
  size = "default",
  className,
}: ComparisonExportButtonProps) {
  const { canExport, isLoading } = useCapabilities();

  const handleExport = () => {
    exportComparisonPDF(scenarioA, scenarioB);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={isLoading || !canExport}
      className={className}
    >
      <FileText className="mr-2 h-4 w-4" />
      Export PDF
    </Button>
  );
}
