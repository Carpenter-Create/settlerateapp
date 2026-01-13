/**
 * SettleRate Professional Export System
 * 
 * Unified export module using CANONICAL layout definitions.
 * 
 * Both print (HTML) and PDF (server-side jsPDF) use the same
 * layout structure from exportLayout.ts for visual consistency.
 * 
 * Exports:
 * - generateScenarioHTML / generateComparisonHTML: For in-page printing
 * - Filename generators for both export types
 * 
 * Visual Rules (LOCKED):
 * - Brand serif for headings only (Libre Baskerville)
 * - System font for all body/tables/metrics
 * - Consistent spacing: 48-64px page margins, 24-28px sections
 * 
 * Access Control:
 * - Professional Review tier and admin only
 */

import type { ScenarioData } from "@/lib/scenarioContract";
import {
  buildScenarioLayout,
  buildComparisonLayout,
  generateHTMLFromLayout,
  generateScenarioFilename,
  generateComparisonFilename,
} from "./exportLayout";

// Re-export filename generators from canonical location
export { generateScenarioFilename, generateComparisonFilename };

// ============================================================================
// HTML GENERATION (for print)
// ============================================================================

/**
 * Generate HTML for single scenario export using canonical layout.
 * This HTML is used for in-page printing via window.print().
 */
export function generateScenarioHTML(scenario: ScenarioData): string {
  const layout = buildScenarioLayout(scenario);
  return generateHTMLFromLayout(layout);
}

/**
 * Generate HTML for comparison export using canonical layout.
 * This HTML is used for in-page printing via window.print().
 */
export function generateComparisonHTML(
  scenarioA: ScenarioData,
  scenarioB: ScenarioData
): string {
  const layout = buildComparisonLayout(scenarioA, scenarioB);
  return generateHTMLFromLayout(layout);
}

// ============================================================================
// LEGACY PRINT FUNCTIONS (for compatibility)
// ============================================================================

/**
 * Trigger in-page print without opening new tab
 * (Legacy - use PrintController instead)
 */
function openPrintWindow(html: string, _filename: string): void {
  // Create print root if it doesn't exist
  let printRoot = document.getElementById("print-root");
  if (!printRoot) {
    printRoot = document.createElement("div");
    printRoot.id = "print-root";
    document.body.appendChild(printRoot);
  }

  // Create content wrapper
  const wrapper = document.createElement("div");
  wrapper.className = "print-content";
  wrapper.innerHTML = html;
  printRoot.appendChild(wrapper);

  // Cleanup after print
  const cleanup = () => {
    window.removeEventListener("afterprint", cleanup);
    printRoot?.removeChild(wrapper);
  };
  window.addEventListener("afterprint", cleanup);

  // Trigger print after DOM update
  requestAnimationFrame(() => {
    setTimeout(() => {
      window.print();
    }, 100);
  });
}

/**
 * Export single scenario - opens print dialog in-place
 */
export function exportScenarioPDF(scenario: ScenarioData): void {
  const html = generateScenarioHTML(scenario);
  const filename = generateScenarioFilename(scenario);
  openPrintWindow(html, filename);
}

/**
 * Export comparison - opens print dialog in-place
 */
export function exportComparisonPDF(
  scenarioA: ScenarioData,
  scenarioB: ScenarioData
): void {
  const html = generateComparisonHTML(scenarioA, scenarioB);
  const filename = generateComparisonFilename(scenarioA, scenarioB);
  openPrintWindow(html, filename);
}

/**
 * Download single scenario as HTML file
 */
export function downloadScenarioHTML(scenario: ScenarioData): void {
  const html = generateScenarioHTML(scenario);
  const filename = generateScenarioFilename(scenario);
  downloadHTML(html, `${filename}.html`);
}

/**
 * Download comparison as HTML file
 */
export function downloadComparisonHTML(
  scenarioA: ScenarioData,
  scenarioB: ScenarioData
): void {
  const html = generateComparisonHTML(scenarioA, scenarioB);
  const filename = generateComparisonFilename(scenarioA, scenarioB);
  downloadHTML(html, `${filename}.html`);
}

/**
 * Helper to download HTML content
 */
function downloadHTML(html: string, filename: string): void {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
