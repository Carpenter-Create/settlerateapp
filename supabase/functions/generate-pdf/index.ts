/**
 * PDF Generation Edge Function
 * 
 * Generates real PDF documents from scenario/comparison data.
 * Uses jsPDF for server-side PDF generation.
 * 
 * Endpoints:
 * GET /generate-pdf?type=scenario&id=xxx
 * GET /generate-pdf?type=comparison&id=xxx
 * 
 * Returns:
 * - Content-Type: application/pdf
 * - Content-Disposition: attachment; filename="..."
 * 
 * Security:
 * - Authenticates user via JWT
 * - Verifies ownership of the resource (RLS-safe)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
// Import jsPDF for PDF generation
// @deno-types="https://esm.sh/jspdf@2.5.1"
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

// ============================================================================
// FORMATTING UTILITIES
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
  const aResults = a.results || {};
  const bResults = b.results || {};
  const aShared = a.inputs?.shared || {};
  const bShared = b.inputs?.shared || {};
  
  return {
    monthlyPaymentDelta: (aResults.monthlyTotal || 0) - (bResults.monthlyTotal || 0),
    totalCostDelta: (aResults.totalCost || 0) - (bResults.totalCost || 0),
    totalInterestDelta: (aResults.totalInterest || 0) - (bResults.totalInterest || 0),
    interestRateDelta: Math.round(((aShared.interestRate || 0) - (bShared.interestRate || 0)) * 100),
    ltvDelta: (aResults.ltvRatio || 0) - (bResults.ltvRatio || 0),
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

function generateSummaryText(a: ScenarioData, b: ScenarioData): string {
  const deltas = calculateDeltas(a, b);
  const monthlyDiff = Math.abs(deltas.monthlyPaymentDelta);
  const totalDiff = Math.abs(deltas.totalCostDelta);
  
  const aName = a.name || "Scenario A";
  const bName = b.name || "Scenario B";
  const lowerMonthly = deltas.monthlyPaymentDelta > 0 ? bName : aName;
  const higherMonthly = deltas.monthlyPaymentDelta > 0 ? aName : bName;
  
  let summary = `${lowerMonthly} has a lower monthly payment by ${formatCurrency(monthlyDiff)}, `;
  
  if (deltas.totalCostDelta > 0) {
    summary += `while ${higherMonthly} results in ${formatCurrency(totalDiff)} more in total payments over the loan term.`;
  } else {
    summary += `and also results in ${formatCurrency(totalDiff)} less in total payments over the loan term.`;
  }
  
  return summary;
}

// ============================================================================
// PDF GENERATION - SCENARIO
// ============================================================================

function generateScenarioPDF(scenario: ScenarioData): Uint8Array {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
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

  // Page setup
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 50;
  const contentWidth = pageWidth - (margin * 2);
  let y = margin;

  // Header
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("SettleRate", margin, y);
  y += 24;
  
  doc.setFontSize(18);
  doc.setTextColor(30, 30, 30);
  doc.text("Mortgage Scenario Summary", margin, y);
  y += 16;
  
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Scenario: ${name || "Untitled"}  •  ID: ${shortId}  •  Generated: ${dateStr}`, margin, y);
  y += 8;
  
  // Line under header
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 24;

  // Section: Scenario Overview
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  doc.text("Scenario Overview", margin, y);
  y += 4;
  doc.setDrawColor(230, 230, 230);
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;

  const tableData = [
    ["Loan type", TRANSACTION_TYPE_LABELS[inputs.mode]],
    ["Property value", formatCurrency(propertyValue)],
  ];
  
  if (isPurchase) {
    const dpPercent = propertyValue > 0 ? (downPaymentAmount / propertyValue * 100) : 0;
    tableData.push(["Down payment", `${formatCurrency(downPaymentAmount)} (${formatPercent(dpPercent)})`]);
  } else if (inputs.refinance) {
    tableData.push(["Current loan balance", formatCurrency(inputs.refinance.currentLoanBalance)]);
  }
  
  tableData.push(
    ["Loan amount", formatCurrency(results.loanAmount)],
    ["Loan term", `${inputs.shared.loanTerm} years`],
    ["Interest rate (assumed)", formatPercent(inputs.shared.interestRate)],
    ["Loan-to-value ratio", formatPercent(results.ltvRatio)]
  );

  // Draw table
  doc.setFontSize(9);
  for (const row of tableData) {
    doc.setTextColor(100, 100, 100);
    doc.text(row[0], margin, y);
    doc.setTextColor(30, 30, 30);
    doc.text(row[1], pageWidth - margin, y, { align: "right" });
    y += 14;
  }
  y += 10;

  // Section: Monthly Payment
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  doc.text("Monthly Payment", margin, y);
  y += 4;
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;

  const paymentData = [
    ["Principal & interest", formatCurrency(results.monthlyPrincipalInterest)],
  ];
  if (results.monthlyPropertyTax > 0) paymentData.push(["Property tax", formatCurrency(results.monthlyPropertyTax)]);
  if (results.monthlyHomeInsurance > 0) paymentData.push(["Home insurance", formatCurrency(results.monthlyHomeInsurance)]);
  if (results.monthlyPMI > 0) paymentData.push(["PMI", formatCurrency(results.monthlyPMI)]);
  if (results.monthlyHOA > 0) paymentData.push(["HOA", formatCurrency(results.monthlyHOA)]);

  doc.setFontSize(9);
  for (const row of paymentData) {
    doc.setTextColor(100, 100, 100);
    doc.text(row[0], margin, y);
    doc.setTextColor(30, 30, 30);
    doc.text(row[1], pageWidth - margin, y, { align: "right" });
    y += 14;
  }
  
  // Total row
  y += 4;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;
  doc.setTextColor(30, 30, 30);
  doc.text("Total monthly payment", margin, y);
  doc.text(formatCurrency(results.monthlyTotal), pageWidth - margin, y, { align: "right" });
  y += 20;

  // Section: Long-Term Cost
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  doc.text("Long-Term Cost Summary", margin, y);
  y += 4;
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;

  const costData = [
    ["Total payments over term", formatCurrency(results.totalCost)],
    ["Total interest paid", formatCurrency(results.totalInterest)],
    ["Projected payoff date", payoffDateStr],
  ];

  doc.setFontSize(9);
  for (const row of costData) {
    doc.setTextColor(100, 100, 100);
    doc.text(row[0], margin, y);
    doc.setTextColor(30, 30, 30);
    doc.text(row[1], pageWidth - margin, y, { align: "right" });
    y += 14;
  }
  y += 20;

  // Methodology
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  doc.text("Methodology", margin, y);
  y += 4;
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const notes = [
    "• Calculations are based on standard amortization formulas.",
    "• Rates shown are assumed inputs, not lender quotes.",
    "• Property taxes and insurance are estimates where applicable.",
    "• Results are intended for comparison and planning purposes only.",
  ];
  for (const note of notes) {
    doc.text(note, margin, y);
    y += 12;
  }

  // Footer disclaimer
  y = doc.internal.pageSize.getHeight() - 60;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;
  
  doc.setFontSize(7);
  doc.setTextColor(130, 130, 130);
  const disclaimer = "This document is provided for analytical and planning purposes only. SettleRate does not originate, broker, or recommend mortgage products. All figures shown are modeled estimates and do not constitute a loan offer, guarantee, or financial advice.";
  const disclaimerLines = doc.splitTextToSize(disclaimer, contentWidth);
  doc.text(disclaimerLines, pageWidth / 2, y, { align: "center" });

  return doc.output("arraybuffer") as unknown as Uint8Array;
}

// ============================================================================
// PDF GENERATION - COMPARISON
// ============================================================================

function generateComparisonPDF(scenarioA: ScenarioData, scenarioB: ScenarioData): Uint8Array {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  
  const shortIdA = scenarioA.id.substring(0, 8).toUpperCase();
  const shortIdB = scenarioB.id.substring(0, 8).toUpperCase();
  const deltas = calculateDeltas(scenarioA, scenarioB);

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 50;
  const contentWidth = pageWidth - (margin * 2);
  const col1 = margin;
  const col2 = margin + contentWidth * 0.4;
  const col3 = margin + contentWidth * 0.7;
  let y = margin;

  // Header
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("SettleRate", margin, y);
  y += 24;
  
  doc.setFontSize(18);
  doc.setTextColor(30, 30, 30);
  doc.text("Mortgage Scenario Comparison", margin, y);
  y += 16;
  
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Comparing: ${scenarioA.name || "Scenario A"} (${shortIdA}) vs ${scenarioB.name || "Scenario B"} (${shortIdB})`, margin, y);
  y += 12;
  doc.text(`Generated: ${dateStr}`, margin, y);
  y += 8;
  
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 24;

  // Comparison Summary
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  doc.text("Comparison Summary", margin, y);
  y += 4;
  doc.setDrawColor(230, 230, 230);
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;

  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  const summaryText = generateSummaryText(scenarioA, scenarioB);
  const summaryLines = doc.splitTextToSize(summaryText, contentWidth);
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 12 + 16;

  // Key differences
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const keyDiffs = [
    ["Monthly payment", formatSignedDelta(deltas.monthlyPaymentDelta)],
    ["Total cost", formatSignedDelta(deltas.totalCostDelta)],
    ["Interest rate", formatSignedBasisPoints(deltas.interestRateDelta)],
    ["LTV", formatLtvDelta(deltas.ltvDelta)],
  ];
  
  const diffX = [margin, margin + 120, margin + 240, margin + 340];
  for (let i = 0; i < keyDiffs.length; i++) {
    doc.setTextColor(100, 100, 100);
    doc.text(keyDiffs[i][0], diffX[i], y);
    doc.setTextColor(30, 30, 30);
    doc.text(keyDiffs[i][1], diffX[i], y + 10);
  }
  y += 30;

  // Scenario Overview table
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  doc.text("Scenario Overview", margin, y);
  y += 4;
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;

  // Table headers
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  doc.text("Metric", col1, y);
  doc.text(scenarioA.name || "Scenario A", col2, y);
  doc.text(scenarioB.name || "Scenario B", col3, y);
  y += 4;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 14;

  const overviewRows = [
    ["Loan type", TRANSACTION_TYPE_LABELS[scenarioA.inputs.mode], TRANSACTION_TYPE_LABELS[scenarioB.inputs.mode]],
    ["Loan amount", formatCurrency(scenarioA.results.loanAmount), formatCurrency(scenarioB.results.loanAmount)],
    ["Term", `${scenarioA.inputs.shared.loanTerm} years`, `${scenarioB.inputs.shared.loanTerm} years`],
    ["Interest rate", formatPercent(scenarioA.inputs.shared.interestRate), formatPercent(scenarioB.inputs.shared.interestRate)],
    ["LTV ratio", formatPercent(scenarioA.results.ltvRatio), formatPercent(scenarioB.results.ltvRatio)],
  ];

  for (const row of overviewRows) {
    doc.setTextColor(100, 100, 100);
    doc.text(row[0], col1, y);
    doc.setTextColor(30, 30, 30);
    doc.text(row[1], col2, y);
    doc.text(row[2], col3, y);
    y += 14;
  }
  y += 10;

  // Monthly Payment table
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  doc.text("Monthly Payment", margin, y);
  y += 4;
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;

  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  doc.text("Component", col1, y);
  doc.text(scenarioA.name || "Scenario A", col2, y);
  doc.text(scenarioB.name || "Scenario B", col3, y);
  y += 4;
  doc.line(margin, y, pageWidth - margin, y);
  y += 14;

  doc.setTextColor(100, 100, 100);
  doc.text("Principal & interest", col1, y);
  doc.setTextColor(30, 30, 30);
  doc.text(formatCurrency(scenarioA.results.monthlyPrincipalInterest), col2, y);
  doc.text(formatCurrency(scenarioB.results.monthlyPrincipalInterest), col3, y);
  y += 14;

  y += 4;
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;
  doc.setTextColor(30, 30, 30);
  doc.text("Total monthly payment", col1, y);
  doc.text(formatCurrency(scenarioA.results.monthlyTotal), col2, y);
  doc.text(formatCurrency(scenarioB.results.monthlyTotal), col3, y);
  y += 20;

  // Long-term cost table
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  doc.text("Long-Term Cost", margin, y);
  y += 4;
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;

  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  doc.text("Metric", col1, y);
  doc.text(scenarioA.name || "Scenario A", col2, y);
  doc.text(scenarioB.name || "Scenario B", col3, y);
  y += 4;
  doc.line(margin, y, pageWidth - margin, y);
  y += 14;

  const getPayoffDate = (scenario: ScenarioData) => {
    const date = new Date();
    date.setMonth(date.getMonth() + scenario.results.payoffMonths);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
  };

  const costRows = [
    ["Total payments", formatCurrency(scenarioA.results.totalCost), formatCurrency(scenarioB.results.totalCost)],
    ["Total interest", formatCurrency(scenarioA.results.totalInterest), formatCurrency(scenarioB.results.totalInterest)],
    ["Payoff date", getPayoffDate(scenarioA), getPayoffDate(scenarioB)],
  ];

  for (const row of costRows) {
    doc.setTextColor(100, 100, 100);
    doc.text(row[0], col1, y);
    doc.setTextColor(30, 30, 30);
    doc.text(row[1], col2, y);
    doc.text(row[2], col3, y);
    y += 14;
  }

  // Footer disclaimer
  y = doc.internal.pageSize.getHeight() - 60;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;
  
  doc.setFontSize(7);
  doc.setTextColor(130, 130, 130);
  const disclaimer = "This document is provided for analytical and planning purposes only. SettleRate does not originate, broker, or recommend mortgage products. All figures shown are modeled estimates and do not constitute a loan offer, guarantee, or financial advice.";
  const disclaimerLines = doc.splitTextToSize(disclaimer, contentWidth);
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
      console.error("EXPORT_PDF_AUTH_FAILED:", { error: authError?.message });
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let pdfBytes: Uint8Array;
    let filename: string;

    if (type === "scenario") {
      // Fetch the scenario (RLS will ensure user owns it)
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

      const scenarioData: ScenarioData = {
        id: scenario.id,
        name: scenario.name,
        inputs: scenario.inputs as ScenarioInputs,
        results: scenario.derived as ScenarioResults,
      };

      pdfBytes = generateScenarioPDF(scenarioData);
      filename = generateScenarioFilename(scenarioData);
      
    } else {
      // Fetch the comparison (RLS will ensure user owns it)
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

      // Fetch both scenarios
      const { data: scenarios, error: scenariosError } = await supabase
        .from("scenarios")
        .select("*")
        .in("id", [comparison.scenario_a_id, comparison.scenario_b_id]);

      if (scenariosError || !scenarios || scenarios.length !== 2) {
        console.error("EXPORT_PDF_SCENARIOS_FETCH_FAILED:", {
          comparison_id: id,
          scenario_a_id: comparison.scenario_a_id,
          scenario_b_id: comparison.scenario_b_id,
          user_id: user.id,
          scenarios_found: scenarios?.length ?? 0,
          error: scenariosError?.message,
        });
        return new Response(
          JSON.stringify({ error: "One or more scenarios not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const scenarioA = scenarios.find(s => s.id === comparison.scenario_a_id)!;
      const scenarioB = scenarios.find(s => s.id === comparison.scenario_b_id)!;

      // Defensive: ensure inputs and derived exist
      const buildScenarioData = (s: typeof scenarioA): ScenarioData => {
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
      };

      const scenarioDataA = buildScenarioData(scenarioA);
      const scenarioDataB = buildScenarioData(scenarioB);

      pdfBytes = generateComparisonPDF(scenarioDataA, scenarioDataB);
      filename = generateComparisonFilename(scenarioDataA, scenarioDataB);
    }

    console.log("EXPORT_PDF_SUCCESS:", {
      type,
      id,
      user_id: user.id,
      filename,
      size_bytes: pdfBytes.length,
    });

    // Return real PDF with correct headers
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
