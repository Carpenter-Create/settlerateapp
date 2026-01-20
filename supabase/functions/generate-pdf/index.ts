/**
 * PDF Generation Edge Function - CANONICAL LAYOUT
 * 
 * Generates real PDF documents using the same layout structure
 * as the client-side print HTML. Both use matching:
 * - Typography (brand serif for headings, system font for body)
 * - Spacing (consistent margins, section gaps, table padding)
 * - Content structure (same sections, same data order)
 * 
 * Supports 2 or 3 scenario comparisons.
 * 
 * Endpoints:
 * GET /generate-pdf?type=scenario&id=xxx
 * GET /generate-pdf?type=comparison&id=xxx
 * 
 * Returns:
 * - Content-Type: application/pdf
 * - Content-Disposition: attachment; filename="..."
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Supabase configuration
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

// ============================================================================
// BRAND CONSTANTS - Matches exportLayout.ts
// ============================================================================

const BRAND = {
  name: "SettleRate",
  domain: "settlerate.com",
  colors: {
    text: [30, 30, 30] as const,
    textMuted: [100, 100, 100] as const,
    textLight: [130, 130, 130] as const,
    border: [200, 200, 200] as const,
    borderLight: [230, 230, 230] as const,
  },
  // PDF margins/spacing - matches canonical layout
  margins: {
    page: 50, // ~18mm
    section: 28,
    tableRow: 14,
    headerGap: 24,
  },
  fontSize: {
    brand: 10,
    title: 18,
    sectionTitle: 11,
    body: 9,
    small: 8,
    footer: 7,
  },
} as const;

// ============================================================================
// TYPES
// ============================================================================

type ScenarioType = "purchase" | "refinance" | "heloc" | "assumption";

interface ScenarioInputs {
  mode: ScenarioType;
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
  heloc?: {
    creditLimit: number;
    currentBalance: number;
    apr: number;
    drawMonths: number;
    repayMonths: number;
  };
  assumption?: {
    purchasePrice: number;
    downPaymentCash: number;
    assumed: {
      balance: number;
      apr: number;
      remainingMonths: number;
    };
    gap: {
      method: "cash" | "second_loan" | "heloc";
    };
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
  // HELOC-specific
  paymentDrawAvg?: number;
  paymentRepay?: number;
  // Assumption-specific
  assumedPaymentPi?: number;
  gapPayment?: number;
  gapAmount?: number;
}

interface ScenarioData {
  id: string;
  name: string;
  inputs: ScenarioInputs;
  results: ScenarioResults;
}

interface LayoutRow {
  label: string;
  value: string;
  value2?: string;
  value3?: string;
}

interface KeyDiffGroup {
  label: string;
  items: { label: string; value: string }[];
}

interface LayoutSection {
  title: string;
  type: "table" | "comparison-table" | "key-diff" | "key-diff-groups" | "text";
  rows?: LayoutRow[];
  columns?: string[];
  text?: string;
  items?: { label: string; value: string }[];
  groups?: KeyDiffGroup[];
}

interface ExportLayout {
  brand: string;
  title: string;
  meta: string[];
  generatedDate: string;
  sections: LayoutSection[];
  methodology: string[];
  disclaimer: string;
}

// ============================================================================
// FORMATTING UTILITIES - Matches client-side
// ============================================================================

function formatCurrency(value: number | undefined | null): string {
  if (value == null || isNaN(value)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number | undefined | null): string {
  if (value == null || isNaN(value)) return "0%";
  const decimals = value % 0.01 !== 0 ? 3 : 2;
  return `${value.toFixed(decimals)}%`;
}

const TRANSACTION_TYPE_LABELS: Record<ScenarioType, string> = {
  purchase: "Purchase",
  refinance: "Refinance",
  heloc: "HELOC",
  assumption: "Assumption",
};

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
  const aMonthly = a.results.monthlyTotal || 0;
  const bMonthly = b.results.monthlyTotal || 0;
  const aTotalCost = a.results.totalCost || 0;
  const bTotalCost = b.results.totalCost || 0;
  const aTotalInterest = a.results.totalInterest || 0;
  const bTotalInterest = b.results.totalInterest || 0;
  
  return {
    // Dollar deltas (independent per metric)
    monthlyPaymentDelta: aMonthly - bMonthly,
    totalCostDelta: aTotalCost - bTotalCost,
    totalInterestDelta: aTotalInterest - bTotalInterest,
    interestRateDelta: Math.round(((a.inputs?.shared?.interestRate || 0) - (b.inputs?.shared?.interestRate || 0)) * 100),
    ltvDelta: (a.results.ltvRatio || 0) - (b.results.ltvRatio || 0),
    // Percentage deltas (computed independently - never reuse across categories)
    monthlyPaymentPercentDelta: bMonthly > 0 ? ((aMonthly - bMonthly) / bMonthly) * 100 : 0,
    totalCostPercentDelta: bTotalCost > 0 ? ((aTotalCost - bTotalCost) / bTotalCost) * 100 : 0,
    totalInterestPercentDelta: bTotalInterest > 0 ? ((aTotalInterest - bTotalInterest) / bTotalInterest) * 100 : 0,
  };
}

/**
 * Format delta percent with appropriate precision
 */
