/**
 * Scenario Export - Lender-Ready PDF Generation
 * 
 * Creates a formal, professional PDF suitable for:
 * - Attaching to lender emails
 * - Saving to loan files
 * - Printing for review
 * 
 * Visual rules:
 * - Grayscale only (no accent colors)
 * - Serif headers, sans-serif body
 * - No branding dominance
 * - No CTAs, links, or upsells
 */

import { formatCurrency, formatPercent, calculateDownPaymentAmount } from "@/lib/mortgage";
import type { ScenarioData } from "@/lib/scenarioContract";

/**
 * Generate and open print dialog for a single scenario PDF
 */
export function exportScenarioPDF(scenario: ScenarioData): void {
  const html = generateScenarioHTML(scenario);
  openPrintWindow(html);
}

/**
 * Generate HTML for single scenario export
 */
function generateScenarioHTML(scenario: ScenarioData): string {
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const { inputs, results, name } = scenario;
  const isPurchase = inputs.mode === "purchase";
  
  // Calculate property value and loan amount
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

  // Calculate payoff date
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
  <title>Mortgage Scenario Summary</title>
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
    
    /* Header */
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
    
    /* Sections */
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
    
    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
    }
    
    tr {
      border-bottom: 1px solid #f0f0f0;
    }
    
    tr:last-child {
      border-bottom: none;
    }
    
    td {
      padding: 10px 0;
      vertical-align: top;
    }
    
    td:first-child {
      color: #666;
      width: 55%;
    }
    
    td:last-child {
      text-align: right;
      font-family: "SF Mono", Monaco, "Courier New", monospace;
      font-size: 10pt;
      color: #1a1a1a;
    }
    
    .total-row td {
      padding-top: 14px;
      border-top: 1px solid #d0d0d0;
      font-weight: 500;
    }
    
    .total-row td:first-child {
      color: #333;
    }
    
    /* Notes section */
    .notes-list {
      list-style: none;
      padding: 0;
      color: #666;
      font-size: 10pt;
    }
    
    .notes-list li {
      padding-left: 16px;
      position: relative;
      margin-bottom: 6px;
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
      <h1 class="doc-title">Mortgage Scenario Summary</h1>
      <p class="meta">Generated ${dateStr}</p>
      ${name ? `<p class="meta">${name}</p>` : ""}
    </div>
    
    <!-- Section 1: Scenario Overview -->
    <div class="section">
      <h2 class="section-title">Scenario Overview</h2>
      <table>
        <tr>
          <td>Loan type</td>
          <td>${isPurchase ? "Purchase" : "Refinance"}</td>
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
        ` : ""}
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
    
    <!-- Section 2: Monthly Payment Breakdown -->
    <div class="section">
      <h2 class="section-title">Estimated Monthly Payment</h2>
      <table>
        <tr>
          <td>Principal & interest</td>
          <td>${formatCurrency(results.monthlyPrincipalInterest)}</td>
        </tr>
        ${results.monthlyPropertyTax > 0 ? `
        <tr>
          <td>Property tax (estimated)</td>
          <td>${formatCurrency(results.monthlyPropertyTax)}</td>
        </tr>
        ` : ""}
        ${results.monthlyHomeInsurance > 0 ? `
        <tr>
          <td>Home insurance (estimated)</td>
          <td>${formatCurrency(results.monthlyHomeInsurance)}</td>
        </tr>
        ` : ""}
        ${results.monthlyPMI > 0 ? `
        <tr>
          <td>PMI (estimated)</td>
          <td>${formatCurrency(results.monthlyPMI)}</td>
        </tr>
        ` : ""}
        ${results.monthlyHOA > 0 ? `
        <tr>
          <td>HOA dues</td>
          <td>${formatCurrency(results.monthlyHOA)}</td>
        </tr>
        ` : ""}
        <tr class="total-row">
          <td>Total estimated monthly payment</td>
          <td>${formatCurrency(results.monthlyTotal)}</td>
        </tr>
      </table>
    </div>
    
    <!-- Section 3: Long-Term Cost Summary -->
    <div class="section">
      <h2 class="section-title">Long-Term Cost Summary</h2>
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
        ${results.payoffMonths < inputs.shared.loanTerm * 12 ? `
        <tr>
          <td>Time to payoff</td>
          <td>${Math.floor(results.payoffMonths / 12)} years, ${results.payoffMonths % 12} months</td>
        </tr>
        ` : ""}
      </table>
    </div>
    
    <!-- Section 4: Assumptions & Notes -->
    <div class="section">
      <h2 class="section-title">Assumptions & Notes</h2>
      <ul class="notes-list">
        <li>All estimates are based on user-provided inputs and standard amortization formulas.</li>
        <li>Interest rate shown is an assumed rate and not a lender quote.</li>
        ${inputs.shared.usedZipEstimate ? `<li>Property tax and insurance figures are ZIP-based estimates and may vary by property.</li>` : ""}
        ${results.monthlyPMI > 0 ? `<li>PMI estimate assumes standard rates; actual PMI will depend on lender and loan program.</li>` : ""}
        <li>Final loan terms are subject to lender approval, credit evaluation, and property appraisal.</li>
        <li>This document is for comparison and planning purposes only.</li>
      </ul>
    </div>
    
    <!-- Footer -->
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
