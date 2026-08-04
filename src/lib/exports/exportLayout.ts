/**
 * Canonical Export Layout System
 * 
 * SINGLE SOURCE OF TRUTH for PDF and Print exports.
 * 
 * Both `generatePrintHTML()` (for window.print()) and the edge function
 * `generate-pdf` use this same layout specification to ensure visual
 * consistency between printed and downloaded documents.
 * 
 * TYPOGRAPHY RULES (LOCKED):
 * - Brand serif: Libre Baskerville for wordmark, document title, section headings
 * - System font: Inter / system sans-serif for all body text, tables, metrics
 * 
 * SPACING RULES (LOCKED):
 * - Page margins: 48-64px (desktop), 24px minimum (mobile)
 * - Section gaps: 24-32px
 * - Table cell padding: 10-14px vertical, 12-16px horizontal
 * - Footer: fixed position at bottom of page
 */

import type { ScenarioData } from "@/lib/scenarioContract";
import {
  formatCurrency,
  formatPercent,
  calculateDownPaymentAmount,
  TRANSACTION_TYPE_LABELS,
} from "@/lib/mortgage";
import {
  calculateDeltas,
  calculateThreeWayDeltas,
  generateSummaryText,
  generateThreeWaySummaryText,
  formatDollarFirstDelta,
  formatSignedBasisPoints,
  formatLtvDelta,
} from "@/lib/comparisonSummary";
import {
  buildCanonicalScenarioExport,
  formatExportCurrency,
  formatExportMonths,
  formatExportPercent,
  type CanonicalExportOptions,
  type CanonicalScenarioExport,
} from "@/lib/exports/exportContract";

// ============================================================================
// BRAND CONSTANTS
// ============================================================================

export const BRAND = {
  name: "SettleRate",
  domain: "settlerate.com",
  serif: "'Libre Baskerville', Georgia, 'Times New Roman', serif",
  sansSerif: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  monospace: "'SF Mono', Monaco, 'Courier New', monospace",
  colors: {
    text: "#1a1a1a",
    textMuted: "#666",
    textLight: "#888",
    border: "#d0d0d0",
    borderLight: "#e8e8e8",
    background: "#ffffff",
  },
} as const;

// ============================================================================
// CANONICAL STYLES (Shared between print HTML and PDF)
// ============================================================================

/**
 * Canonical CSS for print HTML exports.
 * PDF generation mirrors these values programmatically.
 */
