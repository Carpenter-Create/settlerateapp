/**
 * Comparison Export - Advisor-Grade PDF Generation
 * 
 * Creates institutional, neutral PDF summaries suitable for review
 * by lenders, CPAs, or financial advisors.
 * 
 * Visual rules:
 * - Black, white, and neutral gray only
 * - No brand colors
 * - No charts unless present on-screen
 * - Consistent spacing and typography
 */

import { formatCurrency, formatPercent, calculateDownPaymentAmount, calculateAnnualSnapshot } from "@/lib/mortgage";
import type { ScenarioData } from "@/lib/scenarioContract";
import type { ComparisonSummary, MaterialChange } from "@/lib/comparisonContract";

interface ExportData {
  comparisonName: string;
  scenarios: ScenarioData[];
  summary: ComparisonSummary | null;
  materialChanges: MaterialChange[];
}

interface MetricRow {
  label: string;
  values: string[];
}

/**
 * Generate and download a PDF comparison summary.
 * Uses browser print functionality for clean, accessible output.
 */
export function exportComparisonPDF(data: ExportData): void {
  const { comparisonName, scenarios, summary, materialChanges } = data;
  
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  
  const filename = `SettleRate-Comparison-${new Date().toISOString().split("T")[0]}.pdf`;
  
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

  // Create print-friendly HTML document - institutional, lender-ready
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Mortgage Comparison Summary</title>
  <style>
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
    
    .meta {
      font-size: 10pt;
      color: #666;
      margin-bottom: 2px;
    }
    
    .section {
      margin-bottom: 32px;
    }
    
    .section-title {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 13pt;
      font-weight: 500;
      color: #333;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid #e8e8e8;
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
      margin-bottom: 4px;
    }
    
    li::before {
      content: "•";
      position: absolute;
      left: 0;
      color: #999;
    }
    
    .changes-item {
      margin-bottom: 8px;
    }
    
    .changes-label {
      color: #666;
    }
    
    .changes-values {
      font-family: "SF Mono", Monaco, "Courier New", monospace;
      font-size: 10pt;
    }
    
    .changes-impact {
      font-size: 10pt;
      color: #666;
      margin-top: 2px;
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
  </style>
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
      <h2 class="section-title">Comparison</h2>
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
    
    ${materialChanges.length > 0 ? `
    <div class="section">
      <h2 class="section-title">Changes Since Last Saved</h2>
      ${materialChanges.map((c) => `
      <div class="changes-item">
        <p>
          <span class="changes-label">${c.scenarioName}:</span> 
          ${c.fieldLabel} 
          <span class="changes-values">${c.oldValue} → ${c.newValue}</span>
        </p>
        ${c.impact ? `<p class="changes-impact">${c.impact}</p>` : ""}
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

  // Open print dialog in new window
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    console.error("Could not open print window");
    return;
  }
  
  printWindow.document.write(html);
  printWindow.document.close();
  
  // Trigger print after content loads
  printWindow.onload = () => {
    printWindow.print();
  };
}
