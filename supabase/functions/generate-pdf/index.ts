/**
 * PDF Generation Edge Function - CANONICAL LAYOUT
 * 
 * Generates real PDF documents using the same layout structure
 * as the client-side print HTML. Both use matching:
 * - Typography (brand serif for headings, system font for body)
 * - Spacing (consistent margins, section gaps, table padding)
 * - Content structure (same sections, same data order)
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

interface LayoutRow {
  label: string;
  value: string;
  value2?: string;
}

interface LayoutSection {
  title: string;
  type: "table" | "comparison-table" | "key-diff" | "text";
  rows?: LayoutRow[];
  columns?: string[];
  text?: string;
  items?: { label: string; value: string }[];
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

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  purchase: "Purchase",
  refinance: "Refinance",
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
  return {
    monthlyPaymentDelta: (a.results.monthlyTotal || 0) - (b.results.monthlyTotal || 0),
    totalCostDelta: (a.results.totalCost || 0) - (b.results.totalCost || 0),
    totalInterestDelta: (a.results.totalInterest || 0) - (b.results.totalInterest || 0),
    interestRateDelta: Math.round(((a.inputs?.shared?.interestRate || 0) - (b.inputs?.shared?.interestRate || 0)) * 100),
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
      "Rates shown are assumed inputs, not lender quotes.",
      "Property taxes and insurance are estimates where applicable.",
      "Results are intended for comparison and planning purposes only.",
      "Final loan terms subject to lender approval and property appraisal.",
    ],
    disclaimer:
      "This document is provided for analytical and planning purposes only. SettleRate does not originate, broker, or recommend mortgage products. All figures shown are modeled estimates and do not constitute a loan offer, guarantee, or financial advice.",
  };
}

function buildComparisonLayout(a: ScenarioData, b: ScenarioData): ExportLayout {
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  
  const shortIdA = a.id.substring(0, 8).toUpperCase();
  const shortIdB = b.id.substring(0, 8).toUpperCase();
  const deltas = calculateDeltas(a, b);
  
  const getPayoffDate = (scenario: ScenarioData) => {
    const date = new Date();
    date.setMonth(date.getMonth() + scenario.results.payoffMonths);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
  };

  const nameA = a.name || "Scenario A";
  const nameB = b.name || "Scenario B";

  return {
    brand: BRAND.name,
    title: "Mortgage Scenario Comparison",
    meta: [`Comparing: ${nameA} (${shortIdA}) vs ${nameB} (${shortIdB})`],
    generatedDate: dateStr,
    sections: [
      {
        title: "Comparison Summary",
        type: "text",
        text: generateSummaryText(a, b),
      },
      {
        title: "Key Differences",
        type: "key-diff",
        items: [
          { label: "Monthly payment", value: formatSignedDelta(deltas.monthlyPaymentDelta) },
          { label: "Total cost", value: formatSignedDelta(deltas.totalCostDelta) },
          { label: "Total interest", value: formatSignedDelta(deltas.totalInterestDelta) },
          { label: "Interest rate", value: formatSignedBasisPoints(deltas.interestRateDelta) },
          { label: "LTV", value: formatLtvDelta(deltas.ltvDelta) },
        ],
      },
      {
        title: "Scenario Overview",
        type: "comparison-table",
        columns: ["Metric", nameA, nameB],
        rows: [
          { label: "Loan type", value: TRANSACTION_TYPE_LABELS[a.inputs.mode], value2: TRANSACTION_TYPE_LABELS[b.inputs.mode] },
          { label: "Loan amount", value: formatCurrency(a.results.loanAmount), value2: formatCurrency(b.results.loanAmount) },
          { label: "Term", value: `${a.inputs.shared.loanTerm} years`, value2: `${b.inputs.shared.loanTerm} years` },
          { label: "Interest rate (assumed)", value: formatPercent(a.inputs.shared.interestRate), value2: formatPercent(b.inputs.shared.interestRate) },
          { label: "Loan-to-value ratio", value: formatPercent(a.results.ltvRatio), value2: formatPercent(b.results.ltvRatio) },
        ],
      },
      {
        title: "Monthly Payment",
        type: "comparison-table",
        columns: ["Component", nameA, nameB],
        rows: [
          { label: "Principal & interest", value: formatCurrency(a.results.monthlyPrincipalInterest), value2: formatCurrency(b.results.monthlyPrincipalInterest) },
          { label: "Total monthly payment", value: formatCurrency(a.results.monthlyTotal), value2: formatCurrency(b.results.monthlyTotal) },
        ],
      },
      {
        title: "Long-Term Cost",
        type: "comparison-table",
        columns: ["Metric", nameA, nameB],
        rows: [
          { label: "Total payments over term", value: formatCurrency(a.results.totalCost), value2: formatCurrency(b.results.totalCost) },
          { label: "Total interest paid", value: formatCurrency(a.results.totalInterest), value2: formatCurrency(b.results.totalInterest) },
          { label: "Projected payoff date", value: getPayoffDate(a), value2: getPayoffDate(b) },
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
      const col1 = margin;
      const col2 = margin + contentWidth * 0.4;
      const col3 = margin + contentWidth * 0.7;

      // Headers
      doc.setFontSize(BRAND.fontSize.body);
      doc.setTextColor(...BRAND.colors.text);
      doc.text(section.columns[0], col1, y);
      doc.text(section.columns[1], col2, y);
      doc.text(section.columns[2], col3, y);
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

function generateComparisonFilename(a: ScenarioData, b: ScenarioData): string {
  const date = new Date().toISOString().split("T")[0];
  const nameA = (a.name || "A").replace(/[^a-zA-Z0-9]/g, "_").substring(0, 15);
  const nameB = (b.name || "B").replace(/[^a-zA-Z0-9]/g, "_").substring(0, 15);
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

      const dataA = buildScenarioData(scenarioA);
      const dataB = buildScenarioData(scenarioB);
      const layout = buildComparisonLayout(dataA, dataB);
      pdfBytes = renderLayoutToPDF(layout);
      filename = generateComparisonFilename(dataA, dataB);
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
