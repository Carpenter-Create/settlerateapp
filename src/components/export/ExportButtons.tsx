/**
 * Export Button Components
 * 
 * Professional export actions for scenarios and comparisons.
 * Access control: Professional Review tier and admin only.
 */

import { useState } from "react";
import { FileText, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCapabilities } from "@/hooks/useCapabilities";
import { ScenarioData } from "@/lib/scenarioContract";
import {
  exportScenarioPDF,
  exportComparisonPDF,
} from "@/lib/exports/exportPDF";
import { ShareModal } from "./ShareModal";

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

interface ScenarioShareButtonProps {
  scenarioId: string;
  scenarioName?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

/**
 * Single Scenario Share Button
 * 
 * Creates a shareable PDF link for a scenario.
 * Disabled if user doesn't have export capabilities.
 */
export function ScenarioShareButton({
  scenarioId,
  scenarioName,
  variant = "outline",
  size = "default",
  className,
}: ScenarioShareButtonProps) {
  const { canExport, isLoading } = useCapabilities();
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setShareOpen(true)}
        disabled={isLoading || !canExport}
        className={className}
      >
        <Share2 className="mr-2 h-4 w-4" />
        Share
      </Button>
      <ShareModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        entityType="scenario"
        entityId={scenarioId}
        entityName={scenarioName}
      />
    </>
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

interface ComparisonShareButtonProps {
  comparisonId: string;
  comparisonName?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

/**
 * Comparison Share Button
 * 
 * Creates a shareable PDF link for a comparison.
 * Disabled if user doesn't have export capabilities.
 */
export function ComparisonShareButton({
  comparisonId,
  comparisonName,
  variant = "outline",
  size = "default",
  className,
}: ComparisonShareButtonProps) {
  const { canExport, isLoading } = useCapabilities();
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setShareOpen(true)}
        disabled={isLoading || !canExport}
        className={className}
      >
        <Share2 className="mr-2 h-4 w-4" />
        Share
      </Button>
      <ShareModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        entityType="comparison"
        entityId={comparisonId}
        entityName={comparisonName}
      />
    </>
  );
}