function formatDeltaPercent(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 5) return `${Math.round(absValue)}%`;
  return `${absValue.toFixed(1)}%`;
}

/**
 * Format dollar-first delta (dollars first, percentage second)
 * Example: "+$245/mo (+8.2%)"
 */
function formatDollarFirstDelta(dollarDelta: number, percentDelta: number, suffix = ""): string {
  const dollarSign = dollarDelta > 0 ? "+" : dollarDelta < 0 ? "-" : "";
  const percentSign = percentDelta > 0 ? "+" : "";
  const dollarStr = `${dollarSign}${formatCurrency(Math.abs(dollarDelta))}${suffix}`;
  const percentStr = `${percentSign}${formatDeltaPercent(percentDelta)}`;
  return `${dollarStr} (${percentStr})`;
}

/**
 * Format rate delta for plain-English display
 * Shows percentage with direction (e.g., "0.38% lower")
 */
function formatSignedRateDelta(bps: number): string {
  const absPercent = Math.abs(bps / 100);
  if (Math.abs(bps) < 1) return "Same";
  const direction = bps >= 0 ? "higher" : "lower";
  return `${absPercent.toFixed(2)}% ${direction}`;
}

/**
 * Format LTV delta for plain-English display
 * Uses full words instead of abbreviations
 */
function formatLtvDelta(value: number): string {
  if (Math.abs(value) < 0.1) return "Same";
  const direction = value >= 0 ? "higher" : "lower";
  return `About ${Math.abs(value).toFixed(0)}% ${direction}`;
}

/**
 * Determine lowest cost scenario with tie-breaker logic:
 * 1. Lowest Total Cost (primary)
 * 2. Lowest Total Interest (first tie-breaker)
 * 3. Lowest Monthly Payment (second tie-breaker)
 * 4. Lowest LTV (third tie-breaker)
 */
function determineLowestCost(scenarios: { name: string; data: ScenarioData }[]): { name: string; data: ScenarioData } {
  return [...scenarios].sort((a, b) => {
    const costA = a.data.results.totalCost ?? Infinity;
    const costB = b.data.results.totalCost ?? Infinity;
    if (costA !== costB) return costA - costB;
    
    // Tie-breaker 1: lower total interest
    const interestA = a.data.results.totalInterest ?? Infinity;
    const interestB = b.data.results.totalInterest ?? Infinity;
    if (interestA !== interestB) return interestA - interestB;
    
    // Tie-breaker 2: lower monthly payment
    const monthlyA = a.data.results.monthlyTotal ?? Infinity;
    const monthlyB = b.data.results.monthlyTotal ?? Infinity;
    if (monthlyA !== monthlyB) return monthlyA - monthlyB;
    
    // Tie-breaker 3: lower LTV
    const ltvA = a.data.results.ltvRatio ?? Infinity;
    const ltvB = b.data.results.ltvRatio ?? Infinity;
    return ltvA - ltvB;
  })[0];
}

/**
 * Check if a scenario is a HELOC (for risk disclosure)
 */
function isHelocScenario(scenario: ScenarioData): boolean {
  return scenario.inputs?.mode === "heloc";
}

/**
 * Check if a scenario is a Loan Assumption (for disclosure)
 */
function isAssumptionScenario(scenario: ScenarioData): boolean {
  return scenario.inputs?.mode === "assumption";
}

/**
 * Generate plain-English summary text for 2 scenarios (homeowner-friendly)
 */