export const CANONICAL_EXPORT_STYLES = `
  /* =================================================================
   * CANONICAL EXPORT STYLES - Single Source of Truth
   * 
   * Typography:
   * - Brand serif: ${BRAND.serif} (wordmark, titles, section heads)
   * - System font: ${BRAND.sansSerif} (body, tables, metrics)
   * 
   * Spacing:
   * - Page margins: 18mm top/bottom, 16mm left/right (print)
   * - Section gaps: 24px
   * - Table cells: 10px vertical, 12px horizontal
   * ================================================================= */

  @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Inter:wght@400;500;600&display=swap');

  @page {
    size: letter;
    margin: 24mm 18mm;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: ${BRAND.sansSerif};
    font-size: 10pt;
    line-height: 1.5;
    color: ${BRAND.colors.text};
    background: ${BRAND.colors.background};
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  
  /* Export root container */
  .export-page {
    background: ${BRAND.colors.background};
    color: ${BRAND.colors.text};
    min-height: 100vh;
  }
  
  /* Screen preview (mobile + desktop) - Mercury-style spacing */
  @media screen {
    .export-page {
      padding: 48px 32px;
    }
    
    .export-content {
      max-width: 1120px;
      margin: 0 auto;
    }
    
    @media (max-width: 768px) {
      .export-page {
        padding: 24px;
      }
    }
    
    @media (max-width: 480px) {
      .export-page {
        padding: 16px;
      }
    }
  }
  
  /* Print styles */
  @media print {
    .export-page {
      padding: 0 !important;
    }
    
    .export-content {
      max-width: none;
      margin: 0;
    }
    
    table, tr, td, th {
      page-break-inside: avoid;
    }
    
    h1, h2, h3 {
      page-break-after: avoid;
    }
    
    .section {
      page-break-inside: avoid;
    }
  }
  
  /* ===== TYPOGRAPHY ===== */
  
  /* Brand serif - ONLY for headings */
  .brand-serif {
    font-family: ${BRAND.serif};
    font-weight: 400;
  }
  
  /* System font - for all body/tables/metrics */
  .system-font {
    font-family: ${BRAND.sansSerif};
  }
  
  .mono {
    font-family: ${BRAND.monospace};
  }
  
  .text-muted {
    color: ${BRAND.colors.textMuted};
  }
  
  .text-light {
    color: ${BRAND.colors.textLight};
  }

  /* ===== HEADER ===== */
  
  .header {
    margin-bottom: 32px;
    padding-bottom: 16px;
    border-bottom: 1px solid ${BRAND.colors.border};
  }
  
  .header-brand {
    font-family: ${BRAND.serif};
    font-size: 11pt;
    font-weight: 400;
    color: ${BRAND.colors.textMuted};
    margin-bottom: 12px;
    letter-spacing: -0.01em;
  }
  
  .header-title {
    font-family: ${BRAND.serif};
    font-size: 20pt;
    font-weight: 400;
    color: ${BRAND.colors.text};
    margin-bottom: 6px;
    letter-spacing: -0.02em;
  }
  
  .header-meta {
    font-family: ${BRAND.sansSerif};
    font-size: 9pt;
    color: ${BRAND.colors.textMuted};
    line-height: 1.6;
  }
  
  /* ===== SECTIONS ===== */
  
  .section {
    margin-bottom: 40px;
  }
  
  .section-title {
    font-family: ${BRAND.serif};
    font-size: 12pt;
    font-weight: 400;
    color: ${BRAND.colors.text};
    margin-bottom: 12px;
    padding-bottom: 6px;
    border-bottom: 1px solid ${BRAND.colors.borderLight};
    letter-spacing: -0.01em;
  }
  
  /* Summary text max-width for readability */
  .summary-text {
    max-width: 720px;
  }
  
  /* ===== TABLES ===== */
  
  .table-wrap {
    width: 100%;
  }
  
  @media screen and (max-width: 480px) {
    .table-wrap {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    
    .table-wrap table {
      min-width: 500px;
    }
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
    font-family: ${BRAND.sansSerif};
    font-size: 9pt;
  }
  
  th {
    text-align: left;
    font-weight: 500;
    padding: 12px 14px;
    border-bottom: 1px solid ${BRAND.colors.border};
    color: ${BRAND.colors.text};
  }
  
  th:first-child {
    padding-left: 0;
  }
  
  th:last-child {
    padding-right: 0;
  }
  
  th:not(:first-child) {
    text-align: right;
  }
  
  td {
    padding: 10px 14px;
    border-bottom: 1px solid ${BRAND.colors.borderLight};
    vertical-align: top;
  }
  
  td:first-child {
    color: ${BRAND.colors.textMuted};
    padding-left: 0;
  }
  
  td:last-child {
    padding-right: 0;
  }
  
  td:not(:first-child) {
    text-align: right;
    font-family: ${BRAND.monospace};
    font-size: 9pt;
  }
  
  tr:last-child td {
    border-bottom: none;
  }
  
  .total-row td {
    padding-top: 12px;
    border-top: 1px solid ${BRAND.colors.border};
    font-weight: 500;
  }
  
  .total-row td:first-child {
    color: ${BRAND.colors.text};
  }
  
  /* Comparison tables */
  .comparison-table th:first-child {
    width: 30%;
  }
  
  .comparison-table.cols-3 th:not(:first-child) {
    width: 35%;
  }
  
  .comparison-table.cols-4 th:not(:first-child) {
    width: 23.33%;
  }
  
  /* Key diff groups for 3-scenario */
  .key-diff-group {
    margin-bottom: 16px;
  }
  
  .key-diff-group-label {
    font-family: ${BRAND.sansSerif};
    font-size: 9pt;
    font-weight: 500;
    color: ${BRAND.colors.textMuted};
    margin-bottom: 8px;
  }
  
  /* Key differences summary */
  .key-diff-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 16px;
    margin-bottom: 20px;
  }
  
  .key-diff-item {
    padding: 12px 0;
    border-bottom: 1px solid ${BRAND.colors.borderLight};
  }
  
  .key-diff-label {
    font-family: ${BRAND.sansSerif};
    font-size: 8pt;
    color: ${BRAND.colors.textMuted};
    display: block;
    margin-bottom: 4px;
  }
  
  .key-diff-value {
    font-family: ${BRAND.monospace};
    font-size: 10pt;
    color: ${BRAND.colors.text};
  }
  
  @media screen and (max-width: 480px) {
    .key-diff-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
  
  /* Notes and methodology */
  .notes-list {
    list-style: none;
    padding: 0;
    color: ${BRAND.colors.textMuted};
    font-family: ${BRAND.sansSerif};
    font-size: 9pt;
  }
  
  .notes-list li {
    padding-left: 16px;
    position: relative;
    margin-bottom: 6px;
    line-height: 1.6;
  }
  
  .notes-list li::before {
    content: "•";
    position: absolute;
    left: 0;
    color: ${BRAND.colors.textLight};
  }
  
  /* Footer */
  .footer {
    margin-top: 40px;
    padding-top: 16px;
    border-top: 1px solid ${BRAND.colors.border};
  }
  
  .footer-meta {
    display: flex;
    justify-content: space-between;
    font-family: ${BRAND.sansSerif};
    font-size: 7pt;
    color: ${BRAND.colors.textLight};
    margin-bottom: 12px;
  }
  
  .footer-disclaimer {
    font-family: ${BRAND.sansSerif};
    font-size: 7pt;
    color: ${BRAND.colors.textLight};
    line-height: 1.6;
    text-align: center;
  }
  
  /* Comparison summary text */
  .summary-text {
    font-family: ${BRAND.sansSerif};
    font-size: 10pt;
    line-height: 1.7;
    color: ${BRAND.colors.text};
    margin-bottom: 20px;
  }
`;

