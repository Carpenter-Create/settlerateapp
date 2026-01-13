/**
 * SettleRate Professional Export System
 * 
 * Lender- and advisor-ready handoff packages for scenario exports.
 * 
 * This module provides two export types:
 * 1. Single Scenario Export - Comprehensive summary for individual review
 * 2. Comparison Export - Side-by-side analysis for decision support
 * 
 * Visual Rules (LOCKED):
 * - Black, white, grayscale only
 * - No accent colors
 * - Print-safe typography
 * - No charts unless strictly tabular
 * - Consistent margins and spacing
 * 
 * Access Control:
 * - Professional Review tier and admin only
 * - Admin bypasses billing checks
 * - No share links generated automatically
 */

import { formatCurrency, formatPercent, calculateDownPaymentAmount, TRANSACTION_TYPE_LABELS } from "@/lib/mortgage";
import type { ScenarioData } from "@/lib/scenarioContract";
import { 
  calculateDeltas, 
  generateSummaryText, 
  formatSignedDelta, 
  formatSignedBasisPoints, 
  formatLtvDelta 
} from "@/lib/comparisonSummary";

// ============================================================================
// FILE NAMING
// ============================================================================

/**
 * Generate filename for single scenario export
 * Format: SettleRate_Scenario_[name]_YYYY-MM-DD.pdf
 */
export function generateScenarioFilename(scenario: ScenarioData): string {
  const date = new Date().toISOString().split("T")[0];
  const safeName = (scenario.name || "Untitled")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .substring(0, 30);
  return `SettleRate_Scenario_${safeName}_${date}`;
}

/**
 * Generate filename for comparison export
 * Format: SettleRate_Comparison_[A_vs_B]_YYYY-MM-DD.pdf
 */
export function generateComparisonFilename(scenarioA: ScenarioData, scenarioB: ScenarioData): string {
  const date = new Date().toISOString().split("T")[0];
  const nameA = (scenarioA.name || "A").replace(/[^a-zA-Z0-9]/g, "_").substring(0, 15);
  const nameB = (scenarioB.name || "B").replace(/[^a-zA-Z0-9]/g, "_").substring(0, 15);
  return `SettleRate_Comparison_${nameA}_vs_${nameB}_${date}`;
}

// ============================================================================
// SHARED STYLES
// ============================================================================

