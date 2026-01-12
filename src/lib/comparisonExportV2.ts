/**
 * Comparison Export V2 - Lender-Ready Handoff
 * 
 * Two-document PDF package:
 * 1. Mortgage Comparison Summary - decision brief
 * 2. Assumptions Sheet - transparent input disclosure
 * 
 * Visual rules:
 * - Black, white, and neutral gray only
 * - No accent colors
 * - Institutional typography and spacing
 */

import { formatCurrency, formatPercent, calculateDownPaymentAmount, calculateAnnualSnapshot } from "@/lib/mortgage";
import type { ScenarioData } from "@/lib/scenarioContract";
import type { ComparisonSummary, MaterialChange } from "@/lib/comparisonContract";
import type { RateSensitivityResult } from "@/lib/rateSensitivity";

interface ExportData {
  comparisonName: string;
  scenarios: ScenarioData[];
  summary: ComparisonSummary | null;
  materialChanges: MaterialChange[];
  rateSensitivity?: RateSensitivityResult | null;
  incomeContext?: {
    grossMonthlyIncome: number;
    percentOfIncome: number;
  } | null;
}

interface MetricRow {
  label: string;
  values: string[];
}

/**
 * Common styles for both PDF documents
 */
const commonStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #1a1a1a;
    padding: 0;
    max-width: 100%;
  }
  
  .page {
    padding: 48px;
    max-width: 800px;
    margin: 0 auto;
  }
  
  .brand {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 11pt;
    font-weight: 500;
    color: #666;
    margin-bottom: 24px;
  }
  
  .header {
    margin-bottom: 36px;
    padding-bottom: 16px;
    border-bottom: 1px solid #d0d0d0;
  }
  
  .doc-title {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 20pt;
    font-weight: 500;
    margin-bottom: 6px;
    color: #1a1a1a;
  }
  
  h2, .section-title {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 13pt;
    font-weight: 500;
    color: #333;
    margin-bottom: 12px;
    padding-bottom: 6px;
    border-bottom: 1px solid #e8e8e8;
  }
  
  .meta {
    font-size: 10pt;
    color: #666;
    margin-bottom: 2px;
  }
  
  .section {
    margin-bottom: 32px;
  }
  
  .section-label {
    font-size: 9pt;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #666;
    margin-bottom: 8px;
  }
  
  .scenarios-list {
    font-size: 11pt;
    color: #333;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 8px;
  }
  
  th, td {
    padding: 10px 12px;
    text-align: right;
    border-bottom: 1px solid #f0f0f0;
  }
  
  th {
    font-weight: 500;
    font-size: 10pt;
    color: #333;
  }
  
  th:first-child,
  td:first-child {
    text-align: left;
    color: #666;
    width: 180px;
  }
  
  td {
    font-family: "SF Mono", Monaco, "Courier New", monospace;
    font-size: 10pt;
  }
  
  .summary-block {
    margin-bottom: 16px;
  }
  
  .summary-block p {
    margin-bottom: 4px;
  }
  
  .recommendation-name {
    font-family: Georgia, "Times New Roman", serif;
    font-weight: 500;
  }
  
  ul {
    list-style: none;
    padding-left: 0;
  }
  
  li {
    padding-left: 16px;
    position: relative;
    margin-bottom: 6px;
    line-height: 1.5;
  }
  
  li::before {
    content: "•";
    position: absolute;
    left: 0;
    color: #999;
  }
  
  .footer {
    margin-top: 48px;
    padding-top: 16px;
    border-top: 1px solid #d0d0d0;
  }
  
  .footer-disclaimer {
    font-size: 9pt;
    color: #888;
    line-height: 1.5;
  }
  
  .page-number {
    font-size: 9pt;
    color: #999;
    text-align: right;
    margin-top: 12px;
  }
  
  .note {
    font-size: 10pt;
    color: #666;
    font-style: italic;
    margin-top: 8px;
  }
  
  @media print {
    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .page {
      padding: 0;
    }
    
    @page {
      margin: 0.75in;
      size: letter;
    }
  }