// ============================================================================
// FILENAME GENERATION
// ============================================================================

export function generateScenarioFilename(scenario: ScenarioData): string {
  const date = new Date().toISOString().split("T")[0];
  const safeName = (scenario.name || "Untitled")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .substring(0, 30);
  return `SettleRate_Scenario_${safeName}_${date}`;
}

export function generateComparisonFilename(
  scenarioA: ScenarioData,
  scenarioB: ScenarioData,
  scenarioC?: ScenarioData | null
): string {
  const date = new Date().toISOString().split("T")[0];
  const nameA = (scenarioA.name || "A").replace(/[^a-zA-Z0-9]/g, "_").substring(0, 12);
  const nameB = (scenarioB.name || "B").replace(/[^a-zA-Z0-9]/g, "_").substring(0, 12);
  if (scenarioC) {
    const nameC = (scenarioC.name || "C").replace(/[^a-zA-Z0-9]/g, "_").substring(0, 12);
    return `SettleRate_Comparison_${nameA}_vs_${nameB}_vs_${nameC}_${date}`;
  }
  return `SettleRate_Comparison_${nameA}_vs_${nameB}_${date}`;
}

// ============================================================================
// SCENARIO LAYOUT DATA
// ============================================================================

export interface ExportLayoutData {
  brand: string;
  title: string;
  meta: string[];
  generatedDate: string;
  sections: ExportSection[];
  methodology: string[];
  disclaimer: string;
}

export interface ExportSection {
  title: string;
  type: "table" | "comparison-table" | "key-diff" | "text" | "key-diff-groups";
  rows?: { label: string; value: string; value2?: string; value3?: string }[];
  columns?: string[];
  text?: string;
  items?: { label: string; value: string }[];
  groups?: { label: string; items: { label: string; value: string }[] }[];
}

/**
 * Build layout data for a single scenario export.
 * Uses the canonical export contract (activeSnapshot by default).
 * Used by both print HTML and PDF generators.
 */
export function buildScenarioLayout(
  scenario: ScenarioData,
  options?: CanonicalExportOptions
): ExportLayoutData {
  const canonical = buildCanonicalScenarioExport(scenario, options);
  return buildScenarioLayoutFromCanonical(canonical);
}

/**
 * Layout adapter from the canonical export payload.
 * Shared semantic target for client HTML and server PDF parity.
 */
