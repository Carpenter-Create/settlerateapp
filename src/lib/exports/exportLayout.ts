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
  formatSignedDelta,
  formatSignedBasisPoints,
  formatLtvDelta,
} from "@/lib/comparisonSummary";

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
  
  /* Screen preview (mobile + desktop) */
  @media screen {
    .export-page {
      padding: 48px 64px;
    }
    
    .export-content {
      max-width: 820px;
      margin: 0 auto;
    }
    
    @media (max-width: 640px) {
      .export-page {
        padding: 24px;
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
    margin-bottom: 28px;
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
 * Used by both print HTML and PDF generators.
 */
export function buildScenarioLayout(scenario: ScenarioData): ExportLayoutData {
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  
  const shortId = scenario.id.substring(0, 8).toUpperCase();
  const { inputs, results, name } = scenario;
  const isPurchase = inputs.mode === "purchase";
  
  const propertyValue = isPurchase 
    ? inputs.purchase.purchasePrice 
    : (inputs.refinance.estimatedHomeValue ?? results.loanAmount);
  
  const downPaymentAmount = isPurchase
    ? calculateDownPaymentAmount(
        inputs.purchase.purchasePrice,
        inputs.purchase.downPayment,
        inputs.purchase.downPaymentType
      )
    : 0;

  const payoffDate = new Date();
  payoffDate.setMonth(payoffDate.getMonth() + results.payoffMonths);
  const payoffDateStr = payoffDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });

  // Build overview rows
  const overviewRows: { label: string; value: string }[] = [
    { label: "Loan type", value: TRANSACTION_TYPE_LABELS[inputs.mode] },
    { label: "Property value", value: formatCurrency(propertyValue) },
  ];
  
  if (isPurchase) {
    const dpPercent = propertyValue > 0 ? (downPaymentAmount / propertyValue * 100) : 0;
    overviewRows.push({
      label: "Down payment",
      value: `${formatCurrency(downPaymentAmount)} (${formatPercent(dpPercent)})`,
    });
  } else {
    overviewRows.push({
      label: "Current loan balance",
      value: formatCurrency(inputs.refinance.currentLoanBalance),
    });
  }
  
  overviewRows.push(
    { label: "Loan amount", value: formatCurrency(results.loanAmount) },
    { label: "Loan term", value: `${inputs.shared.loanTerm} years` },
    { label: "Interest rate (assumed)", value: formatPercent(inputs.shared.interestRate) },
    { label: "Loan-to-value ratio", value: formatPercent(results.ltvRatio) }
  );

  // Build monthly payment rows
  const paymentRows: { label: string; value: string }[] = [
    { label: "Principal & interest", value: formatCurrency(results.monthlyPrincipalInterest) },
  ];
  if (results.monthlyPropertyTax > 0) {
    paymentRows.push({ label: "Property tax", value: formatCurrency(results.monthlyPropertyTax) });
  }
  if (results.monthlyHomeInsurance > 0) {
    paymentRows.push({ label: "Home insurance", value: formatCurrency(results.monthlyHomeInsurance) });
  }
  if (results.monthlyPMI > 0) {
    paymentRows.push({ label: "PMI", value: formatCurrency(results.monthlyPMI) });
  }
  if (results.monthlyHOA > 0) {
    paymentRows.push({ label: "HOA", value: formatCurrency(results.monthlyHOA) });
  }
  paymentRows.push({ label: "Total monthly payment", value: formatCurrency(results.monthlyTotal) });

  return {
    brand: BRAND.name,
    title: "Mortgage Scenario Summary",
    meta: [
      `Scenario: ${name || "Untitled"}`,
      `ID: ${shortId}`,
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
        title: "Long-Term Cost Summary",
        type: "table",
        rows: [
          { label: "Total payments over term", value: formatCurrency(results.totalCost) },
          { label: "Total interest paid", value: formatCurrency(results.totalInterest) },
          { label: "Projected payoff date", value: payoffDateStr },
        ],
      },
      {
        title: "Assumptions",
        type: "table",
        rows: isPurchase
          ? [
              { label: "Purchase price", value: formatCurrency(inputs.purchase.purchasePrice) },
              { label: "Property taxes (annual)", value: results.monthlyPropertyTax > 0 ? formatCurrency(results.monthlyPropertyTax * 12) : "Not specified" },
              { label: "Home insurance (annual)", value: results.monthlyHomeInsurance > 0 ? formatCurrency(results.monthlyHomeInsurance * 12) : "Not specified" },
            ]
          : [
              { label: "Estimated home value", value: inputs.refinance.estimatedHomeValue ? formatCurrency(inputs.refinance.estimatedHomeValue) : "Not specified" },
              { label: "Property taxes (annual)", value: results.monthlyPropertyTax > 0 ? formatCurrency(results.monthlyPropertyTax * 12) : "Not specified" },
              { label: "Home insurance (annual)", value: results.monthlyHomeInsurance > 0 ? formatCurrency(results.monthlyHomeInsurance * 12) : "Not specified" },
            ],
      },
    ],
    methodology: [
      "Calculations are based on standard amortization formulas.",
      "Rates shown are assumed inputs, not lender quotes.",
      "Property taxes and insurance are estimates where applicable.",
      "Results are intended for comparison and planning purposes only.",
      "Final loan terms subject to lender approval and property appraisal.",
    ],
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
  
  const getPayoffDate = (scenario: ScenarioData) => {
    const date = new Date();
    date.setMonth(date.getMonth() + scenario.results.payoffMonths);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
  };

  const nameA = scenarioA.name || "Scenario A";
  const nameB = scenarioB.name || "Scenario B";
  const nameC = scenarioC?.name || "Scenario C";

  // Build comparison meta line
  const metaLine = hasScenarioC
    ? `Comparing: ${nameA} (${shortIdA}) vs ${nameB} (${shortIdB}) vs ${nameC} (${shortIdC})`
    : `Comparing: ${nameA} (${shortIdA}) vs ${nameB} (${shortIdB})`;

  // Build summary text
  const summaryText = hasScenarioC
    ? generateThreeWaySummaryText(scenarioA, scenarioB, scenarioC!)
    : generateSummaryText(scenarioA, scenarioB);

  // Build key differences section
  const threeWayDeltas = calculateThreeWayDeltas(scenarioA, scenarioB, scenarioC);
  const { aVsB, cVsB } = threeWayDeltas;

  const keyDiffSection: ExportSection = hasScenarioC
    ? {
        title: "Key Differences",
        type: "key-diff-groups",
        groups: [
          {
            label: `${nameA} vs ${nameB}`,
            items: [
              { label: "Monthly payment", value: formatSignedDelta(aVsB.monthlyPaymentDelta) },
              { label: "Total cost", value: formatSignedDelta(aVsB.totalCostDelta) },
              { label: "Total interest", value: formatSignedDelta(aVsB.totalInterestDelta) },
              { label: "Interest rate", value: formatSignedBasisPoints(aVsB.interestRateDelta) },
              { label: "LTV", value: formatLtvDelta(aVsB.ltvDelta) },
            ],
          },
          {
            label: `${nameC} vs ${nameB}`,
            items: [
              { label: "Monthly payment", value: formatSignedDelta(cVsB!.monthlyPaymentDelta) },
              { label: "Total cost", value: formatSignedDelta(cVsB!.totalCostDelta) },
              { label: "Total interest", value: formatSignedDelta(cVsB!.totalInterestDelta) },
              { label: "Interest rate", value: formatSignedBasisPoints(cVsB!.interestRateDelta) },
              { label: "LTV", value: formatLtvDelta(cVsB!.ltvDelta) },
            ],
          },
        ],
      }
    : {
        title: "Key Differences",
        type: "key-diff",
        items: [
          { label: "Monthly payment", value: formatSignedDelta(aVsB.monthlyPaymentDelta) },
          { label: "Total cost", value: formatSignedDelta(aVsB.totalCostDelta) },
          { label: "Total interest", value: formatSignedDelta(aVsB.totalInterestDelta) },
          { label: "Interest rate", value: formatSignedBasisPoints(aVsB.interestRateDelta) },
          { label: "LTV", value: formatLtvDelta(aVsB.ltvDelta) },
        ],
      };

  // Build comparison table rows (2 or 3 columns)
  const columns = hasScenarioC
    ? ["Metric", nameA, nameB, nameC]
    : ["Metric", nameA, nameB];

  const buildRow = (label: string, valueA: string, valueB: string, valueC?: string) => {
    return hasScenarioC
      ? { label, value: valueA, value2: valueB, value3: valueC }
      : { label, value: valueA, value2: valueB };
  };

  return {
    brand: BRAND.name,
    title: "Mortgage Scenario Comparison",
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
          buildRow("Loan amount", formatCurrency(scenarioA.results.loanAmount), formatCurrency(scenarioB.results.loanAmount), scenarioC ? formatCurrency(scenarioC.results.loanAmount) : undefined),
          buildRow("Term", `${scenarioA.inputs.shared.loanTerm} years`, `${scenarioB.inputs.shared.loanTerm} years`, scenarioC ? `${scenarioC.inputs.shared.loanTerm} years` : undefined),
          buildRow("Interest rate (assumed)", formatPercent(scenarioA.inputs.shared.interestRate), formatPercent(scenarioB.inputs.shared.interestRate), scenarioC ? formatPercent(scenarioC.inputs.shared.interestRate) : undefined),
          buildRow("Loan-to-value ratio", formatPercent(scenarioA.results.ltvRatio), formatPercent(scenarioB.results.ltvRatio), scenarioC ? formatPercent(scenarioC.results.ltvRatio) : undefined),
        ],
      },
      {
        title: "Monthly Payment",
        type: "comparison-table",
        columns: hasScenarioC ? ["Component", nameA, nameB, nameC] : ["Component", nameA, nameB],
        rows: [
          buildRow("Principal & interest", formatCurrency(scenarioA.results.monthlyPrincipalInterest), formatCurrency(scenarioB.results.monthlyPrincipalInterest), scenarioC ? formatCurrency(scenarioC.results.monthlyPrincipalInterest) : undefined),
          buildRow("Total monthly payment", formatCurrency(scenarioA.results.monthlyTotal), formatCurrency(scenarioB.results.monthlyTotal), scenarioC ? formatCurrency(scenarioC.results.monthlyTotal) : undefined),
        ],
      },
      {
        title: "Long-Term Cost",
        type: "comparison-table",
        columns: hasScenarioC ? ["Metric", nameA, nameB, nameC] : ["Metric", nameA, nameB],
        rows: [
          buildRow("Total payments over term", formatCurrency(scenarioA.results.totalCost), formatCurrency(scenarioB.results.totalCost), scenarioC ? formatCurrency(scenarioC.results.totalCost) : undefined),
          buildRow("Total interest paid", formatCurrency(scenarioA.results.totalInterest), formatCurrency(scenarioB.results.totalInterest), scenarioC ? formatCurrency(scenarioC.results.totalInterest) : undefined),
          buildRow("Projected payoff date", getPayoffDate(scenarioA), getPayoffDate(scenarioB), scenarioC ? getPayoffDate(scenarioC) : undefined),
        ],
      },
    ],
    methodology: [
      "Calculations are based on standard amortization formulas.",
      "Rates shown are assumed inputs, not lender quotes.",
      "Property taxes and insurance are estimates where applicable.",
      "No recommendation is implied by the order or presentation of scenarios.",
      "Results are intended for comparison and planning purposes only.",
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
      
      case "comparison-table":
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