`;

/**
 * Generate the Mortgage Comparison Summary PDF
 */
export function generateComparisonSummaryHTML(data: ExportData): string {
  const { comparisonName, scenarios, summary, materialChanges, rateSensitivity, incomeContext } = data;
  
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  
  // Build metrics table
  const metrics: MetricRow[] = [
    {
      label: "Interest rate",
      values: scenarios.map((s) => formatPercent(s.inputs.shared.interestRate)),
    },
    {
      label: "Monthly payment",
      values: scenarios.map((s) => formatCurrency(s.results.monthlyTotal)),
    },
    {
      label: "Cash required at close",
      values: scenarios.map((s) => {
        if (s.inputs.mode === "purchase") {
          const downPaymentAmount = calculateDownPaymentAmount(
            s.inputs.purchase.purchasePrice,
            s.inputs.purchase.downPayment,
            s.inputs.purchase.downPaymentType
          );
          return formatCurrency(downPaymentAmount + s.inputs.purchase.purchasePrice * 0.03);
        }
        return formatCurrency(s.inputs.refinance.closingCosts ?? 0);
      }),
    },
    {
      label: "Total interest (full term)",
      values: scenarios.map((s) => formatCurrency(s.results.totalInterest)),
    },
    {
      label: "Time to payoff",
      values: scenarios.map((s) => `${s.results.payoffMonths} months`),
    },
    {
      label: "Loan-to-value",
      values: scenarios.map((s) => formatPercent(s.results.ltvRatio)),
    },
    {
      label: "Total cost",
      values: scenarios.map((s) => formatCurrency(s.results.totalCost)),
    },
  ];

  // Build annual snapshot table (Year 1)
  const annualMetrics: MetricRow[] = [
    {
      label: "Annual payments",
      values: scenarios.map((s) => formatCurrency(calculateAnnualSnapshot(s.results).annualPayments)),
    },
    {
      label: "Annual interest",
      values: scenarios.map((s) => formatCurrency(calculateAnnualSnapshot(s.results).annualInterest)),
    },
    {
      label: "Principal reduction",
      values: scenarios.map((s) => formatCurrency(calculateAnnualSnapshot(s.results).annualPrincipalReduction)),
    },
  ];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Mortgage Comparison Summary</title>
  <style>${commonStyles}</style>
</head>
<body>
  <div class="page">
    <p class="brand">SettleRate</p>
    
    <div class="header">
      <h1 class="doc-title">Mortgage Comparison Summary</h1>
      <p class="meta">Generated ${dateStr}</p>
      ${comparisonName !== "Comparison" ? `<p class="meta">${comparisonName}</p>` : ""}
    </div>
    
    <div class="section">
      <h2 class="section-title">Scenarios Compared</h2>
      <p class="scenarios-list">${scenarios.map((s) => s.name).join(", ")}</p>
    </div>
    
    <div class="section">
      <h2 class="section-title">Core Comparison</h2>
      <table>
        <thead>
          <tr>
            <th></th>
            ${scenarios.map((s) => `<th>${s.name}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${metrics.map((m) => `
          <tr>
            <td>${m.label}</td>
            ${m.values.map((v) => `<td>${v}</td>`).join("")}
          </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    
    ${summary ? `
    <div class="section">
      <h2 class="section-title">Summary</h2>
      
      ${summary.recommendation ? `
      <div class="summary-block">
        <p><strong>Recommended option:</strong> <span class="recommendation-name">${summary.recommendation.scenario.name}</span></p>
        <p>${summary.recommendation.reason}.</p>
      </div>
      ` : ""}
      
      ${summary.benefits.length > 0 ? `
      <div class="summary-block">
        <p><strong>Why it's recommended:</strong></p>
        <ul>
          ${summary.benefits.map((b) => `<li>${b}</li>`).join("")}
        </ul>
      </div>
      ` : ""}
      
      ${summary.tradeoffs.length > 0 || summary.alternativeScenario ? `
      <div class="summary-block">
        <p><strong>When another option may make more sense:</strong></p>
        ${summary.tradeoffs.length > 0 ? `
        <ul>
          ${summary.tradeoffs.map((t) => `<li>${t.statement}${t.detail ? ` — ${t.detail}` : ""}</li>`).join("")}
        </ul>
        ` : ""}
        ${summary.alternativeScenario ? `<p>${summary.alternativeScenario.advice}</p>` : ""}
      </div>
      ` : ""}
    </div>
    ` : ""}
    
    <div class="section">
      <h2 class="section-title">Annual Financial Snapshot (Year 1)</h2>
      <table>
        <thead>
          <tr>
            <th></th>
            ${scenarios.map((s) => `<th>${s.name}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${annualMetrics.map((m) => `
          <tr>
            <td>${m.label}</td>
            ${m.values.map((v) => `<td>${v}</td>`).join("")}
          </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    
    ${incomeContext ? `
    <div class="section">
      <h2 class="section-title">Income Context</h2>
      <p>At this payment level, housing costs represent approximately <strong>${incomeContext.percentOfIncome}%</strong> of gross monthly income, based on user-provided income data.</p>
    </div>
    ` : ""}
    
    ${rateSensitivity?.isValid ? `
    <div class="section">
      <h2 class="section-title">Rate Sensitivity (Illustrative)</h2>
      <p>${rateSensitivity.narrative}</p>
      <p class="note">This is illustrative only. Rates shown are not predictions.</p>
    </div>
    ` : ""}
    
    ${materialChanges.length > 0 ? `
    <div class="section">
      <h2 class="section-title">Changes Since Last Saved</h2>
      ${materialChanges.map((c) => `
      <div style="margin-bottom: 8px;">
        <p>
          <span style="color: #666;">${c.scenarioName}:</span> 
          ${c.fieldLabel} 
          <span style="font-family: monospace;">${c.oldValue} → ${c.newValue}</span>
        </p>
        ${c.impact ? `<p class="note">${c.impact}</p>` : ""}
      </div>
      `).join("")}
    </div>
    ` : ""}
    
    <div class="footer">
      <p class="footer-disclaimer">
        This document is provided for analytical and planning purposes only and does not constitute financial or lending advice.
      </p>
      <p class="page-number">Page 1 of 1</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate the Assumptions Sheet PDF
 */
export function generateAssumptionsSheetHTML(data: ExportData): string {
  const { scenarios } = data;
  
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Assumptions Sheet</title>
  <style>${commonStyles}</style>
</head>
<body>
  <div class="page">
    <p class="brand">SettleRate</p>
    
    <div class="header">
      <h1 class="doc-title">Assumptions Sheet</h1>
      <p class="meta">Generated ${dateStr}</p>
    </div>
    
    <div class="section">
      <h2 class="section-title">Scenarios</h2>
      <p class="scenarios-list">${scenarios.map((s) => s.name).join(", ")}</p>
    </div>
    
    <div class="section">
      <h2 class="section-title">Loan Parameters</h2>
      <table>
        <thead>
          <tr>
            <th></th>
            ${scenarios.map((s) => `<th>${s.name}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Type</td>
            ${scenarios.map((s) => `<td style="text-transform: capitalize;">${s.inputs.mode}</td>`).join("")}
          </tr>
          <tr>
            <td>Loan amount</td>
            ${scenarios.map((s) => `<td>${formatCurrency(s.results.loanAmount)}</td>`).join("")}
          </tr>
          <tr>
            <td>Interest rate (assumed)</td>
            ${scenarios.map((s) => `<td>${formatPercent(s.inputs.shared.interestRate)}</td>`).join("")}
          </tr>
          <tr>
            <td>Loan term</td>
            ${scenarios.map((s) => `<td>${s.inputs.shared.loanTerm} years</td>`).join("")}
          </tr>
          ${scenarios.some((s) => s.inputs.mode === "purchase") ? `
          <tr>
            <td>Down payment</td>
            ${scenarios.map((s) => {
              if (s.inputs.mode === "purchase") {
                const amount = calculateDownPaymentAmount(
                  s.inputs.purchase.purchasePrice,
                  s.inputs.purchase.downPayment,
                  s.inputs.purchase.downPaymentType
                );
                return `<td>${formatCurrency(amount)}</td>`;
              }
              return `<td>—</td>`;
            }).join("")}
          </tr>
          ` : ""}
        </tbody>
      </table>
    </div>
    
    <div class="section">
      <h2 class="section-title">Estimated Taxes & Insurance</h2>
      <table>
        <thead>
          <tr>
            <th></th>
            ${scenarios.map((s) => `<th>${s.name}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Included in calculation</td>
            ${scenarios.map((s) => `<td>${s.inputs.shared.includeEstimates ? "Yes" : "No"}</td>`).join("")}
          </tr>
          <tr>
            <td>Source</td>
            ${scenarios.map((s) => {
              if (!s.inputs.shared.includeEstimates) return `<td>—</td>`;
              return `<td>${s.inputs.shared.usedZipEstimate ? "ZIP estimate" : "User-provided"}</td>`;
            }).join("")}
          </tr>
          <tr>
            <td>Monthly property tax (estimated)</td>
            ${scenarios.map((s) => `<td>${s.results.monthlyPropertyTax > 0 ? formatCurrency(s.results.monthlyPropertyTax) : "—"}</td>`).join("")}
          </tr>
          <tr>
            <td>Monthly insurance (estimated)</td>
            ${scenarios.map((s) => `<td>${s.results.monthlyHomeInsurance > 0 ? formatCurrency(s.results.monthlyHomeInsurance) : "—"}</td>`).join("")}
          </tr>
        </tbody>
      </table>
    </div>
    
    ${scenarios.some((s) => s.inputs.shared.extraMonthlyPayment > 0) ? `
    <div class="section">
      <h2 class="section-title">Additional Principal Payments</h2>
      <table>
        <thead>
          <tr>
            <th></th>
            ${scenarios.map((s) => `<th>${s.name}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Extra monthly payment</td>
            ${scenarios.map((s) => `<td>${s.inputs.shared.extraMonthlyPayment > 0 ? formatCurrency(s.inputs.shared.extraMonthlyPayment) : "—"}</td>`).join("")}
          </tr>
        </tbody>
      </table>
    </div>
    ` : ""}
    
    <div class="section">
      <h2 class="section-title">Assumptions & Notes</h2>
      <ul style="color: #666; font-size: 10pt;">
        <li>Interest rates shown are assumed rates and not lender quotes.</li>
        <li>Final lender terms may differ based on credit profile, property type, and market conditions.</li>
        <li>Calculations assume standard amortization with no prepayment penalties.</li>
        ${scenarios.some((s) => s.inputs.shared.usedZipEstimate) ? `<li>Tax and insurance figures are ZIP-based estimates and may vary by property.</li>` : ""}
        <li>This sheet is for reference only and does not constitute financial advice.</li>
      </ul>
    </div>
    
    <div class="footer">
      <p class="footer-disclaimer">
        This document is provided for analytical and planning purposes only and does not constitute financial or lending advice.
      </p>
      <p class="page-number">Page 1 of 1</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Export Comparison Summary PDF only
 */
export function exportComparisonSummaryPDF(data: ExportData): void {
  const html = generateComparisonSummaryHTML(data);
  openPrintWindow(html);
}

/**
 * Export Assumptions Sheet PDF only
 */
export function exportAssumptionsSheetPDF(data: ExportData): void {
  const html = generateAssumptionsSheetHTML(data);
  openPrintWindow(html);
}

/**
 * Export both documents (opens two print dialogs)
 */
export function exportBothPDFs(data: ExportData): void {
  // Open comparison summary first
  const summaryHtml = generateComparisonSummaryHTML(data);
  openPrintWindow(summaryHtml);
  
  // Slight delay before opening assumptions sheet
  setTimeout(() => {
    const assumptionsHtml = generateAssumptionsSheetHTML(data);
    openPrintWindow(assumptionsHtml);
  }, 500);
}

/**
 * Helper to open print window
 */
function openPrintWindow(html: string): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    console.error("Could not open print window");
    return;
  }
  
  printWindow.document.write(html);
  printWindow.document.close();
  
  printWindow.onload = () => {
    printWindow.print();
  };
}
