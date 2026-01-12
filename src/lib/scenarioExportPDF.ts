/**
 * Single-Page PDF Export - Decision Artifact
 * 
 * This PDF is not a "report." It is a decision artifact.
 * 
 * Purpose (Locked):
 * - Advisor-safe
 * - Lender-safe
 * - Investor-safe
 * - Printable
 * - Non-persuasive
 * - Free of consumer marketing language
 * 
 * This document should feel appropriate to attach to:
 * - An email to a lender
 * - An advisor review
 * - An internal memo
 * - A loan file
 */

export interface ScenarioData {
  id: string;
  name: string;
  type: "purchase" | "refinance";
  inputs: {
    downPaymentPercent?: number;
    hasPMI?: boolean;
    loanAmount: number;
    interestRate: number;
    loanTermYears: number;
    propertyTaxRate?: number;
    insuranceAnnual?: number;
  };
  derived: {
    monthlyPayment: number;
    totalInterest: number;
    cashAtClose: number;
    principalMajorityYear: number;
    totalCostOfCapital: number;
  };
}

export interface ComparisonExportData {
  generatedAt: Date;
  scenarioA: ScenarioData;
  scenarioB: ScenarioData;
}

/**
 * Format currency for display
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format percentage for display
 */
function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

/**
 * Generate short hash for scenario ID
 */
function generateShortHash(id: string): string {
  return id.substring(0, 8).toUpperCase();
}

/**
 * Format date for header
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Current methodology version for watermarking
 */
const METHODOLOGY_VERSION = "v1.0";

/**
 * Generate HTML content for PDF export
 * Mirrors homepage aesthetic. Review-grade. Shareable.
 * 
 * Watermark Design Rules (Locked):
 * - Footer only, never across content
 * - Never diagonal, never opaque
 * - Font: same as body, smaller
 * - Color: neutral gray (≈60% opacity)
 * - No logos, no icons
 */