function generateSummaryText(a: ScenarioData, b: ScenarioData): string {
  const scenarios = [
    { name: a.name || "Scenario A", data: a },
    { name: b.name || "Scenario B", data: b },
  ];
  
  const winner = determineLowestCost(scenarios);
  const other = scenarios.find(s => s.name !== winner.name)!;
  
  // Calculate percentage difference
  const winnerCost = winner.data.results.totalCost ?? 0;
  const otherCost = other.data.results.totalCost ?? 0;
  const costDiffPercent = winnerCost > 0 ? ((otherCost - winnerCost) / winnerCost) * 100 : 0;
  
  let summary = `Under these assumptions, ${winner.name} is the least expensive option overall. `;
  
  if (Math.abs(costDiffPercent) >= 0.5) {
    const monthlyDiffPercent = ((other.data.results.monthlyTotal - winner.data.results.monthlyTotal) / winner.data.results.monthlyTotal) * 100;
    
    if (Math.abs(monthlyDiffPercent) < 3 && Math.abs(costDiffPercent) >= 5) {
      summary += `Compared to ${other.name}, it results in meaningfully lower total costs over the life of the loan, even though the monthly payments may look similar at first. `;
    } else {
      summary += `Compared to ${other.name}, it results in about ${Math.abs(costDiffPercent).toFixed(0)}% lower total costs over the life of the loan. `;
    }
  }
  
  // Add driver explanation
  const winnerRate = winner.data.inputs?.shared?.interestRate ?? 0;
  const otherRate = other.data.inputs?.shared?.interestRate ?? 0;
  const rateDiff = (otherRate - winnerRate) * 100;
  
  if (Math.abs(rateDiff) >= 5) {
    summary += `This is driven primarily by a lower interest rate (about ${Math.abs(rateDiff / 100).toFixed(2)}% lower), which reduces long-term interest. `;
  }
  
  // HELOC variable-rate risk disclosure
  if (isHelocScenario(winner.data)) {
    summary += `Note: HELOC payments are typically lower early but may increase over time due to variable rates. `;
  } else if (isHelocScenario(other.data)) {
    summary += `One scenario involves a HELOC, which may have variable rates that change over time. `;
  }
  
  // Loan Assumption disclosure
  if (isAssumptionScenario(a) || isAssumptionScenario(b)) {
    summary += `Loan assumption scenarios combine the assumed loan with gap financing; total payments reflect both.`;
  }
  
  return summary.trim();
}

/**
 * Generate plain-English summary text for 3 scenarios (homeowner-friendly)
 */
function generateThreeWaySummaryText(a: ScenarioData, b: ScenarioData, c: ScenarioData): string {
  const scenarios = [
    { name: a.name || "Scenario A", data: a },
    { name: b.name || "Scenario B", data: b },
    { name: c.name || "Scenario C", data: c },
  ];
  
  const winner = determineLowestCost(scenarios);
  const others = scenarios.filter(s => s.name !== winner.name);
  
  let summary = `Under these assumptions, ${winner.name} is the least expensive option overall. `;
  
  // Calculate percentage differences for others
  const winnerCost = winner.data.results.totalCost ?? 0;
  const comparisons = others
    .filter(o => {
      const otherCost = o.data.results.totalCost ?? 0;
      const diff = winnerCost > 0 ? ((otherCost - winnerCost) / winnerCost) * 100 : 0;
      return Math.abs(diff) >= 3;
    })
    .map(o => {
      const diff = ((o.data.results.totalCost - winnerCost) / winnerCost) * 100;
      return `about ${Math.abs(diff).toFixed(0)}% lower than ${o.name}`;
    });
  
  if (comparisons.length > 0) {
    const comparisonText = comparisons.length === 1 
      ? comparisons[0]
      : `${comparisons[0]} and ${comparisons[1]}`;
    summary += `Its total cost over the life of the loan is ${comparisonText}. `;
  }
  
  // Add driver explanation
  const winnerRate = winner.data.inputs?.shared?.interestRate ?? 0;
  const avgOtherRate = others.reduce((sum, o) => sum + (o.data.inputs?.shared?.interestRate ?? 0), 0) / others.length;
  const rateDiff = (avgOtherRate - winnerRate) * 100;
  
  if (Math.abs(rateDiff) >= 5) {
    summary += `This is driven primarily by a lower interest rate (about ${Math.abs(rateDiff / 100).toFixed(2)}% lower), which reduces long-term interest. `;
  }
  
  // HELOC variable-rate risk disclosure
  const allScenarios = [a, b, c];
  const hasHelocScenario = allScenarios.some(s => isHelocScenario(s));
  
  if (hasHelocScenario) {
    if (isHelocScenario(winner.data)) {
      summary += `Note: HELOC payments are typically lower early but may increase over time due to variable rates. `;
    } else {
      summary += `One or more scenarios involve a HELOC, which may have variable rates that change over time. `;
    }
  }
  
  // Loan Assumption disclosure
  const hasAssumption = allScenarios.some(s => isAssumptionScenario(s));
  if (hasAssumption) {
    summary += `Loan assumption scenarios combine the assumed loan with gap financing; total payments reflect both.`;
  }
  
  return summary.trim();
}

// ============================================================================
// LAYOUT BUILDERS - Matches client-side exportLayout.ts
// ============================================================================