export function buildScenarioLayoutFromCanonical(
  exportPayload: CanonicalScenarioExport
): ExportLayoutData {
  const dateStr = new Date(exportPayload.metadata.generatedAt).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  const shortId = exportPayload.id.substring(0, 8).toUpperCase();
  const { inputs, metrics, metadata, name } = exportPayload;
  const mode = metadata.scenarioType;
  const isPurchase = mode === "purchase";
  const isRefinance = mode === "refinance";
  const isHeloc = mode === "heloc";
  const isAssumption = mode === "assumption";

  const propertyValue = isPurchase
    ? inputs.purchase.purchasePrice
    : isRefinance
      ? (inputs.refinance.estimatedHomeValue ?? metrics.principalAmount ?? 0)
      : isAssumption
        ? (inputs.assumption?.purchasePrice ?? metrics.principalAmount ?? 0)
        : metrics.principalAmount ?? 0;

  const downPaymentAmount = isPurchase
    ? calculateDownPaymentAmount(
        inputs.purchase.purchasePrice,
        inputs.purchase.downPayment,
        inputs.purchase.downPaymentType
      )
    : 0;

  const overviewRows: { label: string; value: string }[] = [
    { label: "Loan type", value: TRANSACTION_TYPE_LABELS[mode] },
  ];

  if (isPurchase || isRefinance || isAssumption) {
    overviewRows.push({
      label: "Property value",
      value: formatCurrency(propertyValue),
    });
  }

  if (isPurchase) {
    const dpPercent =
      propertyValue > 0 ? (downPaymentAmount / propertyValue) * 100 : 0;
    overviewRows.push({
      label: "Down payment",
      value: `${formatCurrency(downPaymentAmount)} (${formatPercent(dpPercent)})`,
    });
  } else if (isRefinance) {
    overviewRows.push({
      label: "Current loan balance",
      value: formatCurrency(inputs.refinance.currentLoanBalance),
    });
  } else if (isHeloc) {
    overviewRows.push({
      label: "Credit limit",
      value: formatCurrency(inputs.heloc?.creditLimit ?? 0),
    });
    overviewRows.push({
      label: "Balance at end of draw (modeled)",
      value: formatExportCurrency(metrics.balanceEndDraw),
    });
  } else if (isAssumption) {
    overviewRows.push({
      label: "Assumed loan balance",
      value: formatCurrency(inputs.assumption?.assumed.balance ?? 0),
    });
  }

  if (isPurchase || isRefinance) {
    overviewRows.push(
      {
        label: "Loan amount",
        value: formatExportCurrency(metrics.principalAmount),
      },
      {
        label: "Loan term",
        value: `${inputs.shared.loanTerm} years`,
      },
      {
        label: "Interest rate (assumed)",
        value: formatPercent(inputs.shared.interestRate),
      },
      {
        label: "Loan-to-value ratio",
        value: formatExportPercent(metrics.ltvRatio),
      }
    );
  } else if (isHeloc) {
    overviewRows.push(
      {
        label: "APR (assumed)",
        value: formatPercent(inputs.heloc?.apr ?? metrics.rateForComparison ?? 0),
      },
      {
        label: "Decision horizon",
        value: formatExportMonths(metrics.decisionHorizonMonths),
      }
    );
  } else if (isAssumption) {
    overviewRows.push(
      {
        label: "Assumed rate",
        value: formatPercent(
          inputs.assumption?.assumed.apr ?? metrics.rateForComparison ?? 0
        ),
      },
      {
        label: "Combined principal (modeled)",
        value: formatExportCurrency(metrics.principalAmount),
      },
      {
        label: "Decision horizon",
        value: formatExportMonths(metrics.decisionHorizonMonths),
      },
      {
        label: "Loan-to-value ratio",
        value: formatExportPercent(metrics.ltvRatio),
      }
    );
  }

  const paymentRows: { label: string; value: string }[] = [];
  if (isPurchase || isRefinance) {
    paymentRows.push({
      label: "Principal & interest",
      value: formatExportCurrency(metrics.monthlyPrincipalInterest),
    });
    if ((metrics.monthlyPropertyTax ?? 0) > 0) {
      paymentRows.push({
        label: "Property tax",
        value: formatExportCurrency(metrics.monthlyPropertyTax),
      });
    }
    if ((metrics.monthlyHomeInsurance ?? 0) > 0) {
      paymentRows.push({
        label: "Home insurance",
        value: formatExportCurrency(metrics.monthlyHomeInsurance),
      });
    }
    if ((metrics.monthlyPMI ?? 0) > 0) {
      paymentRows.push({
        label: "Mortgage insurance (PMI)",
        value: formatExportCurrency(metrics.monthlyPMI),
      });
    }
    if ((metrics.monthlyHOA ?? 0) > 0) {
      paymentRows.push({
        label: "HOA",
        value: formatExportCurrency(metrics.monthlyHOA),
      });
    }
    paymentRows.push({
      label: "All-in monthly housing payment",
      value: formatExportCurrency(metrics.allInMonthlyHousingPayment),
    });
  } else if (isHeloc) {
    paymentRows.push({
      label: "Primary monthly payment (repay period)",
      value: formatExportCurrency(metrics.paymentRepay ?? metrics.monthlyPaymentPrimary),
    });
    paymentRows.push({
      label: "All-in monthly housing payment",
      value: formatExportCurrency(metrics.allInMonthlyHousingPayment),
    });
  } else if (isAssumption) {
    paymentRows.push({
      label: "Combined monthly payment",
      value: formatExportCurrency(metrics.monthlyPaymentPrimary),
    });
    paymentRows.push({
      label: "All-in monthly housing payment",
      value: formatExportCurrency(metrics.allInMonthlyHousingPayment),
    });
  }

  const longTermRows: { label: string; value: string }[] = [
    {
      label: "Financing cost over modeled term",
      value: formatExportCurrency(metrics.financingCostOverHorizon),
    },
    {
      label: "Principal reduction over modeled term",
      value: formatExportCurrency(metrics.principalReductionOverHorizon),
    },
    {
      label: "Total interest paid",
      value: formatExportCurrency(metrics.totalInterest),
    },
    {
      label: "Decision horizon",
      value: formatExportMonths(metrics.decisionHorizonMonths),
    },
  ];
  if (isRefinance && metrics.closingCosts != null && metrics.closingCosts > 0) {
    longTermRows.push({
      label: "Closing costs (financing fees)",
      value: formatExportCurrency(metrics.closingCosts),
    });
  }

  const snapshotLabel =
    metadata.snapshotSource === "original"
      ? "Historical original snapshot"
      : "Active snapshot";

  const methodology = [
    "Figures are taken from the selected persisted calculation snapshot; exports do not recalculate scenarios.",
    `Snapshot: ${snapshotLabel} (calculator v${metadata.calculatorVersion}).`,
    "Financing cost excludes principal repayment; principal reduction is reported separately.",
    "All-in monthly housing payment is a secondary cash-flow metric, not the primary cost ranking metric.",
    "Rates shown are assumed inputs, not lender quotes.",
    "Results are intended for comparison and planning purposes only.",
  ];
  if (metadata.recalculationAvailable && metadata.snapshotSource === "active") {
    methodology.unshift(
      `Active calculator version (v${metadata.activeCalculatorVersion}) differs from the current engine (v${metadata.currentCalculatorVersion}); persisted active values are shown without recalculation.`
    );
  }
  if (isHeloc) {
    methodology.push(
      "HELOC figures use interest-only draw-period semantics; mortgage amortization fields are omitted."
    );
  }
  if (isAssumption) {
    methodology.push(
      "Assumption figures combine the assumed loan with gap financing; they are not flattened into a standard mortgage amortization."
    );
  }

  return {
    brand: BRAND.name,
    title: "Scenario Summary",
    meta: [
      `Scenario: ${name || "Untitled"}`,
      `ID: ${shortId}`,
      `Type: ${TRANSACTION_TYPE_LABELS[mode]}`,
      `Calculator: v${metadata.calculatorVersion}`,
      snapshotLabel,
    ],
    generatedDate: dateStr,
    sections: [
      {
        title: "Scenario Overview",
        type: "table",
        rows: overviewRows,
      },
      {
        title: "Monthly Payment",
        type: "table",
        rows: paymentRows,
      },
      {
        title: "Cost Over the Modeled Term",
        type: "table",
        rows: longTermRows,
      },
      {
        title: "Assumptions",
        type: "table",
        rows: isPurchase
          ? [
              {
                label: "Purchase price",
                value: formatCurrency(inputs.purchase.purchasePrice),
              },
              {
                label: "Property taxes (annual)",
                value:
                  (metrics.monthlyPropertyTax ?? 0) > 0
                    ? formatExportCurrency((metrics.monthlyPropertyTax ?? 0) * 12)
                    : "Not specified",
              },
              {
                label: "Home insurance (annual)",
                value:
                  (metrics.monthlyHomeInsurance ?? 0) > 0
                    ? formatExportCurrency(
                        (metrics.monthlyHomeInsurance ?? 0) * 12
                      )
                    : "Not specified",
              },
            ]
          : isRefinance
            ? [
                {
                  label: "Estimated home value",
                  value: inputs.refinance.estimatedHomeValue
                    ? formatCurrency(inputs.refinance.estimatedHomeValue)
                    : "Not specified",
                },
                {
                  label: "Property taxes (annual)",
                  value:
                    (metrics.monthlyPropertyTax ?? 0) > 0
                      ? formatExportCurrency(
                          (metrics.monthlyPropertyTax ?? 0) * 12
                        )
                      : "Not specified",
                },
                {
                  label: "Home insurance (annual)",
                  value:
                    (metrics.monthlyHomeInsurance ?? 0) > 0
                      ? formatExportCurrency(
                          (metrics.monthlyHomeInsurance ?? 0) * 12
                        )
                      : "Not specified",
                },
              ]
            : isHeloc
              ? [
                  {
                    label: "Draw months",
                    value: String(inputs.heloc?.drawMonths ?? "—"),
                  },
                  {
                    label: "Repay months",
                    value: String(inputs.heloc?.repayMonths ?? "—"),
                  },
                  {
                    label: "Interest-only draw",
                    value: inputs.heloc?.interestOnlyDraw ? "Yes" : "No",
                  },
                ]
              : [
                  {
                    label: "Assumed remaining term",
                    value: formatExportMonths(
                      inputs.assumption?.assumed.remainingMonths ?? null
                    ),
                  },
                  {
                    label: "Gap method",
                    value: inputs.assumption?.gap.method ?? "—",
                  },
                ],
      },
    ],
    methodology,
    disclaimer:
      "This document is provided for analytical and planning purposes only. SettleRate does not originate, broker, or recommend mortgage products. All figures shown are modeled estimates and do not constitute a loan offer, guarantee, or financial advice.",
  };
}

