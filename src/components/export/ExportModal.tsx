/**
 * Export Modal Component
 * 
 * Provides export options for scenarios and comparisons:
 * - Download PDF (primary): Server-generated real PDF
 * - Print (secondary): In-place browser print dialog
 * 
 * BEHAVIOR (LOCKED):
 * - "Download PDF" calls edge function → returns application/pdf
 * - "Print" triggers window.print() in-place (NO new tab)
 */

import { useState } from "react";
import { FileDown, Printer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScenarioData } from "@/lib/scenarioContract";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  generateComparisonFilename,
  generateScenarioFilename,
  generateScenarioHTML,
  generateComparisonHTML,
} from "@/lib/exports/exportPDF";
import { usePrintController } from "./PrintController";

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
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to generate PDF (${response.status})`);
  }

  // Guard: Ensure response is actually a PDF
  const contentType = response.headers.get("Content-Type") || "";
  if (!contentType.includes("application/pdf")) {
    const text = await response.text();
    console.error("EXPORT_PDF_INVALID_CONTENT_TYPE:", { contentType, preview: text.slice(0, 200) });
    throw new Error("Export failed. Server returned invalid format.");
  }

  const blob = await response.blob();
  
  // Verify blob is PDF
  if (blob.type && !blob.type.includes("application/pdf")) {
    throw new Error("Export failed. Invalid file format received.");
  }
  
  const url = URL.createObjectURL(blob);
  
  // iOS Safari: open in new tab for share sheet
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  if (isIOS) {
    window.open(url, "_blank", "noopener,noreferrer");
  } else {
    // Desktop: trigger download with correct .pdf extension
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.pdf`;
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
  const [open, setOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const { triggerPrint } = usePrintController();

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
      console.error("EXPORT_PDF_CLIENT_FAILED:", {
        type: props.type,
        id: isComparison ? props.comparisonId : props.scenario.id,
        error: error instanceof Error ? error.message : String(error),
      });
      toast.error("Export failed.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setOpen(false);
    
    // Generate HTML for printing
    const html = isComparison
      ? generateComparisonHTML(props.scenarioA, props.scenarioB)
      : generateScenarioHTML(props.scenario);
    
    // Trigger in-place print (no new tab)
    triggerPrint(html, () => {
      setIsPrinting(false);
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant={variant}
            size={size}
            disabled={disabled || isPrinting}
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
            
            {/* Secondary: Print (in-place) */}
            <Button
              variant="ghost"
              onClick={handlePrint}
              disabled={isDownloading}
              className="w-full h-11 justify-center gap-2 text-muted-foreground"
            >
              <Printer className="h-4 w-4" />
              <span>Print</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
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