function buildScenarioLayout(scenario: ScenarioData): ExportLayout {
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  
  const shortId = scenario.id.substring(0, 8).toUpperCase();
  const { inputs, results, name } = scenario;
  const isPurchase = inputs.mode === "purchase";
  
  const propertyValue = isPurchase 
    ? inputs.purchase?.purchasePrice || 0
    : (inputs.refinance?.estimatedHomeValue ?? results.loanAmount);
  
  const downPaymentAmount = isPurchase && inputs.purchase
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

  const overviewRows: LayoutRow[] = [
    { label: "Loan type", value: TRANSACTION_TYPE_LABELS[inputs.mode] },
    { label: "Property value", value: formatCurrency(propertyValue) },
  ];
  
  if (isPurchase && inputs.purchase) {
    const dpPercent = propertyValue > 0 ? (downPaymentAmount / propertyValue * 100) : 0;
    overviewRows.push({
      label: "Down payment",
      value: `${formatCurrency(downPaymentAmount)} (${formatPercent(dpPercent)})`,
    });
  } else if (inputs.refinance) {
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

  const paymentRows: LayoutRow[] = [
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
    meta: [`Scenario: ${name || "Untitled"}`, `ID: ${shortId}`],
    generatedDate: dateStr,
    sections: [
      { title: "Scenario Overview", type: "table", rows: overviewRows },
      { title: "Monthly Payment", type: "table", rows: paymentRows },
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
        rows: isPurchase && inputs.purchase
          ? [
              { label: "Purchase price", value: formatCurrency(inputs.purchase.purchasePrice) },
              { label: "Property taxes (annual)", value: results.monthlyPropertyTax > 0 ? formatCurrency(results.monthlyPropertyTax * 12) : "Not specified" },
              { label: "Home insurance (annual)", value: results.monthlyHomeInsurance > 0 ? formatCurrency(results.monthlyHomeInsurance * 12) : "Not specified" },
            ]
          : [
              { label: "Estimated home value", value: inputs.refinance?.estimatedHomeValue ? formatCurrency(inputs.refinance.estimatedHomeValue) : "Not specified" },
              { label: "Property taxes (annual)", value: results.monthlyPropertyTax > 0 ? formatCurrency(results.monthlyPropertyTax * 12) : "Not specified" },
              { label: "Home insurance (annual)", value: results.monthlyHomeInsurance > 0 ? formatCurrency(results.monthlyHomeInsurance * 12) : "Not specified" },
            ],
      },
    ],
    methodology: [
      "Calculations are based on standard amortization formulas.",
      "Rates shown are inputs provided by the user or advisor and are not lender quotes.",
      "Property taxes and insurance are estimates where applicable.",
      "Results are intended for comparison and planning purposes only.",
      "Summary reflects modeled totals under stated assumptions. Not financial advice.",
    ],
    disclaimer:
      "This document is provided for analytical and planning purposes only. SettleRate does not originate, broker, or recommend mortgage products. All figures shown are modeled estimates and do not constitute a loan offer, guarantee, or financial advice.",
  };
}

