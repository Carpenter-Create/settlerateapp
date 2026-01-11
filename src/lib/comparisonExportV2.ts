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
    line-height: 1.5;
    color: #1a1a1a;
    padding: 48px;
    max-width: 800px;
    margin: 0 auto;
  }
  
  h1 {
    font-size: 18pt;
    font-weight: 500;
    margin-bottom: 4px;
    font-family: Georgia, "Times New Roman", serif;
  }
  
  h2 {
    font-size: 14pt;
    font-weight: 500;
    margin-bottom: 8px;
    font-family: Georgia, "Times New Roman", serif;
  }
  
  .brand {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 12pt;
    font-weight: 500;
    color: #333;
    margin-bottom: 24px;
  }
  
  .header {
    margin-bottom: 32px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .meta {
    font-size: 10pt;
    color: #666;
  }
  
  .section {
    margin-bottom: 28px;
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
    padding: 8px 12px;
    text-align: right;
    border-bottom: 1px solid #e8e8e8;
  }
  
  th {
    font-weight: 500;
    font-size: 10pt;
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
    margin-bottom: 4px;
  }
  
  li::before {
    content: "•";
    position: absolute;
    left: 0;
    color: #999;
  }
  
  .footer {
    margin-top: 40px;
    padding-top: 16px;
    border-top: 1px solid #e0e0e0;
    font-size: 9pt;
    color: #999;
  }
  
  .note {
    font-size: 10pt;
    color: #666;
    font-style: italic;
    margin-top: 8px;
  }
  
  @media print {
    body {
      padding: 0;
    }
    
    @page {
      margin: 0.75in;
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
  <p class="brand">SettleRate</p>
  
  <div class="header">
    <h1>Mortgage Comparison Summary</h1>
    <p class="meta">${dateStr}</p>
    ${comparisonName !== "Comparison" ? `<p class="meta">${comparisonName}</p>` : ""}
  </div>
  
  <div class="section">
    <p class="section-label">Scenarios Compared</p>
    <p class="scenarios-list">${scenarios.map((s) => s.name).join(", ")}</p>
  </div>
  
  <div class="section">
    <p class="section-label">Core Comparison</p>
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
    <p class="section-label">Summary</p>
    
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
    <p class="section-label">Annual Financial Snapshot (Year 1)</p>
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
    <p class="section-label">Income Context</p>
    <p>At this payment level, housing costs represent approximately <strong>${incomeContext.percentOfIncome}%</strong> of gross monthly income, based on user-provided income data.</p>
  </div>
  ` : ""}
  
  ${rateSensitivity?.isValid ? `
  <div class="section">
    <p class="section-label">Rate Sensitivity (Illustrative)</p>
    <p>${rateSensitivity.narrative}</p>
    <p class="note">This is illustrative only. Rates shown are not predictions.</p>
  </div>
  ` : ""}
  
  ${materialChanges.length > 0 ? `
  <div class="section">
    <p class="section-label">What's Changed Since Last Time</p>
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
    <p>For informational purposes only.</p>
    <p style="margin-top: 8px; font-size: 8pt; color: #aaa;">Powered by SettleRate</p>
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
  <p class="brand">SettleRate</p>
  
  <div class="header">
    <h1>Assumptions Sheet</h1>
    <p class="meta">${dateStr}</p>
  </div>
  
  <div class="section">
    <p class="section-label">Scenarios</p>
    <p class="scenarios-list">${scenarios.map((s) => s.name).join(", ")}</p>
  </div>
  
  <div class="section">
    <p class="section-label">Loan Parameters</p>
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
          <td>Interest rate</td>
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
    <p class="section-label">Taxes & Insurance</p>
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
          <td>Monthly property tax</td>
          ${scenarios.map((s) => `<td>${s.results.monthlyPropertyTax > 0 ? formatCurrency(s.results.monthlyPropertyTax) : "—"}</td>`).join("")}
        </tr>
        <tr>
          <td>Monthly insurance</td>
          ${scenarios.map((s) => `<td>${s.results.monthlyHomeInsurance > 0 ? formatCurrency(s.results.monthlyHomeInsurance) : "—"}</td>`).join("")}
        </tr>
      </tbody>
    </table>
  </div>
  
  ${scenarios.some((s) => s.inputs.shared.extraMonthlyPayment > 0) ? `
  <div class="section">
    <p class="section-label">Extra Payments</p>
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
    <p class="section-label">Important Notes</p>
    <ul style="color: #666; font-size: 10pt;">
      <li>Rates shown are illustrative estimates and not lender quotes.</li>
      <li>Final lender terms may differ based on credit profile, property type, and market conditions.</li>
      <li>Calculations assume standard amortization with no prepayment penalties.</li>
      ${scenarios.some((s) => s.inputs.shared.usedZipEstimate) ? `<li>Tax and insurance figures are ZIP-based estimates and may vary.</li>` : ""}
    </ul>
  </div>
  
  <div class="footer">
    <p>This sheet is for reference only and does not constitute financial advice.</p>
    <p style="margin-top: 8px; font-size: 8pt; color: #aaa;">Powered by SettleRate</p>
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
