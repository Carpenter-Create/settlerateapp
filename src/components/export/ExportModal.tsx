/**
 * Export Modal Component
 * 
 * Provides export options for scenarios and comparisons:
 * - Download PDF (primary): Server-generated real PDF
 * - Open print view (secondary): Opens HTML in new tab for browser print
 * 
 * Mobile-first: defaults to Download PDF action.
 */

import { useState } from "react";
import { FileDown, Printer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScenarioData } from "@/lib/scenarioContract";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  generateComparisonFilename,
  generateScenarioFilename,
  exportScenarioPDF,
  exportComparisonPDF,
} from "@/lib/exports/exportPDF";

// ============================================================================
// TYPES
// ============================================================================

interface BaseExportModalProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
  disabled?: boolean;
}

interface ScenarioExportModalProps extends BaseExportModalProps {
  type: "scenario";
  scenario: ScenarioData;
}

interface ComparisonExportModalProps extends BaseExportModalProps {
  type: "comparison";
  scenarioA: ScenarioData;
  scenarioB: ScenarioData;
  comparisonId: string;
}

type ExportModalProps = ScenarioExportModalProps | ComparisonExportModalProps;

// ============================================================================
// PDF DOWNLOAD UTILITY
// ============================================================================

const SUPABASE_PROJECT_ID = "vpcxzbaxhpucvevnkalo";
const EDGE_FUNCTION_BASE = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;

async function downloadPDFFromServer(
  type: "scenario" | "comparison",
  id: string,
  filename: string
): Promise<void> {
  // Get the current session for authentication
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error("You must be signed in to export PDFs");
  }

  const endpoint = type === "scenario" 
    ? `${EDGE_FUNCTION_BASE}/generate-pdf?type=scenario&id=${encodeURIComponent(id)}`
    : `${EDGE_FUNCTION_BASE}/generate-pdf?type=comparison&id=${encodeURIComponent(id)}`;

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to generate PDF (${response.status})`);
  }

  const blob = await response.blob();
  
  // On iOS Safari, open in new tab for share sheet access
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const url = URL.createObjectURL(blob);
  
  if (isIOS) {
    // iOS: open blob URL in new tab (triggers iOS share sheet)
    window.open(url, "_blank", "noopener,noreferrer");
  } else {
    // Desktop: trigger download
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ExportModal(props: ExportModalProps) {
  const { variant = "outline", size = "default", className, disabled } = props;
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const isComparison = props.type === "comparison";
  
  const filename = isComparison
    ? generateComparisonFilename(props.scenarioA, props.scenarioB)
    : generateScenarioFilename(props.scenario);

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      if (isComparison) {
        await downloadPDFFromServer("comparison", props.comparisonId, filename);
      } else {
        await downloadPDFFromServer("scenario", props.scenario.id, filename);
      }
      toast.success("PDF ready");
      setOpen(false);
    } catch (error) {
      // Log detailed error for debugging, show minimal message to user
      console.error("EXPORT_PDF_CLIENT_FAILED:", {
        type: props.type,
        id: isComparison ? props.comparisonId : props.scenario.id,
        error: error instanceof Error ? error.message : String(error),
      });
      toast.error("Export failed. Try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOpenPrintView = () => {
    if (isComparison) {
      exportComparisonPDF(props.scenarioA, props.scenarioB);
    } else {
      exportScenarioPDF(props.scenario);
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled}
          className={className}
        >
          <FileDown className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm [&>button]:min-h-[44px] [&>button]:min-w-[44px]">
        <DialogHeader>
          <DialogTitle>Export</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-2 pt-2">
          {/* Primary: Download PDF */}
          <Button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="w-full h-11 justify-center gap-2"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            <span>{isDownloading ? "Generating..." : "Download PDF"}</span>
          </Button>
          
          {/* Secondary: Print view */}
          <Button
            variant="ghost"
            onClick={handleOpenPrintView}
            disabled={isDownloading}
            className="w-full h-11 justify-center gap-2 text-muted-foreground"
          >
            <Printer className="h-4 w-4" />
            <span>Print view</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// CONVENIENCE WRAPPERS
// ============================================================================

interface ScenarioExportButtonProps {
  scenario: ScenarioData;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
  disabled?: boolean;
}

export function ScenarioExportModal({
  scenario,
  ...rest
}: ScenarioExportButtonProps) {
  return (
    <ExportModal
      type="scenario"
      scenario={scenario}
      {...rest}
    />
  );
}

interface ComparisonExportButtonProps {
  scenarioA: ScenarioData;
  scenarioB: ScenarioData;
  comparisonId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
  disabled?: boolean;
}

export function ComparisonExportModal({
  scenarioA,
  scenarioB,
  comparisonId,
  ...rest
}: ComparisonExportButtonProps) {
  return (
    <ExportModal
      type="comparison"
      scenarioA={scenarioA}
      scenarioB={scenarioB}
      comparisonId={comparisonId}
      {...rest}
    />
  );
}