function buildComparisonLayout(a: ScenarioData, b: ScenarioData, c?: ScenarioData | null): ExportLayout {
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  
  const shortIdA = a.id.substring(0, 8).toUpperCase();
  const shortIdB = b.id.substring(0, 8).toUpperCase();
  const shortIdC = c?.id.substring(0, 8).toUpperCase();
  
  const hasScenarioC = !!c;
  const aVsBDeltas = calculateDeltas(a, b);
  const cVsBDeltas = c ? calculateDeltas(c, b) : null;
  
  const getPayoffDate = (scenario: ScenarioData) => {
    const date = new Date();
    date.setMonth(date.getMonth() + scenario.results.payoffMonths);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
  };

  const nameA = a.name || "Scenario A";
  const nameB = b.name || "Scenario B";
  const nameC = c?.name || "Scenario C";

  // Build comparison meta line
  const metaLine = hasScenarioC
    ? `Comparing: ${nameA} (${shortIdA}) vs ${nameB} (${shortIdB}) vs ${nameC} (${shortIdC})`
    : `Comparing: ${nameA} (${shortIdA}) vs ${nameB} (${shortIdB})`;

  // Build summary text
  const summaryText = hasScenarioC
    ? generateThreeWaySummaryText(a, b, c!)
    : generateSummaryText(a, b);

  // Build key differences section with plain-English labels
  const keyDiffSection: LayoutSection = hasScenarioC
    ? {
        title: "How the Options Compare",
        type: "key-diff-groups",
        groups: [
          {
            label: `${nameA} vs ${nameB}`,
            items: [
          { label: "Monthly payment", value: formatDollarFirstDelta(aVsBDeltas.monthlyPaymentDelta, aVsBDeltas.monthlyPaymentPercentDelta, "/mo") },
              { label: "Total cost over time", value: formatDollarFirstDelta(aVsBDeltas.totalCostDelta, aVsBDeltas.totalCostPercentDelta) },
              { label: "Total interest", value: formatDollarFirstDelta(aVsBDeltas.totalInterestDelta, aVsBDeltas.totalInterestPercentDelta) },
              { label: "Interest rate (assumed)", value: formatSignedRateDelta(aVsBDeltas.interestRateDelta) },
              { label: "Loan size vs home value", value: formatLtvDelta(aVsBDeltas.ltvDelta) },
            ],
          },
          {
            label: `${nameC} vs ${nameB}`,
            items: [
              { label: "Monthly payment", value: formatDollarFirstDelta(cVsBDeltas!.monthlyPaymentDelta, cVsBDeltas!.monthlyPaymentPercentDelta, "/mo") },
              { label: "Total cost over time", value: formatDollarFirstDelta(cVsBDeltas!.totalCostDelta, cVsBDeltas!.totalCostPercentDelta) },
              { label: "Total interest", value: formatDollarFirstDelta(cVsBDeltas!.totalInterestDelta, cVsBDeltas!.totalInterestPercentDelta) },
              { label: "Interest rate (assumed)", value: formatSignedRateDelta(cVsBDeltas!.interestRateDelta) },
              { label: "Loan size vs home value", value: formatLtvDelta(cVsBDeltas!.ltvDelta) },
            ],
          },
        ],
      }
    : {
        title: "How the Options Compare",
        type: "key-diff",
        items: [
          { label: "Monthly payment", value: formatDollarFirstDelta(aVsBDeltas.monthlyPaymentDelta, aVsBDeltas.monthlyPaymentPercentDelta, "/mo") },
          { label: "Total cost over time", value: formatDollarFirstDelta(aVsBDeltas.totalCostDelta, aVsBDeltas.totalCostPercentDelta) },
          { label: "Total interest", value: formatDollarFirstDelta(aVsBDeltas.totalInterestDelta, aVsBDeltas.totalInterestPercentDelta) },
          { label: "Interest rate (assumed)", value: formatSignedRateDelta(aVsBDeltas.interestRateDelta) },
          { label: "Loan size vs home value", value: formatLtvDelta(aVsBDeltas.ltvDelta) },
        ],
      };

  // Build comparison table rows (2 or 3 columns)
  const columns = hasScenarioC
    ? ["Metric", nameA, nameB, nameC]
    : ["Metric", nameA, nameB];

  const buildRow = (label: string, valueA: string, valueB: string, valueC?: string): LayoutRow => {
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
          buildRow("Loan type", TRANSACTION_TYPE_LABELS[a.inputs.mode], TRANSACTION_TYPE_LABELS[b.inputs.mode], c ? TRANSACTION_TYPE_LABELS[c.inputs.mode] : undefined),
          buildRow("Loan amount", formatCurrency(a.results.loanAmount), formatCurrency(b.results.loanAmount), c ? formatCurrency(c.results.loanAmount) : undefined),
          buildRow("Term", `${a.inputs.shared.loanTerm} years`, `${b.inputs.shared.loanTerm} years`, c ? `${c.inputs.shared.loanTerm} years` : undefined),
          buildRow("Interest rate (assumed)", formatPercent(a.inputs.shared.interestRate), formatPercent(b.inputs.shared.interestRate), c ? formatPercent(c.inputs.shared.interestRate) : undefined),
          buildRow("Loan-to-value ratio", formatPercent(a.results.ltvRatio), formatPercent(b.results.ltvRatio), c ? formatPercent(c.results.ltvRatio) : undefined),
        ],
      },
      {
        title: "Monthly Payment",
        type: "comparison-table",
        columns: hasScenarioC ? ["Component", nameA, nameB, nameC] : ["Component", nameA, nameB],
        rows: [
          buildRow("Principal & interest", formatCurrency(a.results.monthlyPrincipalInterest), formatCurrency(b.results.monthlyPrincipalInterest), c ? formatCurrency(c.results.monthlyPrincipalInterest) : undefined),
          buildRow("Total monthly payment", formatCurrency(a.results.monthlyTotal), formatCurrency(b.results.monthlyTotal), c ? formatCurrency(c.results.monthlyTotal) : undefined),
        ],
      },
      {
        title: "Long-Term Cost",
        type: "comparison-table",
        columns: hasScenarioC ? ["Metric", nameA, nameB, nameC] : ["Metric", nameA, nameB],
        rows: [
          buildRow("Total payments over term", formatCurrency(a.results.totalCost), formatCurrency(b.results.totalCost), c ? formatCurrency(c.results.totalCost) : undefined),
          buildRow("Total interest paid", formatCurrency(a.results.totalInterest), formatCurrency(b.results.totalInterest), c ? formatCurrency(c.results.totalInterest) : undefined),
          buildRow("Projected payoff date", getPayoffDate(a), getPayoffDate(b), c ? getPayoffDate(c) : undefined),
        ],
      },
    ],
    methodology: [
      "Calculations are based on standard amortization formulas.",
      "Rates shown are inputs provided by the user or advisor and are not lender quotes.",
      "Property taxes and insurance are estimates where applicable.",
      "Results are intended for comparison and planning purposes only.",
      "Summary reflects modeled totals under stated assumptions. Not financial advice.",
    ],
    disclaimer:
      "This document is provided for analytical and planning purposes only. SettleRate does not originate, broker, or recommend mortgage products. All figures shown are modeled estimates and do not constitute a loan offer, guarantee, or financial advice.",
  };
}

