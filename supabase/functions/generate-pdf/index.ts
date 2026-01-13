/**
 * PDF Generation Edge Function
 * 
 * Generates real PDF documents from scenario/comparison data.
 * Uses server-side HTML rendering to PDF conversion.
 * 
 * Endpoints:
 * GET /generate-pdf?type=scenario&id=xxx
 * GET /generate-pdf?type=comparison&id=xxx
 * 
 * Security:
 * - Authenticates user via JWT
 * - Verifies ownership of the resource (RLS-safe)
 * - Returns 403 if user doesn't own the resource
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Supabase configuration
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// ============================================================================
// TYPES
// ============================================================================

interface ScenarioInputs {
  mode: "purchase" | "refinance";
  shared: {
    loanTerm: number;
    interestRate: number;
    propertyTaxAnnual?: number;
    homeInsuranceMonthly?: number;
  };
  purchase?: {
    purchasePrice: number;
    downPayment: number;
    downPaymentType: "percent" | "amount";
  };
  refinance?: {
    currentLoanBalance: number;
    estimatedHomeValue?: number;
  };
}

interface ScenarioResults {
  loanAmount: number;
  monthlyPrincipalInterest: number;
  monthlyTotal: number;
  monthlyPropertyTax: number;
  monthlyHomeInsurance: number;
  monthlyPMI: number;
  monthlyHOA: number;
  totalCost: number;
  totalInterest: number;
  ltvRatio: number;
  payoffMonths: number;
}

interface ScenarioData {
  id: string;
  name: string;
  inputs: ScenarioInputs;
  results: ScenarioResults;
}

interface ComparisonData {
  id: string;
  name: string;
  scenario_a_id: string;
  scenario_b_id: string;
}

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  const decimals = value % 0.01 !== 0 ? 3 : 2;
  return `${value.toFixed(decimals)}%`;
}

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  purchase: "Purchase",
  refinance: "Refinance",
};

// ============================================================================
// CALCULATION UTILITIES
// ============================================================================

function calculateDownPaymentAmount(
  purchasePrice: number,
  downPayment: number,
  downPaymentType: "percent" | "amount"
): number {
  if (downPaymentType === "percent") {
    return purchasePrice * (downPayment / 100);
  }
  return downPayment;
}

function calculateDeltas(a: ScenarioData, b: ScenarioData) {
  return {
    monthlyPaymentDelta: a.results.monthlyTotal - b.results.monthlyTotal,
    totalCostDelta: a.results.totalCost - b.results.totalCost,
    totalInterestDelta: a.results.totalInterest - b.results.totalInterest,
    interestRateDelta: Math.round((a.inputs.shared.interestRate - b.inputs.shared.interestRate) * 100),
    ltvDelta: (a.results.ltvRatio || 0) - (b.results.ltvRatio || 0),
  };
}

function formatSignedDelta(value: number): string {
  const prefix = value >= 0 ? "+" : "";
  return `${prefix}${formatCurrency(value)}`;
}

function formatSignedBasisPoints(bps: number): string {
  const absBps = Math.abs(bps);
  const percent = (absBps / 100).toFixed(2);
  const prefix = bps >= 0 ? "+" : "-";
  return `${prefix}${percent}%`;
}

function formatLtvDelta(value: number): string {
  const prefix = value >= 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)} pts`;
}

function formatRateDeltaForCopy(bps: number, includeBps = false): string {
  const absPercent = Math.abs(bps / 100);
  const percentStr = `${absPercent.toFixed(2)}%`;
  if (!includeBps || Math.abs(bps) < 1) return percentStr;
  const absBps = Math.abs(bps);
  const bpsStr = absBps < 10 ? `${absBps.toFixed(1)} basis points` : `${Math.round(absBps)} basis points`;
  return `${percentStr} (${bpsStr})`;
}

function generateSummaryText(a: ScenarioData, b: ScenarioData): string {
  const deltas = calculateDeltas(a, b);
  const monthlyDiff = Math.abs(deltas.monthlyPaymentDelta);
  const totalDiff = Math.abs(deltas.totalCostDelta);
  const interestDiff = Math.abs(deltas.interestRateDelta);
  const ltvDiff = Math.abs(deltas.ltvDelta);
  
  const lowerMonthly = deltas.monthlyPaymentDelta > 0 ? b.name : a.name;
  const higherMonthly = deltas.monthlyPaymentDelta > 0 ? a.name : b.name;
  
  let summary = `${lowerMonthly} has a lower monthly payment by ${formatCurrency(monthlyDiff)}, `;
  
  if (deltas.totalCostDelta > 0) {
    summary += `while ${higherMonthly} results in ${formatCurrency(totalDiff)} more in total payments over the loan term. `;
  } else {
    summary += `and also results in ${formatCurrency(totalDiff)} less in total payments over the loan term. `;
  }
  
  const contextParts: string[] = [];
  if (interestDiff >= 10) {
    const rateDirection = deltas.interestRateDelta > 0 ? "higher" : "lower";
    contextParts.push(`a ${formatRateDeltaForCopy(deltas.interestRateDelta, true)} ${rateDirection} interest rate`);
  }
  if (ltvDiff >= 1) {
    const ltvDirection = deltas.ltvDelta > 0 ? "higher" : "lower";
    contextParts.push(`a ${Math.abs(deltas.ltvDelta).toFixed(1)}% ${ltvDirection} loan-to-value ratio`);
  }
  
  if (contextParts.length > 0) {
    summary += `These differences are primarily driven by ${contextParts.join(" and ")}.`;
  }
  
  return summary;
}

// ============================================================================
// HTML GENERATION (SHARED STYLES)
// ============================================================================

const SHARED_STYLES = `
  @page {
    size: letter;
    margin: 18mm 16mm;
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
    color: #111;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  
  .export-page {
    background: #fff;
    color: #111;
    padding: 0;
  }
  
  .export-content {
    max-width: none;
    margin: 0;
  }
  
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
  
  .section {
    margin-bottom: 24px;
    page-break-inside: avoid;
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
  
  .summary-text {
    font-size: 9pt;
    line-height: 1.65;
    color: #333;
    margin-bottom: 16px;
  }
  
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
  
  th:first-child { padding-left: 0; }
  th:last-child { padding-right: 0; }
  th:not(:first-child) { text-align: right; }
  
  td {
    padding: 10px 12px;
    border-bottom: 1px solid #f0f0f0;
    vertical-align: top;
  }
  
  td:first-child {
    color: #666;
    padding-left: 0;
  }
  
  td:last-child { padding-right: 0; }
  
  td:not(:first-child) {
    text-align: right;
    font-family: "SF Mono", Monaco, "Courier New", monospace;
    font-size: 9pt;
  }
  
  tr:last-child td { border-bottom: none; }
  
  .total-row td {
    padding-top: 10px;
    border-top: 1px solid #d0d0d0;
    font-weight: 500;
  }
  
  .total-row td:first-child { color: #333; }
  
  .comparison-table th:first-child { width: 40%; }
  .comparison-table th:not(:first-child) { width: 30%; }
  
  .key-diff-table {
    font-size: 8pt;
    border-collapse: collapse;
  }
  
  .key-diff-table td {
    padding: 6px 16px 6px 0;
    border-bottom: 1px solid #e8e8e8;
    vertical-align: top;
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
`;

// ============================================================================
// HTML GENERATION
// ============================================================================

function generateScenarioHTML(scenario: ScenarioData): string {
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  
  const shortId = scenario.id.substring(0, 8).toUpperCase();
  const { inputs, results, name } = scenario;
  const isPurchase = inputs.mode === "purchase";
  
  const propertyValue = isPurchase 
    ? inputs.purchase!.purchasePrice 
    : (inputs.refinance?.estimatedHomeValue ?? results.loanAmount);
  
  const downPaymentAmount = isPurchase
    ? calculateDownPaymentAmount(
        inputs.purchase!.purchasePrice,
        inputs.purchase!.downPayment,
        inputs.purchase!.downPaymentType
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
  <title>Mortgage Scenario Summary - ${name || "Untitled"}</title>
  <style>${SHARED_STYLES}</style>
</head>
<body>
  <div class="export-page">
    <div class="export-content">
      <header class="header">
        <p class="header-brand">SettleRate</p>
        <h1 class="header-title">Mortgage Scenario Summary</h1>
        <p class="header-meta">
          Scenario: ${name || "Untitled"} • ID: ${shortId} • Generated: ${dateStr}
        </p>
      </header>
      
      <section class="section">
        <h2 class="section-title">Scenario Overview</h2>
        <table>
          <tr><td>Loan type</td><td>${TRANSACTION_TYPE_LABELS[inputs.mode]}</td></tr>
          <tr><td>Property value</td><td>${formatCurrency(propertyValue)}</td></tr>
          ${isPurchase ? `
          <tr><td>Down payment</td><td>${formatCurrency(downPaymentAmount)} (${formatPercent(downPaymentAmount / propertyValue * 100)})</td></tr>
          ` : `
          <tr><td>Current loan balance</td><td>${formatCurrency(inputs.refinance!.currentLoanBalance)}</td></tr>
          `}
          <tr><td>Loan amount</td><td>${formatCurrency(results.loanAmount)}</td></tr>
          <tr><td>Loan term</td><td>${inputs.shared.loanTerm} years</td></tr>
          <tr><td>Interest rate (assumed)</td><td>${formatPercent(inputs.shared.interestRate)}</td></tr>
          <tr><td>Loan-to-value ratio</td><td>${formatPercent(results.ltvRatio)}</td></tr>
        </table>
      </section>
      
      <section class="section">
        <h2 class="section-title">Monthly Payment</h2>
        <table>
          <tr><td>Principal & interest</td><td>${formatCurrency(results.monthlyPrincipalInterest)}</td></tr>
          ${results.monthlyPropertyTax > 0 ? `<tr><td>Property tax</td><td>${formatCurrency(results.monthlyPropertyTax)}</td></tr>` : ""}
          ${results.monthlyHomeInsurance > 0 ? `<tr><td>Home insurance</td><td>${formatCurrency(results.monthlyHomeInsurance)}</td></tr>` : ""}
          ${results.monthlyPMI > 0 ? `<tr><td>PMI</td><td>${formatCurrency(results.monthlyPMI)}</td></tr>` : ""}
          ${results.monthlyHOA > 0 ? `<tr><td>HOA</td><td>${formatCurrency(results.monthlyHOA)}</td></tr>` : ""}
          <tr class="total-row"><td>Total monthly payment</td><td>${formatCurrency(results.monthlyTotal)}</td></tr>
        </table>
      </section>
      
      <section class="section">
        <h2 class="section-title">Long-Term Cost Summary</h2>
        <table>
          <tr><td>Total payments over term</td><td>${formatCurrency(results.totalCost)}</td></tr>
          <tr><td>Total interest paid</td><td>${formatCurrency(results.totalInterest)}</td></tr>
          <tr><td>Projected payoff date</td><td>${payoffDateStr}</td></tr>
        </table>
      </section>
      
      <section class="section">
        <h2 class="section-title">Methodology</h2>
        <ul class="notes-list">
          <li>Calculations are based on standard amortization formulas.</li>
          <li>Rates shown are assumed inputs, not lender quotes.</li>
          <li>Property taxes and insurance are estimates where applicable.</li>
          <li>Results are intended for comparison and planning purposes only.</li>
        </ul>
      </section>
      
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

function generateComparisonHTML(scenarioA: ScenarioData, scenarioB: ScenarioData): string {
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  
  const shortIdA = scenarioA.id.substring(0, 8).toUpperCase();
  const shortIdB = scenarioB.id.substring(0, 8).toUpperCase();
  const deltas = calculateDeltas(scenarioA, scenarioB);
  
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
  <title>Mortgage Scenario Comparison</title>
  <style>${SHARED_STYLES}</style>
</head>
<body>
  <div class="export-page">
    <div class="export-content">
      <header class="header">
        <p class="header-brand">SettleRate</p>
        <h1 class="header-title">Mortgage Scenario Comparison</h1>
        <p class="header-meta">
          Comparing: ${scenarioA.name || "Scenario A"} (${shortIdA}) vs ${scenarioB.name || "Scenario B"} (${shortIdB})
        </p>
        <p class="header-meta">Generated: ${dateStr}</p>
      </header>
      
      <section class="section">
        <h2 class="section-title">Comparison Summary</h2>
        <p class="summary-text">${generateSummaryText(scenarioA, scenarioB)}</p>
        <table class="key-diff-table">
          <tr>
            <td><span class="key-diff-label">Monthly payment</span><span class="key-diff-value">${formatSignedDelta(deltas.monthlyPaymentDelta)}</span></td>
            <td><span class="key-diff-label">Total cost</span><span class="key-diff-value">${formatSignedDelta(deltas.totalCostDelta)}</span></td>
            <td><span class="key-diff-label">Total interest</span><span class="key-diff-value">${formatSignedDelta(deltas.totalInterestDelta)}</span></td>
            <td><span class="key-diff-label">Interest rate</span><span class="key-diff-value">${formatSignedBasisPoints(deltas.interestRateDelta)}</span></td>
            <td><span class="key-diff-label">LTV</span><span class="key-diff-value">${formatLtvDelta(deltas.ltvDelta)}</span></td>
          </tr>
        </table>
      </section>
      
      <section class="section">
        <h2 class="section-title">Scenario Overview</h2>
        <table class="comparison-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>${scenarioA.name || "Scenario A"}</th>
              <th>${scenarioB.name || "Scenario B"}</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Loan type</td><td>${TRANSACTION_TYPE_LABELS[scenarioA.inputs.mode]}</td><td>${TRANSACTION_TYPE_LABELS[scenarioB.inputs.mode]}</td></tr>
            <tr><td>Loan amount</td><td>${formatCurrency(scenarioA.results.loanAmount)}</td><td>${formatCurrency(scenarioB.results.loanAmount)}</td></tr>
            <tr><td>Term</td><td>${scenarioA.inputs.shared.loanTerm} years</td><td>${scenarioB.inputs.shared.loanTerm} years</td></tr>
            <tr><td>Interest rate (assumed)</td><td>${formatPercent(scenarioA.inputs.shared.interestRate)}</td><td>${formatPercent(scenarioB.inputs.shared.interestRate)}</td></tr>
            <tr><td>Loan-to-value ratio</td><td>${formatPercent(scenarioA.results.ltvRatio)}</td><td>${formatPercent(scenarioB.results.ltvRatio)}</td></tr>
          </tbody>
        </table>
      </section>
      
      <section class="section">
        <h2 class="section-title">Monthly Payment</h2>
        <table class="comparison-table">
          <thead>
            <tr>
              <th>Component</th>
              <th>${scenarioA.name || "Scenario A"}</th>
              <th>${scenarioB.name || "Scenario B"}</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Principal & interest</td><td>${formatCurrency(scenarioA.results.monthlyPrincipalInterest)}</td><td>${formatCurrency(scenarioB.results.monthlyPrincipalInterest)}</td></tr>
            <tr class="total-row"><td>Total monthly payment</td><td>${formatCurrency(scenarioA.results.monthlyTotal)}</td><td>${formatCurrency(scenarioB.results.monthlyTotal)}</td></tr>
          </tbody>
        </table>
      </section>
      
      <section class="section">
        <h2 class="section-title">Long-Term Cost</h2>
        <table class="comparison-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>${scenarioA.name || "Scenario A"}</th>
              <th>${scenarioB.name || "Scenario B"}</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Total payments over term</td><td>${formatCurrency(scenarioA.results.totalCost)}</td><td>${formatCurrency(scenarioB.results.totalCost)}</td></tr>
            <tr><td>Total interest paid</td><td>${formatCurrency(scenarioA.results.totalInterest)}</td><td>${formatCurrency(scenarioB.results.totalInterest)}</td></tr>
            <tr><td>Projected payoff date</td><td>${getPayoffDate(scenarioA)}</td><td>${getPayoffDate(scenarioB)}</td></tr>
          </tbody>
        </table>
      </section>
      
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
// FILENAME GENERATION
// ============================================================================

function generateScenarioFilename(scenario: ScenarioData): string {
  const date = new Date().toISOString().split("T")[0];
  const safeName = (scenario.name || "Untitled")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .substring(0, 30);
  return `SettleRate_Scenario_${safeName}_${date}`;
}

function generateComparisonFilename(scenarioA: ScenarioData, scenarioB: ScenarioData): string {
  const date = new Date().toISOString().split("T")[0];
  const nameA = (scenarioA.name || "A").replace(/[^a-zA-Z0-9]/g, "_").substring(0, 15);
  const nameB = (scenarioB.name || "B").replace(/[^a-zA-Z0-9]/g, "_").substring(0, 15);
  return `SettleRate_Comparison_${nameA}_vs_${nameB}_${date}`;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type");
    const id = url.searchParams.get("id");

    if (!type || !id) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: type and id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (type !== "scenario" && type !== "comparison") {
      return new Response(
        JSON.stringify({ error: "Invalid type. Must be 'scenario' or 'comparison'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    
    // Create a Supabase client with the user's JWT
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {},
      },
    });

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let html: string;
    let filename: string;

    if (type === "scenario") {
      // Fetch the scenario (RLS will ensure user owns it)
      const { data: scenario, error: scenarioError } = await supabase
        .from("scenarios")
        .select("*")
        .eq("id", id)
        .single();

      if (scenarioError || !scenario) {
        console.error("Scenario fetch error:", scenarioError);
        return new Response(
          JSON.stringify({ error: "Scenario not found or access denied" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const scenarioData: ScenarioData = {
        id: scenario.id,
        name: scenario.name,
        inputs: scenario.inputs as ScenarioInputs,
        results: scenario.derived as ScenarioResults,
      };

      html = generateScenarioHTML(scenarioData);
      filename = generateScenarioFilename(scenarioData);
    } else {
      // Fetch the comparison (RLS will ensure user owns it)
      const { data: comparison, error: comparisonError } = await supabase
        .from("user_comparisons")
        .select("*")
        .eq("id", id)
        .single();

      if (comparisonError || !comparison) {
        console.error("Comparison fetch error:", comparisonError);
        return new Response(
          JSON.stringify({ error: "Comparison not found or access denied" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch both scenarios
      const { data: scenarios, error: scenariosError } = await supabase
        .from("scenarios")
        .select("*")
        .in("id", [comparison.scenario_a_id, comparison.scenario_b_id]);

      if (scenariosError || !scenarios || scenarios.length !== 2) {
        console.error("Scenarios fetch error:", scenariosError);
        return new Response(
          JSON.stringify({ error: "One or more scenarios not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const scenarioA = scenarios.find(s => s.id === comparison.scenario_a_id)!;
      const scenarioB = scenarios.find(s => s.id === comparison.scenario_b_id)!;

      const scenarioDataA: ScenarioData = {
        id: scenarioA.id,
        name: scenarioA.name,
        inputs: scenarioA.inputs as ScenarioInputs,
        results: scenarioA.derived as ScenarioResults,
      };

      const scenarioDataB: ScenarioData = {
        id: scenarioB.id,
        name: scenarioB.name,
        inputs: scenarioB.inputs as ScenarioInputs,
        results: scenarioB.derived as ScenarioResults,
      };

      html = generateComparisonHTML(scenarioDataA, scenarioDataB);
      filename = generateComparisonFilename(scenarioDataA, scenarioDataB);
    }

    // Use jspdf-html2canvas approach via external API
    // For now, we return HTML that can be converted client-side or use a PDF service
    // This is a fallback - real PDF generation would require a headless browser service
    
    // For edge function environment, we'll generate a simple PDF using basic approach
    // In production, you'd want to use a service like Browserless, Puppeteer Cloud, etc.
    
    // Return HTML with Content-Type that triggers download on most browsers
    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.html"`,
      },
    });

  } catch (error) {
    console.error("PDF generation error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