/**
 * Build layout data for a comparison export.
 * Supports 2 or 3 scenarios.
 * Used by both print HTML and PDF generators.
 */
export function buildComparisonLayout(
  scenarioA: ScenarioData,
  scenarioB: ScenarioData,
  scenarioC?: ScenarioData | null
): ExportLayoutData {
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  
  const shortIdA = scenarioA.id.substring(0, 8).toUpperCase();
  const shortIdB = scenarioB.id.substring(0, 8).toUpperCase();
  const shortIdC = scenarioC?.id.substring(0, 8).toUpperCase();
  
  const hasScenarioC = !!scenarioC;

  const nameA = scenarioA.name || "Scenario A";
  const nameB = scenarioB.name || "Scenario B";
  const nameC = scenarioC?.name || "Scenario C";

  const metaLine = hasScenarioC
    ? `Comparing: ${nameA} (${shortIdA}) vs ${nameB} (${shortIdB}) vs ${nameC} (${shortIdC})`
    : `Comparing: ${nameA} (${shortIdA}) vs ${nameB} (${shortIdB})`;

  const summaryText = hasScenarioC
    ? generateThreeWaySummaryText(scenarioA, scenarioB, scenarioC!)
    : generateSummaryText(scenarioA, scenarioB);

  const threeWayDeltas = calculateThreeWayDeltas(scenarioA, scenarioB, scenarioC);
  const { aVsB, cVsB } = threeWayDeltas;

  const keyDiffSection: ExportSection = hasScenarioC
    ? {
        title: "How the Options Compare",
        type: "key-diff-groups",
        groups: [
          {
            label: `${nameA} vs ${nameB}`,
            items: [
              {
                label: "Monthly payment",
                value: formatDollarFirstDelta(
                  aVsB.monthlyPaymentDollarDelta,
                  aVsB.monthlyPaymentDelta,
                  "/mo"
                ),
              },
              {
                label: "Financing cost over modeled term",
                value: formatDollarFirstDelta(
                  aVsB.financingCostDollarDelta ?? aVsB.totalCostDollarDelta,
                  aVsB.financingCostDelta ?? aVsB.totalCostDelta
                ),
              },
              {
                label: "Total interest",
                value: formatDollarFirstDelta(
                  aVsB.totalInterestDollarDelta,
                  aVsB.totalInterestDelta
                ),
              },
              {
                label: "Interest rate (assumed)",
                value: formatSignedBasisPoints(aVsB.interestRateDelta),
              },
              {
                label: "Loan size vs home value",
                value: formatLtvDelta(aVsB.ltvDelta),
              },
            ],
          },
          {
            label: `${nameC} vs ${nameB}`,
            items: [
              {
                label: "Monthly payment",
                value: formatDollarFirstDelta(
                  cVsB!.monthlyPaymentDollarDelta,
                  cVsB!.monthlyPaymentDelta,
                  "/mo"
                ),
              },
              {
                label: "Financing cost over modeled term",
                value: formatDollarFirstDelta(
                  cVsB!.financingCostDollarDelta ?? cVsB!.totalCostDollarDelta,
                  cVsB!.financingCostDelta ?? cVsB!.totalCostDelta
                ),
              },
              {
                label: "Total interest",
                value: formatDollarFirstDelta(
                  cVsB!.totalInterestDollarDelta,
                  cVsB!.totalInterestDelta
                ),
              },
              {
                label: "Interest rate (assumed)",
                value: formatSignedBasisPoints(cVsB!.interestRateDelta),
              },
              {
                label: "Loan size vs home value",
                value: formatLtvDelta(cVsB!.ltvDelta),
              },
            ],
          },
        ],
      }
    : {
        title: "How the Options Compare",
        type: "key-diff",
        items: [
          {
            label: "Monthly payment",
            value: formatDollarFirstDelta(
              aVsB.monthlyPaymentDollarDelta,
              aVsB.monthlyPaymentDelta,
              "/mo"
            ),
          },
          {
            label: "Financing cost over modeled term",
            value: formatDollarFirstDelta(
              aVsB.financingCostDollarDelta ?? aVsB.totalCostDollarDelta,
              aVsB.financingCostDelta ?? aVsB.totalCostDelta
            ),
          },
          {
            label: "Total interest",
            value: formatDollarFirstDelta(
              aVsB.totalInterestDollarDelta,
              aVsB.totalInterestDelta
            ),
          },
          {
            label: "Interest rate (assumed)",
            value: formatSignedBasisPoints(aVsB.interestRateDelta),
          },
          {
            label: "Loan size vs home value",
            value: formatLtvDelta(aVsB.ltvDelta),
          },
        ],
      };

  const columns = hasScenarioC
    ? ["Metric", nameA, nameB, nameC]
    : ["Metric", nameA, nameB];

  const buildRow = (
    label: string,
    valueA: string,
    valueB: string,
    valueC?: string
  ) => {
    return hasScenarioC
      ? { label, value: valueA, value2: valueB, value3: valueC }
      : { label, value: valueA, value2: valueB };
  };

  const getFinancingCost = (scenario: ScenarioData) =>
    scenario.activeSnapshot.summary.financingCostOverHorizon;
  const getPrincipalReduction = (scenario: ScenarioData) =>
    scenario.activeSnapshot.summary.principalReductionOverHorizon;
  const getHorizon = (scenario: ScenarioData) =>
    scenario.activeSnapshot.summary.decisionHorizonMonths;
  const getAllInMonthly = (scenario: ScenarioData) =>
    scenario.activeSnapshot.summary.allInMonthlyHousingPayment;
  const getPrincipalAmount = (scenario: ScenarioData) =>
    scenario.activeSnapshot.summary.principalAmount;
  const getMonthlyPrimary = (scenario: ScenarioData) =>
    scenario.activeSnapshot.summary.monthlyPaymentPrimary;
  const getLtv = (scenario: ScenarioData) =>
    scenario.activeSnapshot.summary.ltvRatio;
  const getRate = (scenario: ScenarioData) =>
    scenario.activeSnapshot.summary.rateForComparison;
  const getTotalInterest = (scenario: ScenarioData) =>
    scenario.activeSnapshot.summary.totalInterest;

  return {
    brand: BRAND.name,
    title: "Scenario Comparison",
    meta: [metaLine],
    generatedDate: dateStr,
    sections: [
      {
        title: "Comparison Summary",
        type: "text",
        text: summaryText,
      },
      keyDiffSection,
      {
        title: "Scenario Overview",
        type: "comparison-table",
        columns,
        rows: [
          buildRow("Loan type", TRANSACTION_TYPE_LABELS[scenarioA.inputs.mode], TRANSACTION_TYPE_LABELS[scenarioB.inputs.mode], scenarioC ? TRANSACTION_TYPE_LABELS[scenarioC.inputs.mode] : undefined),
          buildRow("Principal / credit amount", formatCurrency(getPrincipalAmount(scenarioA)), formatCurrency(getPrincipalAmount(scenarioB)), scenarioC ? formatCurrency(getPrincipalAmount(scenarioC)) : undefined),
          buildRow("Decision horizon", `${getHorizon(scenarioA)} mo`, `${getHorizon(scenarioB)} mo`, scenarioC ? `${getHorizon(scenarioC)} mo` : undefined),
          buildRow("Rate (assumed)", formatPercent(getRate(scenarioA)), formatPercent(getRate(scenarioB)), scenarioC ? formatPercent(getRate(scenarioC)) : undefined),
          buildRow("Loan-to-value ratio", getLtv(scenarioA) == null ? "—" : formatPercent(getLtv(scenarioA)!), getLtv(scenarioB) == null ? "—" : formatPercent(getLtv(scenarioB)!), scenarioC ? (getLtv(scenarioC) == null ? "—" : formatPercent(getLtv(scenarioC)!)) : undefined),
          buildRow("Calculator version", `v${scenarioA.activeCalculatorVersion}`, `v${scenarioB.activeCalculatorVersion}`, scenarioC ? `v${scenarioC.activeCalculatorVersion}` : undefined),
        ],
      },
      {
        title: "Monthly Payment",
        type: "comparison-table",
        columns: hasScenarioC ? ["Component", nameA, nameB, nameC] : ["Component", nameA, nameB],
        rows: [
          buildRow("Primary monthly payment", formatCurrency(getMonthlyPrimary(scenarioA)), formatCurrency(getMonthlyPrimary(scenarioB)), scenarioC ? formatCurrency(getMonthlyPrimary(scenarioC)) : undefined),
          buildRow("All-in monthly housing payment", formatCurrency(getAllInMonthly(scenarioA)), formatCurrency(getAllInMonthly(scenarioB)), scenarioC ? formatCurrency(getAllInMonthly(scenarioC)) : undefined),
        ],
      },
      {
        title: "Cost Over the Modeled Term",
        type: "comparison-table",
        columns: hasScenarioC ? ["Metric", nameA, nameB, nameC] : ["Metric", nameA, nameB],
        rows: [
          buildRow("Financing cost over modeled term", formatCurrency(getFinancingCost(scenarioA)), formatCurrency(getFinancingCost(scenarioB)), scenarioC ? formatCurrency(getFinancingCost(scenarioC)) : undefined),
          buildRow("Principal reduction over modeled term", formatCurrency(getPrincipalReduction(scenarioA)), formatCurrency(getPrincipalReduction(scenarioB)), scenarioC ? formatCurrency(getPrincipalReduction(scenarioC)) : undefined),
          buildRow("Total interest paid", formatCurrency(getTotalInterest(scenarioA)), formatCurrency(getTotalInterest(scenarioB)), scenarioC ? formatCurrency(getTotalInterest(scenarioC)) : undefined),
        ],
      },
    ],
    methodology: [
      "Comparison figures use each scenario's persisted activeSnapshot; exports do not recalculate.",
      "Financing cost excludes principal repayment; principal reduction is reported separately.",
      "All-in monthly housing payment is a secondary cash-flow metric.",
      "Primary economic ranking uses financing cost over a shared decision horizon; principal repayment is excluded.",
      "Scenarios with mismatched horizons or missing financing cost are excluded from the primary winner determination.",
      "Rates shown are assumed inputs, not lender quotes.",
      "No recommendation is implied by the order or presentation of scenarios.",
    ],
    disclaimer:
      "This document is provided for analytical and planning purposes only. SettleRate does not originate, broker, or recommend mortgage products. All figures shown are modeled estimates and do not constitute a loan offer, guarantee, or financial advice.",
  };
}