// ============================================================================
// PDF RENDERER - Uses canonical layout
// ============================================================================

function renderLayoutToPDF(layout: ExportLayout): Uint8Array {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = BRAND.margins.page;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Helper to check for page break
  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 80) {
      doc.addPage();
      y = margin;
    }
  };

  // ===== HEADER =====
  doc.setFont("helvetica", "normal");
  doc.setFontSize(BRAND.fontSize.brand);
  doc.setTextColor(...BRAND.colors.textMuted);
  doc.text(layout.brand, margin, y);
  y += BRAND.margins.headerGap;
  
  doc.setFontSize(BRAND.fontSize.title);
  doc.setTextColor(...BRAND.colors.text);
  doc.text(layout.title, margin, y);
  y += 18;
  
  doc.setFontSize(BRAND.fontSize.body);
  doc.setTextColor(...BRAND.colors.textMuted);
  doc.text(layout.meta.join("  •  "), margin, y);
  y += 14;
  doc.text(`Generated: ${layout.generatedDate}`, margin, y);
  y += 10;
  
  // Header border
  doc.setDrawColor(...BRAND.colors.border);
  doc.line(margin, y, pageWidth - margin, y);
  y += BRAND.margins.section;

  // ===== SECTIONS =====
  for (const section of layout.sections) {
    checkPageBreak(60);
    
    // Section title
    doc.setFontSize(BRAND.fontSize.sectionTitle);
    doc.setTextColor(...BRAND.colors.text);
    doc.text(section.title, margin, y);
    y += 6;
    doc.setDrawColor(...BRAND.colors.borderLight);
    doc.line(margin, y, pageWidth - margin, y);
    y += 16;

    if (section.type === "text" && section.text) {
      doc.setFontSize(BRAND.fontSize.body);
      doc.setTextColor(...BRAND.colors.text);
      const lines = doc.splitTextToSize(section.text, contentWidth);
      doc.text(lines, margin, y);
      y += lines.length * 12 + 12;
    }

    if (section.type === "key-diff" && section.items) {
      doc.setFontSize(BRAND.fontSize.small);
      const itemWidth = 100;
      let x = margin;
      for (const item of section.items) {
        doc.setTextColor(...BRAND.colors.textMuted);
        doc.text(item.label, x, y);
        doc.setTextColor(...BRAND.colors.text);
        doc.text(item.value, x, y + 12);
        x += itemWidth;
        if (x > pageWidth - margin - itemWidth) {
          x = margin;
          y += 28;
        }
      }
      y += 28;
    }
    
    if (section.type === "key-diff-groups" && section.groups) {
      for (const group of section.groups) {
        checkPageBreak(50);
        // Group label
        doc.setFontSize(BRAND.fontSize.small);
        doc.setTextColor(...BRAND.colors.textMuted);
        doc.text(group.label, margin, y);
        y += 14;
        
        // Group items
        const itemWidth = 100;
        let x = margin;
        for (const item of group.items) {
          doc.setTextColor(...BRAND.colors.textMuted);
          doc.text(item.label, x, y);
          doc.setTextColor(...BRAND.colors.text);
          doc.text(item.value, x, y + 12);
          x += itemWidth;
          if (x > pageWidth - margin - itemWidth) {
            x = margin;
            y += 28;
          }
        }
        y += 32;
      }
    }

    if (section.type === "table" && section.rows) {
      doc.setFontSize(BRAND.fontSize.body);
      for (const row of section.rows) {
        checkPageBreak(20);
        const isTotal = row.label.toLowerCase().includes("total");
        if (isTotal) {
          y += 4;
          doc.setDrawColor(...BRAND.colors.border);
          doc.line(margin, y, pageWidth - margin, y);
          y += 12;
        }
        const labelColor = isTotal ? BRAND.colors.text : BRAND.colors.textMuted;
        doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
        doc.text(row.label, margin, y);
        doc.setTextColor(...BRAND.colors.text);
        doc.text(row.value, pageWidth - margin, y, { align: "right" });
        y += BRAND.margins.tableRow;
      }
      y += 10;
    }

    if (section.type === "comparison-table" && section.rows && section.columns) {
      const numCols = section.columns.length;
      const is4Col = numCols === 4;
      
      // Column positions for 3-col vs 4-col
      const col1 = margin;
      const col2 = is4Col ? margin + contentWidth * 0.30 : margin + contentWidth * 0.40;
      const col3 = is4Col ? margin + contentWidth * 0.53 : margin + contentWidth * 0.70;
      const col4 = is4Col ? margin + contentWidth * 0.76 : 0;

      // Headers
      doc.setFontSize(BRAND.fontSize.body);
      doc.setTextColor(...BRAND.colors.text);
      doc.text(section.columns[0], col1, y);
      doc.text(section.columns[1], col2, y);
      doc.text(section.columns[2], col3, y);
      if (is4Col && section.columns[3]) {
        doc.text(section.columns[3], col4, y);
      }
      y += 6;
      doc.setDrawColor(...BRAND.colors.border);
      doc.line(margin, y, pageWidth - margin, y);
      y += 14;

      // Rows
      for (const row of section.rows) {
        checkPageBreak(20);
        const isTotal = row.label.toLowerCase().includes("total");
        if (isTotal) {
          y += 4;
          doc.line(margin, y, pageWidth - margin, y);
          y += 12;
        }
        const rowLabelColor = isTotal ? BRAND.colors.text : BRAND.colors.textMuted;
        doc.setTextColor(rowLabelColor[0], rowLabelColor[1], rowLabelColor[2]);
        doc.text(row.label, col1, y);
        doc.setTextColor(...BRAND.colors.text);
        doc.text(row.value, col2, y);
        doc.text(row.value2 || "", col3, y);
        if (is4Col) {
          doc.text(row.value3 || "", col4, y);
        }
        y += BRAND.margins.tableRow;
      }
      y += 10;
    }
  }

  // ===== METHODOLOGY =====
  checkPageBreak(80);
  doc.setFontSize(BRAND.fontSize.sectionTitle);
  doc.setTextColor(...BRAND.colors.text);
  doc.text("Methodology", margin, y);
  y += 6;
  doc.setDrawColor(...BRAND.colors.borderLight);
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;

  doc.setFontSize(BRAND.fontSize.small);
  doc.setTextColor(...BRAND.colors.textMuted);
  for (const note of layout.methodology) {
    doc.text(`• ${note}`, margin, y);
    y += 12;
  }

  // ===== FOOTER =====
  y = pageHeight - 70;
  doc.setDrawColor(...BRAND.colors.border);
  doc.line(margin, y, pageWidth - margin, y);
  y += 14;
  
  // Footer meta
  doc.setFontSize(BRAND.fontSize.footer);
  doc.setTextColor(...BRAND.colors.textLight);
  doc.text(`${layout.brand} — ${BRAND.domain}`, margin, y);
  doc.text(`Generated ${layout.generatedDate}`, pageWidth - margin, y, { align: "right" });
  y += 12;
  
  // Disclaimer
  const disclaimerLines = doc.splitTextToSize(layout.disclaimer, contentWidth);
  doc.text(disclaimerLines, pageWidth / 2, y, { align: "center" });

  return doc.output("arraybuffer") as unknown as Uint8Array;
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