const SHARED_STYLES = `
  /* =================================================================
   * Export Page Styles - Institutional Grade Print/PDF
   * 
   * STRUCTURE:
   * - .export-page: Root wrapper (mobile padding + centering)
   * - .export-content: Content container (max-width + auto margins)
   * - .table-wrap: Scrollable table container for mobile
   * ================================================================= */

  @page {
    size: letter;
    margin: 18mm 16mm;
    
    @bottom-left {
      content: "SettleRate™ — Mortgage decision support";
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 6pt;
      color: #999;
      line-height: 1.4;
      vertical-align: top;
    }
    
    @bottom-right {
      content: "Page " counter(page) " of " counter(pages);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 6pt;
      color: #999;
      text-align: right;
      line-height: 1.4;
      vertical-align: top;
    }
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 12.5px;
    line-height: 1.45;
    color: #111;
    background: #fff;
  }
  
  /* Export root container */
  .export-page {
    background: #fff;
    color: #111;
  }
  
  /* Screen preview (mobile + desktop) */
  @media screen {
    .export-page {
      padding-left: max(16px, env(safe-area-inset-left));
      padding-right: max(16px, env(safe-area-inset-right));
      padding-top: 16px;
      padding-bottom: 24px;
    }
    
    /* Constrain line length for document readability */
    .export-content {
      max-width: 820px;
      margin: 0 auto;
    }
  }
  
  /* Print/PDF styles */
  @media print {
    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-size: 10pt;
      line-height: 1.5;
    }
    
    .export-page {
      padding: 0 !important;
    }
    
    .export-content {
      max-width: none;
      margin: 0;
    }
    
    /* Avoid table rows splitting awkwardly */
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
  
  /* Typography */
  .serif {
    font-family: Georgia, "Times New Roman", serif;
  }
  
  .mono {
    font-family: "SF Mono", Monaco, "Courier New", monospace;
  }
  
  .text-muted {
    color: #666;
  }
  
  .text-light {
    color: #999;
  }

  /* Export typography (screen) */
  h1 { font-size: 20px; margin: 0 0 8px; }
  h2 { font-size: 14px; margin: 18px 0 8px; }
  p  { margin: 0 0 10px; }
  
  @media print {
    h1 { font-size: 18pt; }
    h2 { font-size: 11pt; }
  }
  
  /* Header */
  .header {
    margin-bottom: 24px;
    padding-bottom: 12px;
    border-bottom: 1px solid #d0d0d0;
  }
  
  .header-brand {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 10pt;
    color: #666;
    margin-bottom: 16px;
  }
  
  .header-title {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 18pt;
    font-weight: 500;
    color: #1a1a1a;
    margin-bottom: 4px;
  }
  
  .header-meta {
    font-size: 9pt;
    color: #666;
  }
  
  /* Sections */
  .section {
    margin-bottom: 24px;
  }
  
  .section-title {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 11pt;
    font-weight: 500;
    color: #333;
    margin-bottom: 10px;
    padding-bottom: 4px;
    border-bottom: 1px solid #e8e8e8;
  }
  
  /* Table wrapper for mobile scroll */
  .table-wrap {
    width: 100%;
  }
  
  @media screen and (max-width: 480px) {
    .table-wrap {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      margin: 0 -4px;
      padding: 0 4px;
    }
    
    .table-wrap table {
      min-width: 500px;
    }
  }
  
  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9pt;
  }
  
  th {
    text-align: left;
    font-weight: 500;
    padding: 10px 12px;
    border-bottom: 1px solid #d0d0d0;
    color: #333;
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
    padding: 10px 12px;
    border-bottom: 1px solid #f0f0f0;
    vertical-align: top;
  }
  
  td:first-child {
    color: #666;
    padding-left: 0;
  }
  
  td:last-child {
    padding-right: 0;
  }
  
  td:not(:first-child) {
    text-align: right;
    font-family: "SF Mono", Monaco, "Courier New", monospace;
    font-size: 9pt;
  }
  
  tr:last-child td {
    border-bottom: none;
  }
  
  .total-row td {
    padding-top: 10px;
    border-top: 1px solid #d0d0d0;
    font-weight: 500;
  }
  
  .total-row td:first-child {
    color: #333;
  }
  
  /* Comparison tables */
  .comparison-table th:first-child {
    width: 40%;
  }
  
  .comparison-table th:not(:first-child) {
    width: 30%;
  }
  
  /* Key differences summary table */
  .key-diff-table {
    font-size: 8pt;
    border-collapse: collapse;
  }
  
  .key-diff-table td {
    padding: 6px 16px 6px 0;
    border-bottom: 1px solid #e8e8e8;
    vertical-align: top;
  }
  
  .key-diff-table td:last-child {
    padding-right: 0;
  }
  
  .key-diff-label {
    color: #666;
    display: block;
    font-size: 7pt;
    margin-bottom: 2px;
  }
  
  .key-diff-value {
    font-family: "SF Mono", Monaco, monospace;
  }
  
  /* Mobile: stack key differences vertically */
  @media screen and (max-width: 480px) {
    .key-diff-table tr {
      display: flex;
      flex-direction: column;
    }
    
    .key-diff-table td {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    
    .key-diff-label {
      display: inline;
      margin-bottom: 0;
    }
  }
  
  /* Notes and methodology */
  .notes-list {
    list-style: none;
    padding: 0;
    color: #666;
    font-size: 9pt;
  }
  
  .notes-list li {
    padding-left: 14px;
    position: relative;
    margin-bottom: 5px;
    line-height: 1.5;
  }
  
  .notes-list li::before {
    content: "•";
    position: absolute;
    left: 0;
    color: #999;
  }
  
  /* Footer */
  .footer {
    margin-top: 32px;
    padding-top: 12px;
    border-top: 1px solid #d0d0d0;
  }
  
  .footer-disclaimer {
    font-size: 8pt;
    color: #888;
    line-height: 1.5;
    text-align: center;
  }
  
  /* Comparison summary paragraph */
  .summary-text {
    font-size: 9pt;
    line-height: 1.65;
    color: #333;
    margin-bottom: 16px;
  }
  
  @media screen and (max-width: 480px) {
    .summary-text {
      font-size: 13px;
      line-height: 1.55;
    }
  }
`;

// ============================================================================
// SINGLE SCENARIO EXPORT
// ============================================================================

/**
 * Generate HTML for single scenario export
 * 
 * Document Structure:
 * - Title: Mortgage Scenario Summary
 * - Scenario identifier + generated date
 * - Scenario overview
 * - Monthly payment summary
 * - Long-term cost summary
 * - Assumptions
 * - Methodology + disclaimer
 * - Footer attribution
 */