// ============================================================================
// HTML GENERATOR (for print)
// ============================================================================

/**
 * Generate HTML from layout data - used for in-page printing.
 * Uses the same layout structure as PDF generation for consistency.
 */
export function generateHTMLFromLayout(layout: ExportLayoutData): string {
  const renderSection = (section: ExportSection): string => {
    switch (section.type) {
      case "table":
        return `
          <section class="section">
            <h2 class="section-title">${section.title}</h2>
            <div class="table-wrap">
              <table>
                <tbody>
                  ${section.rows?.map((row, i) => {
                    const isTotal = row.label.toLowerCase().includes("total");
                    return `<tr class="${isTotal ? "total-row" : ""}">
                      <td>${row.label}</td>
                      <td>${row.value}</td>
                    </tr>`;
                  }).join("") ?? ""}
                </tbody>
              </table>
            </div>
          </section>
        `;
      
      case "comparison-table": {
        const colCount = section.columns?.length || 3;
        const colClass = colCount === 4 ? "cols-4" : "cols-3";
        return `
          <section class="section">
            <h2 class="section-title">${section.title}</h2>
            <div class="table-wrap">
              <table class="comparison-table ${colClass}">
                <thead>
                  <tr>
                    ${section.columns?.map(col => `<th>${col}</th>`).join("") ?? ""}
                  </tr>
                </thead>
                <tbody>
                  ${section.rows?.map((row) => {
                    const isTotal = row.label.toLowerCase().includes("total");
                    return `<tr class="${isTotal ? "total-row" : ""}">
                      <td>${row.label}</td>
                      <td>${row.value}</td>
                      <td>${row.value2 ?? ""}</td>
                      ${row.value3 !== undefined ? `<td>${row.value3}</td>` : ""}
                    </tr>`;
                  }).join("") ?? ""}
                </tbody>
              </table>
            </div>
          </section>
        `;
      }
      
      case "key-diff":
        return `
          <section class="section">
            <h2 class="section-title">${section.title}</h2>
            <div class="key-diff-grid">
              ${section.items?.map(item => `
                <div class="key-diff-item">
                  <span class="key-diff-label">${item.label}</span>
                  <span class="key-diff-value">${item.value}</span>
                </div>
              `).join("") ?? ""}
            </div>
          </section>
        `;
      
      case "key-diff-groups":
        return `
          <section class="section">
            <h2 class="section-title">${section.title}</h2>
            ${section.groups?.map(group => `
              <div class="key-diff-group">
                <div class="key-diff-group-label">${group.label}</div>
                <div class="key-diff-grid">
                  ${group.items.map(item => `
                    <div class="key-diff-item">
                      <span class="key-diff-label">${item.label}</span>
                      <span class="key-diff-value">${item.value}</span>
                    </div>
                  `).join("")}
                </div>
              </div>
            `).join("") ?? ""}
          </section>
        `;
      
      case "text":
        return `
          <section class="section">
            <h2 class="section-title">${section.title}</h2>
            <p class="summary-text">${section.text ?? ""}</p>
          </section>
        `;
      
      default:
        return "";
    }
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${layout.title} - ${layout.brand}</title>
  <style>${CANONICAL_EXPORT_STYLES}</style>
</head>
<body>
  <div class="export-page">
    <div class="export-content">
      <!-- Header -->
      <header class="header">
        <p class="header-brand">${layout.brand}</p>
        <h1 class="header-title">${layout.title}</h1>
        <p class="header-meta">
          ${layout.meta.join(" &nbsp;•&nbsp; ")}
        </p>
        <p class="header-meta">Generated: ${layout.generatedDate}</p>
      </header>
      
      <!-- Sections -->
      ${layout.sections.map(renderSection).join("")}
      
      <!-- Methodology -->
      <section class="section">
        <h2 class="section-title">Methodology</h2>
        <ul class="notes-list">
          ${layout.methodology.map(note => `<li>${note}</li>`).join("")}
        </ul>
      </section>
      
      <!-- Footer -->
      <footer class="footer">
        <div class="footer-meta">
          <span>${layout.brand} — ${BRAND.domain}</span>
          <span>Generated ${layout.generatedDate}</span>
        </div>
        <p class="footer-disclaimer">${layout.disclaimer}</p>
      </footer>
    </div>
  </div>
</body>
</html>
  `.trim();
}