function generateComparisonFilename(a: ScenarioData, b: ScenarioData, c?: ScenarioData | null): string {
  const date = new Date().toISOString().split("T")[0];
  const nameA = (a.name || "A").replace(/[^a-zA-Z0-9]/g, "_").substring(0, 12);
  const nameB = (b.name || "B").replace(/[^a-zA-Z0-9]/g, "_").substring(0, 12);
  if (c) {
    const nameC = (c.name || "C").replace(/[^a-zA-Z0-9]/g, "_").substring(0, 12);
    return `SettleRate_Comparison_${nameA}_vs_${nameB}_vs_${nameC}_${date}`;
  }
  return `SettleRate_Comparison_${nameA}_vs_${nameB}_${date}`;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req: Request) => {
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

    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {},
      },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error("EXPORT_PDF_AUTH_FAILED:", { error: authError?.message });
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let pdfBytes: Uint8Array;
    let filename: string;

    if (type === "scenario") {
      const { data: scenario, error: scenarioError } = await supabase
        .from("scenarios")
        .select("*")
        .eq("id", id)
        .single();

      if (scenarioError || !scenario) {
        console.error("EXPORT_PDF_SCENARIO_FETCH_FAILED:", {
          scenario_id: id,
          user_id: user.id,
          error: scenarioError?.message,
        });
        return new Response(
          JSON.stringify({ error: "Scenario not found or access denied" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const scenarioData = buildScenarioData(scenario);
      const layout = buildScenarioLayout(scenarioData);
      pdfBytes = renderLayoutToPDF(layout);
      filename = generateScenarioFilename(scenarioData);
      
    } else {
      const { data: comparison, error: comparisonError } = await supabase
        .from("user_comparisons")
        .select("*")
        .eq("id", id)
        .single();

      if (comparisonError || !comparison) {
        console.error("EXPORT_PDF_COMPARISON_FETCH_FAILED:", {
          comparison_id: id,
          user_id: user.id,
          error: comparisonError?.message,
        });
        return new Response(
          JSON.stringify({ error: "Comparison not found or access denied" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Build list of scenario IDs to fetch (2 or 3)
      const scenarioIds = [comparison.scenario_a_id, comparison.scenario_b_id];
      if (comparison.scenario_c_id) {
        scenarioIds.push(comparison.scenario_c_id);
      }

      const { data: scenarios, error: scenariosError } = await supabase
        .from("scenarios")
        .select("*")
        .in("id", scenarioIds);

      const expectedCount = scenarioIds.length;
      if (scenariosError || !scenarios || scenarios.length !== expectedCount) {
        console.error("EXPORT_PDF_SCENARIOS_FETCH_FAILED:", {
          comparison_id: id,
          scenario_a_id: comparison.scenario_a_id,
          scenario_b_id: comparison.scenario_b_id,
          scenario_c_id: comparison.scenario_c_id,
          user_id: user.id,
          scenarios_found: scenarios?.length ?? 0,
          expected: expectedCount,
          error: scenariosError?.message,
        });
        return new Response(
          JSON.stringify({ error: "One or more scenarios not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const scenarioA = scenarios.find(s => s.id === comparison.scenario_a_id)!;
      const scenarioB = scenarios.find(s => s.id === comparison.scenario_b_id)!;
      const scenarioC = comparison.scenario_c_id 
        ? scenarios.find(s => s.id === comparison.scenario_c_id) 
        : null;

      const dataA = buildScenarioData(scenarioA);
      const dataB = buildScenarioData(scenarioB);
      const dataC = scenarioC ? buildScenarioData(scenarioC) : null;
      
      const layout = buildComparisonLayout(dataA, dataB, dataC);
      pdfBytes = renderLayoutToPDF(layout);
      filename = generateComparisonFilename(dataA, dataB, dataC);
    }

    console.log("EXPORT_PDF_SUCCESS:", {
      type,
      id,
      user_id: user.id,
      filename,
      size_bytes: pdfBytes.length,
    });

    return new Response(new Uint8Array(pdfBytes), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        "Cache-Control": "no-store",
      },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("EXPORT_PDF_GENERATION_FAILED:", JSON.stringify({
      error: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString(),
    }));
    return new Response(
      JSON.stringify({ error: "Export failed." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============================================================================
// DATA BUILDER HELPER
// ============================================================================

function buildScenarioData(s: any): ScenarioData {
  const inputs = (s.inputs || {}) as ScenarioInputs;
  const derived = (s.derived || {}) as ScenarioResults;
  return {
    id: s.id,
    name: s.name || "Untitled",
    inputs: {
      mode: inputs.mode || "purchase",
      shared: inputs.shared || { loanTerm: 30, interestRate: 0 },
      purchase: inputs.purchase,
      refinance: inputs.refinance,
    },
    results: {
      loanAmount: derived.loanAmount || 0,
      monthlyPrincipalInterest: derived.monthlyPrincipalInterest || 0,
      monthlyTotal: derived.monthlyTotal || 0,
      monthlyPropertyTax: derived.monthlyPropertyTax || 0,
      monthlyHomeInsurance: derived.monthlyHomeInsurance || 0,
      monthlyPMI: derived.monthlyPMI || 0,
      monthlyHOA: derived.monthlyHOA || 0,
      totalCost: derived.totalCost || 0,
      totalInterest: derived.totalInterest || 0,
      ltvRatio: derived.ltvRatio || 0,
      payoffMonths: derived.payoffMonths || 360,
    },
  };
}