export function generatePDFContent(data: ComparisonExportData): string {
  const { scenarioA, scenarioB, generatedAt } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mortgage Scenario Analysis - SettleRate</title>
  <style>
    /* Page Setup - US Letter (8.5 × 11) */
    @page {
      size: letter;
      margin: 0.75in;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 10pt;
      line-height: 1.5;
      color: #1C1C1E;
      background: #FAFAF8;
    }

    .container {
      max-width: 100%;
    }

    /* Typography */
    .serif {
      font-family: Georgia, "Times New Roman", serif;
    }

    .text-muted {
      color: #5A5A5F;
    }

    .text-light {
      color: #8A8A8F;
    }

    .text-xs {
      font-size: 8pt;
    }

    .text-sm {
      font-size: 9pt;
    }

    .text-lg {
      font-size: 12pt;
    }

    .font-medium {
      font-weight: 500;
    }

    .uppercase {
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    /* Layout */
    .flex {
      display: flex;
    }

    .justify-between {
      justify-content: space-between;
    }

    .items-baseline {
      align-items: baseline;
    }

    .gap-4 {
      gap: 16px;
    }

    .mt-4 {
      margin-top: 16px;
    }

    .mt-6 {
      margin-top: 24px;
    }

    .mt-8 {
      margin-top: 32px;
    }

    .mb-2 {
      margin-bottom: 8px;
    }

    .mb-4 {
      margin-bottom: 16px;
    }

    .py-2 {
      padding-top: 8px;
      padding-bottom: 8px;
    }

    .py-3 {
      padding-top: 12px;
      padding-bottom: 12px;
    }

    .px-4 {
      padding-left: 16px;
      padding-right: 16px;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    }

    .header-left h1 {
      font-size: 14pt;
      font-weight: 500;
      margin-bottom: 2px;
    }

    .header-left p {
      font-size: 9pt;
      color: #5A5A5F;
    }

    .header-right {
      text-align: right;
      font-size: 8pt;
      color: #8A8A8F;
    }

    /* Section */
    .section {
      margin-top: 24px;
    }

    .section-title {
      font-size: 8pt;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #5A5A5F;
      margin-bottom: 12px;
    }

    /* Scenario Context - Two Column */
    .scenario-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    .scenario-card {
      padding: 12px 16px;
      background: #F3F3EF;
      border-radius: 4px;
    }

    .scenario-name {
      font-family: Georgia, serif;
      font-size: 11pt;
      font-weight: 500;
      margin-bottom: 8px;
    }

    .scenario-detail {
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      color: #5A5A5F;
      padding: 4px 0;
    }

    /* Assumptions List */
    .assumptions-list {
      list-style: none;
      padding: 0;
    }

    .assumptions-list li {
      font-size: 9pt;
      color: #5A5A5F;
      padding: 4px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .assumptions-list li::before {
      content: "";
      width: 4px;
      height: 4px;
      background: #C0C0C0;
      border-radius: 50%;
    }

    /* Outcomes Table */
    .outcomes-table {
      width: 100%;
      border-collapse: collapse;
    }

    .outcomes-table th,
    .outcomes-table td {
      padding: 10px 0;
      text-align: left;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    }

    .outcomes-table th {
      font-size: 9pt;
      font-weight: 500;
      color: #5A5A5F;
    }

    .outcomes-table th:not(:first-child),
    .outcomes-table td:not(:first-child) {
      text-align: right;
      font-family: "SF Mono", Monaco, monospace;
      font-size: 10pt;
    }

    .outcomes-table td:first-child {
      color: #5A5A5F;
      font-size: 9pt;
    }

    .outcomes-table tbody tr:last-child td {
      border-bottom: none;
      font-weight: 500;
    }

    /* Interpretation Box */
    .interpretation-box {
      margin-top: 24px;
      padding: 12px 16px;
      background: #ECECE6;
      border-radius: 4px;
      border-left: 3px solid rgba(0, 0, 0, 0.15);
    }

    .interpretation-box h4 {
      font-size: 8pt;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #5A5A5F;
      margin-bottom: 6px;
    }

    .interpretation-box p {
      font-size: 8pt;
      color: #5A5A5F;
      line-height: 1.6;
    }

    /* Footer Watermark - Lender-Safe */
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid rgba(0, 0, 0, 0.08);
    }

    .footer-watermark {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 12px;
    }

    .footer-left {
      font-size: 8pt;
      color: rgba(90, 90, 95, 0.6);
    }

    .footer-left .primary {
      margin-bottom: 2px;
    }

    .footer-left .secondary {
      font-size: 7pt;
    }

    .footer-right {
      text-align: right;
      font-size: 7pt;
      color: rgba(90, 90, 95, 0.6);
    }

    .footer-disclosure {
      font-size: 7pt;
      color: rgba(90, 90, 95, 0.6);
      text-align: center;
      padding-top: 8px;
      border-top: 1px solid rgba(0, 0, 0, 0.04);
    }

    /* Print Styles */
    @media print {
      body {
        background: white;
      }

      .container {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header class="header">
      <div class="header-left">
        <h1 class="serif">SettleRate</h1>
        <p>Independent mortgage scenario analysis</p>
      </div>
      <div class="header-right">
        <div>Generated on: ${formatDate(generatedAt)}</div>
        <div>Scenario ID: ${generateShortHash(scenarioA.id)}-${generateShortHash(scenarioB.id)}</div>
      </div>
    </header>

    <!-- Scenario Context -->
    <section class="section">
      <h2 class="section-title">Scenario Overview</h2>
      <div class="scenario-grid">
        <div class="scenario-card">
          <div class="scenario-name">${scenarioA.name}</div>
          <div class="scenario-detail">
            <span>Down Payment</span>
            <span>${scenarioA.inputs.downPaymentPercent ? formatPercent(scenarioA.inputs.downPaymentPercent) : "N/A"}</span>
          </div>
          <div class="scenario-detail">
            <span>PMI</span>
            <span>${scenarioA.inputs.hasPMI ? "Yes" : "No"}</span>
          </div>
          <div class="scenario-detail">
            <span>Term</span>
            <span>${scenarioA.inputs.loanTermYears} Years</span>
          </div>
          <div class="scenario-detail">
            <span>Rate</span>
            <span>${formatPercent(scenarioA.inputs.interestRate)}</span>
          </div>
        </div>
        <div class="scenario-card">
          <div class="scenario-name">${scenarioB.name}</div>
          <div class="scenario-detail">
            <span>Down Payment</span>
            <span>${scenarioB.inputs.downPaymentPercent ? formatPercent(scenarioB.inputs.downPaymentPercent) : "N/A"}</span>
          </div>
          <div class="scenario-detail">
            <span>PMI</span>
            <span>${scenarioB.inputs.hasPMI ? "Yes" : "No"}</span>
          </div>
          <div class="scenario-detail">
            <span>Term</span>
            <span>${scenarioB.inputs.loanTermYears} Years</span>
          </div>
          <div class="scenario-detail">
            <span>Rate</span>
            <span>${formatPercent(scenarioB.inputs.interestRate)}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Normalized Assumptions -->
    <section class="section">
      <h2 class="section-title">Assumptions Applied</h2>
      <ul class="assumptions-list">
        <li>Property taxes standardized</li>
        <li>Insurance standardized</li>
        <li>Rate environment normalized</li>
        <li>PMI treatment applied consistently</li>
      </ul>
    </section>

    <!-- Modeled Outcomes -->
    <section class="section">
      <h2 class="section-title">Modeled Outcomes</h2>
      <table class="outcomes-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>${scenarioA.name}</th>
            <th>${scenarioB.name}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Monthly Payment</td>
            <td>${formatCurrency(scenarioA.derived.monthlyPayment)}</td>
            <td>${formatCurrency(scenarioB.derived.monthlyPayment)}</td>
          </tr>
          <tr>
            <td>Total Interest Paid</td>
            <td>${formatCurrency(scenarioA.derived.totalInterest)}</td>
            <td>${formatCurrency(scenarioB.derived.totalInterest)}</td>
          </tr>
          <tr>
            <td>Cash Required at Close</td>
            <td>${formatCurrency(scenarioA.derived.cashAtClose)}</td>
            <td>${formatCurrency(scenarioB.derived.cashAtClose)}</td>
          </tr>
          <tr>
            <td>Year Principal Exceeds Interest</td>
            <td>Year ${scenarioA.derived.principalMajorityYear}</td>
            <td>Year ${scenarioB.derived.principalMajorityYear}</td>
          </tr>
          <tr>
            <td>Total Cost of Capital</td>
            <td>${formatCurrency(scenarioA.derived.totalCostOfCapital)}</td>
            <td>${formatCurrency(scenarioB.derived.totalCostOfCapital)}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Interpretation Boundary -->
    <div class="interpretation-box">
      <h4>Interpretation Note</h4>
      <p>
        This document presents modeled outcomes under standardized assumptions. 
        It does not constitute a recommendation, offer, or guarantee.
      </p>
    </div>

    <!-- Footer Watermark - Lender-Safe -->
    <footer class="footer">
      <div class="footer-watermark">
        <div class="footer-left">
          <div class="primary">Generated by SettleRate — Independent mortgage scenario analysis</div>
          <div class="secondary">Illustrative outputs based on stated assumptions</div>
        </div>
        <div class="footer-right">
          <div>${formatDate(generatedAt)}</div>
          <div>ID: ${generateShortHash(scenarioA.id)}-${generateShortHash(scenarioB.id)}</div>
          <div>Methodology ${METHODOLOGY_VERSION}</div>
        </div>
      </div>
      <div class="footer-disclosure">
        SettleRate provides analytical modeling only and does not originate, broker, or recommend mortgage products.
      </div>
    </footer>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Open print dialog for PDF export
 * Uses browser's native print functionality for highest fidelity
 */
export function exportToPDF(data: ComparisonExportData): void {
  const htmlContent = generatePDFContent(data);
  
  // Create a new window for printing
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    console.error("Unable to open print window. Please check popup blocker settings.");
    return;
  }

  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Wait for content to load, then trigger print
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}

/**
 * Download as HTML file (alternative to print)
 */
export function downloadAsHTML(data: ComparisonExportData): void {
  const htmlContent = generatePDFContent(data);
  const blob = new Blob([htmlContent], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = `settlerate-analysis-${new Date().toISOString().split("T")[0]}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
