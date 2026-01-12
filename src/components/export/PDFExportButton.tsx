/**
 * PDF Export Button Component
 * 
 * Provides a professional export action for scenario comparisons.
 * Uses the canonical PDF export system for decision artifacts.
 */

import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  exportToPDF,
  downloadAsHTML,
  type ComparisonExportData,
  type ScenarioData,
} from "@/lib/scenarioExportPDF";

interface PDFExportButtonProps {
  scenarioA: ScenarioData;
  scenarioB: ScenarioData;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function PDFExportButton({
  scenarioA,
  scenarioB,
  variant = "outline",
  size = "default",
  className,
}: PDFExportButtonProps) {
  const handleExport = () => {
    const exportData: ComparisonExportData = {
      generatedAt: new Date(),
      scenarioA,
      scenarioB,
    };

    exportToPDF(exportData);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      className={className}
    >
      <FileText className="mr-2 h-4 w-4" />
      Export PDF
    </Button>
  );
}

interface HTMLExportButtonProps {
  scenarioA: ScenarioData;
  scenarioB: ScenarioData;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function HTMLExportButton({
  scenarioA,
  scenarioB,
  variant = "ghost",
  size = "sm",
  className,
}: HTMLExportButtonProps) {
  const handleExport = () => {
    const exportData: ComparisonExportData = {
      generatedAt: new Date(),
      scenarioA,
      scenarioB,
    };

    downloadAsHTML(exportData);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      className={className}
    >
      <FileText className="mr-2 h-4 w-4" />
      Download HTML
    </Button>
  );
}