export function generateScenarioHTML(scenario: ScenarioData): string {
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  
  const shortId = scenario.id.substring(0, 8).toUpperCase();
  const { inputs, results, name } = scenario;
  const isPurchase = inputs.mode === "purchase";
  
  // Calculate values
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

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mortgage Scenario Summary - ${name || "Untitled"}</title>
  <style>${SHARED_STYLES}</style>
</head>
<body>
  <div class="export-page">
    <div class="export-content">
      <!-- Header -->
      <header class="header">
        <p class="header-brand">SettleRate</p>
        <h1 class="header-title">Mortgage Scenario Summary</h1>
        <p class="header-meta">
          Scenario: ${name || "Untitled"} &nbsp;•&nbsp; ID: ${shortId} &nbsp;•&nbsp; Generated: ${dateStr}
        </p>
      </header>
      
      <!-- Section 1: Scenario Overview -->
      <section class="section">
        <h2 class="section-title">Scenario Overview</h2>
        <div class="table-wrap">
          <table>
            <tr>
              <td>Loan type</td>
              <td>${TRANSACTION_TYPE_LABELS[inputs.mode]}</td>
            </tr>
            <tr>
              <td>Property value</td>
              <td>${formatCurrency(propertyValue)}</td>
            </tr>
            ${isPurchase ? `
            <tr>
              <td>Down payment</td>
              <td>${formatCurrency(downPaymentAmount)} (${formatPercent(downPaymentAmount / propertyValue * 100)})</td>
            </tr>
            ` : `
            <tr>
              <td>Current loan balance</td>
              <td>${formatCurrency(inputs.refinance.currentLoanBalance)}</td>
            </tr>
            `}
            <tr>
              <td>Loan amount</td>
              <td>${formatCurrency(results.loanAmount)}</td>
            </tr>
            <tr>
              <td>Loan term</td>
              <td>${inputs.shared.loanTerm} years</td>
            </tr>
            <tr>
              <td>Interest rate (assumed)</td>
              <td>${formatPercent(inputs.shared.interestRate)}</td>
            </tr>
            <tr>
              <td>Loan-to-value ratio</td>
              <td>${formatPercent(results.ltvRatio)}</td>
            </tr>
          </table>
        </div>
      </section>
      
      <!-- Section 2: Monthly Payment -->
      <section class="section">
        <h2 class="section-title">Monthly Payment</h2>
        <div class="table-wrap">
          <table>
            <tr>
              <td>Principal & interest</td>
              <td>${formatCurrency(results.monthlyPrincipalInterest)}</td>
            </tr>
            ${results.monthlyPropertyTax > 0 ? `
            <tr>
              <td>Property tax</td>
              <td>${formatCurrency(results.monthlyPropertyTax)}</td>
            </tr>
            ` : ""}
            ${results.monthlyHomeInsurance > 0 ? `
            <tr>
              <td>Home insurance</td>
              <td>${formatCurrency(results.monthlyHomeInsurance)}</td>
            </tr>
            ` : ""}
            ${results.monthlyPMI > 0 ? `
            <tr>
              <td>PMI</td>
              <td>${formatCurrency(results.monthlyPMI)}</td>
            </tr>
            ` : ""}
            ${results.monthlyHOA > 0 ? `
            <tr>
              <td>HOA</td>
              <td>${formatCurrency(results.monthlyHOA)}</td>
            </tr>
            ` : ""}
            <tr class="total-row">
              <td>Total monthly payment</td>
              <td>${formatCurrency(results.monthlyTotal)}</td>
            </tr>
          </table>
        </div>
      </section>
      
      <!-- Section 3: Long-Term Cost Summary -->
      <section class="section">
        <h2 class="section-title">Long-Term Cost Summary</h2>
        <div class="table-wrap">
          <table>
            <tr>
              <td>Total payments over term</td>
              <td>${formatCurrency(results.totalCost)}</td>
            </tr>
            <tr>
              <td>Total interest paid</td>
              <td>${formatCurrency(results.totalInterest)}</td>
            </tr>
            <tr>
              <td>Projected payoff date</td>
              <td>${payoffDateStr}</td>
            </tr>
          </table>
        </div>
      </section>
      
      <!-- Section 4: Assumptions -->
      <section class="section">
        <h2 class="section-title">Assumptions</h2>
        <div class="table-wrap">
          <table>
            ${isPurchase ? `
            <tr>
              <td>Purchase price</td>
              <td>${formatCurrency(inputs.purchase.purchasePrice)}</td>
            </tr>
            ` : `
            <tr>
              <td>Estimated home value</td>
              <td>${inputs.refinance.estimatedHomeValue ? formatCurrency(inputs.refinance.estimatedHomeValue) : "Not specified"}</td>
            </tr>
            `}
            <tr>
              <td>Property taxes (annual)</td>
              <td>${results.monthlyPropertyTax > 0 ? formatCurrency(results.monthlyPropertyTax * 12) : "Not specified"}</td>
            </tr>
            <tr>
              <td>Home insurance (annual)</td>
              <td>${results.monthlyHomeInsurance > 0 ? formatCurrency(results.monthlyHomeInsurance * 12) : "Not specified"}</td>
            </tr>
          </table>
        </div>
      </section>
      
      <!-- Section 5: Methodology -->
      <section class="section">
        <h2 class="section-title">Methodology</h2>
        <ul class="notes-list">
          <li>Calculations are based on standard amortization formulas.</li>
          <li>Rates shown are assumed inputs, not lender quotes.</li>
          <li>Property taxes and insurance are estimates where applicable.</li>
          <li>Results are intended for comparison and planning purposes only.</li>
          <li>Final loan terms subject to lender approval and property appraisal.</li>
        </ul>
      </section>
      
      <!-- Footer -->
      <footer class="footer">
        <p class="footer-disclaimer">
          This document is provided for analytical and planning purposes only. SettleRate does not originate, 
          broker, or recommend mortgage products. All figures shown are modeled estimates and do not constitute 
          a loan offer, guarantee, or financial advice.
        </p>
      </footer>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// ============================================================================
// COMPARISON EXPORT
// ============================================================================

/**
 * Generate HTML for comparison export
 * 
 * Document Structure:
 * - Title: Mortgage Scenario Comparison
 * - Scenario A and Scenario B identifiers
 * - Side-by-side comparison tables
 * - Shared assumptions listed once
 * - Methodology + disclaimer
 * - Footer attribution
 */
export function generateComparisonHTML(scenarioA: ScenarioData, scenarioB: ScenarioData): string {
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  
  const shortIdA = scenarioA.id.substring(0, 8).toUpperCase();
  const shortIdB = scenarioB.id.substring(0, 8).toUpperCase();
  
  // Calculate payoff dates
  const getPayoffDate = (scenario: ScenarioData) => {
    const date = new Date();
    date.setMonth(date.getMonth() + scenario.results.payoffMonths);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mortgage Scenario Comparison</title>
  <style>${SHARED_STYLES}</style>
</head>
<body>
  <div class="export-page">
    <div class="export-content">
      <!-- Header -->
      <header class="header">
        <p class="header-brand">SettleRate</p>
        <h1 class="header-title">Mortgage Scenario Comparison</h1>
        <p class="header-meta">
          Comparing: ${scenarioA.name || "Scenario A"} (${shortIdA}) vs ${scenarioB.name || "Scenario B"} (${shortIdB})
        </p>
        <p class="header-meta">Generated: ${dateStr}</p>
      </header>
      
      <!-- Comparison Summary -->
      <section class="section" style="page-break-inside: avoid;">
        <h2 class="section-title">Comparison Summary</h2>
        <p class="summary-text">
          ${generateSummaryText(scenarioA, scenarioB)}
        </p>
        <table class="key-diff-table">
          <tr>
            <td>
              <span class="key-diff-label">Monthly payment</span>
              <span class="key-diff-value">${formatSignedDelta(calculateDeltas(scenarioA, scenarioB).monthlyPaymentDelta)}</span>
            </td>
            <td>
              <span class="key-diff-label">Total cost</span>
              <span class="key-diff-value">${formatSignedDelta(calculateDeltas(scenarioA, scenarioB).totalCostDelta)}</span>
            </td>
            <td>
              <span class="key-diff-label">Total interest</span>
              <span class="key-diff-value">${formatSignedDelta(calculateDeltas(scenarioA, scenarioB).totalInterestDelta)}</span>
            </td>
            <td>
              <span class="key-diff-label">Interest rate</span>
              <span class="key-diff-value">${formatSignedBasisPoints(calculateDeltas(scenarioA, scenarioB).interestRateDelta)}</span>
            </td>
            <td>
              <span class="key-diff-label">LTV</span>
              <span class="key-diff-value">${formatLtvDelta(calculateDeltas(scenarioA, scenarioB).ltvDelta)}</span>
            </td>
          </tr>
        </table>
      </section>
      
      <!-- Section 1: Scenario Overview -->
      <section class="section">
        <h2 class="section-title">Scenario Overview</h2>
        <div class="table-wrap">
          <table class="comparison-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>${scenarioA.name || "Scenario A"}</th>
                <th>${scenarioB.name || "Scenario B"}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Loan type</td>
                <td>${TRANSACTION_TYPE_LABELS[scenarioA.inputs.mode]}</td>
                <td>${TRANSACTION_TYPE_LABELS[scenarioB.inputs.mode]}</td>
              </tr>
              <tr>
                <td>Loan amount</td>
                <td>${formatCurrency(scenarioA.results.loanAmount)}</td>
                <td>${formatCurrency(scenarioB.results.loanAmount)}</td>
              </tr>
              <tr>
                <td>Term</td>
                <td>${scenarioA.inputs.shared.loanTerm} years</td>
                <td>${scenarioB.inputs.shared.loanTerm} years</td>
              </tr>
              <tr>
                <td>Interest rate (assumed)</td>
                <td>${formatPercent(scenarioA.inputs.shared.interestRate)}</td>
                <td>${formatPercent(scenarioB.inputs.shared.interestRate)}</td>
              </tr>
              <tr>
                <td>Loan-to-value ratio</td>
                <td>${formatPercent(scenarioA.results.ltvRatio)}</td>
                <td>${formatPercent(scenarioB.results.ltvRatio)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      
      <!-- Section 2: Monthly Payment -->
      <section class="section">
        <h2 class="section-title">Monthly Payment</h2>
        <div class="table-wrap">
          <table class="comparison-table">
            <thead>
              <tr>
                <th>Component</th>
                <th>${scenarioA.name || "Scenario A"}</th>
                <th>${scenarioB.name || "Scenario B"}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Principal & interest</td>
                <td>${formatCurrency(scenarioA.results.monthlyPrincipalInterest)}</td>
                <td>${formatCurrency(scenarioB.results.monthlyPrincipalInterest)}</td>
              </tr>
              <tr class="total-row">
                <td>Total monthly payment</td>
                <td>${formatCurrency(scenarioA.results.monthlyTotal)}</td>
                <td>${formatCurrency(scenarioB.results.monthlyTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      
      <!-- Section 3: Long-Term Cost -->
      <section class="section">
        <h2 class="section-title">Long-Term Cost</h2>
        <div class="table-wrap">
          <table class="comparison-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>${scenarioA.name || "Scenario A"}</th>
                <th>${scenarioB.name || "Scenario B"}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Total payments over term</td>
                <td>${formatCurrency(scenarioA.results.totalCost)}</td>
                <td>${formatCurrency(scenarioB.results.totalCost)}</td>
              </tr>
              <tr>
                <td>Total interest paid</td>
                <td>${formatCurrency(scenarioA.results.totalInterest)}</td>
                <td>${formatCurrency(scenarioB.results.totalInterest)}</td>
              </tr>
              <tr>
                <td>Projected payoff date</td>
                <td>${getPayoffDate(scenarioA)}</td>
                <td>${getPayoffDate(scenarioB)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      
      <!-- Section 4: Methodology -->
      <section class="section">
        <h2 class="section-title">Methodology</h2>
        <ul class="notes-list">
          <li>Calculations are based on standard amortization formulas.</li>
          <li>Rates shown are assumed inputs, not lender quotes.</li>
          <li>Property taxes and insurance are estimates where applicable.</li>
          <li>No recommendation is implied by the order or presentation of scenarios.</li>
          <li>Results are intended for comparison and planning purposes only.</li>
        </ul>
      </section>
      
      <!-- Footer -->
      <footer class="footer">
        <p class="footer-disclaimer">
          This document is provided for analytical and planning purposes only. SettleRate does not originate, 
          broker, or recommend mortgage products. All figures shown are modeled estimates and do not constitute 
          a loan offer, guarantee, or financial advice.
        </p>
      </footer>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Trigger in-page print without opening new tab
 * (Legacy - use PrintController instead)
 */
function openPrintWindow(html: string, filename: string): void {
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
export function exportComparisonPDF(scenarioA: ScenarioData, scenarioB: ScenarioData): void {
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
export function downloadComparisonHTML(scenarioA: ScenarioData, scenarioB: ScenarioData): void {
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
