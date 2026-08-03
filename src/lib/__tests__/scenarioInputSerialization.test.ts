import { describe, it, expect, vi } from "vitest";
import type { MortgageInputs } from "@/lib/mortgage";
import { DEFAULT_HELOC_INPUTS } from "@/lib/heloc";
import { DEFAULT_ASSUMPTION_INPUTS } from "@/lib/assumption";
import {
  serializeInputsForSupabase,
  deserializeInputsFromSupabase,
} from "@/lib/scenarioInputSerialization";
import { createScenarioData } from "@/lib/scenarioContract";
import { toSupabaseRow, ensureClientId } from "@/lib/scenarioStore";
import bmP01 from "./fixtures/BM-P01.json";
import bmR01 from "./fixtures/BM-R01.json";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {},
}));

function roundTrip(inputs: MortgageInputs): MortgageInputs {
  return deserializeInputsFromSupabase(serializeInputsForSupabase(inputs));
}

/** Shared namespaced fields with explicit zero, false, and null values */
const sharedWithSentinels: MortgageInputs["shared"] = {
  interestRate: 6.5,
  loanTerm: 30,
  rateSourceType: "user_entered",
  rateSourceNote: null,
  includeEstimates: false,
  zipCode: null,
  usedZipEstimate: false,
  propertyTaxMode: "rate",
  propertyTaxRate: null,
  propertyTaxAnnual: null,
  homeInsuranceMonthly: null,
  hoaMonthly: null,
  pmiMonthly: null,
  extraMonthlyPayment: 0,
  oneTimePrincipalPayment: null,
};

describe("serializeInputsForSupabase — persistence round-trip", () => {
  it("preserves purchase mode and nested inputs", () => {
    const inputs = bmP01.inputs as MortgageInputs;
    const restored = roundTrip(inputs);

    expect(restored.mode).toBe("purchase");
    expect(restored.purchase).toEqual(inputs.purchase);
    expect(restored.refinance.cashOutAmount).toBe(0);
    expect(restored.refinance.financeClosingCosts).toBe(false);
    expect(restored.shared.includeEstimates).toBe(false);
    expect(restored.shared.zipCode).toBe(null);
    expect(restored.shared.extraMonthlyPayment).toBe(0);
    expect(restored.shared.oneTimePrincipalPayment).toBe(null);
  });

  it("preserves refinance mode and nested inputs", () => {
    const inputs = bmR01.inputs as MortgageInputs;
    const restored = roundTrip(inputs);

    expect(restored.mode).toBe("refinance");
    expect(restored.refinance.currentLoanBalance).toBe(300000);
    expect(restored.refinance.cashOutAmount).toBe(0);
    expect(restored.refinance.closingCosts).toBe(6000);
    expect(restored.refinance.financeClosingCosts).toBe(false);
    expect(restored.shared.interestRate).toBe(6.5);
    expect(restored.shared.loanTerm).toBe(30);
  });

  it("preserves HELOC mode and nested heloc inputs", () => {
    const inputs: MortgageInputs = {
      mode: "heloc",
      purchase: { purchasePrice: 450000, downPayment: 20, downPaymentType: "percent" },
      refinance: {
        currentLoanBalance: 300000,
        cashOutAmount: 0,
        closingCosts: 0,
        financeClosingCosts: false,
        estimatedHomeValue: null,
      },
      shared: sharedWithSentinels,
      heloc: {
        ...DEFAULT_HELOC_INPUTS,
        creditLimit: 50000,
        currentBalance: 0,
        monthlyDraw: 1000,
        annualFee: 0,
        closingCosts: 0,
        interestOnlyDraw: true,
      },
    };

    const restored = roundTrip(inputs);

    expect(restored.mode).toBe("heloc");
    expect(restored.heloc).toEqual(inputs.heloc);
    expect(restored.heloc?.currentBalance).toBe(0);
    expect(restored.heloc?.annualFee).toBe(0);
    expect(restored.heloc?.interestOnlyDraw).toBe(true);
    expect(restored.heloc?.closingCosts).toBe(0);
  });

  it("preserves assumption mode and nested assumption inputs", () => {
    const inputs: MortgageInputs = {
      mode: "assumption",
      purchase: { purchasePrice: 350000, downPayment: 0, downPaymentType: "percent" },
      refinance: {
        currentLoanBalance: 0,
        cashOutAmount: 0,
        closingCosts: 0,
        financeClosingCosts: false,
        estimatedHomeValue: null,
      },
      shared: sharedWithSentinels,
      assumption: {
        ...DEFAULT_ASSUMPTION_INPUTS,
        purchasePrice: 350000,
        downPaymentCash: 50000,
        assumed: {
          balance: 200000,
          apr: 3.5,
          remainingMonths: 300,
          monthlyPmi: 0,
          monthlyEscrow: 0,
        },
        gap: {
          amount: 0,
          method: "second_loan",
          loanApr: 7.5,
          loanTermMonths: 180,
          helocApr: 8.5,
          helocInterestOnly: true,
          helocRepayMonths: 60,
        },
        assumptionFees: 0,
      },
    };

    const restored = roundTrip(inputs);

    expect(restored.mode).toBe("assumption");
    expect(restored.assumption).toEqual(inputs.assumption);
    expect(restored.assumption?.assumed.monthlyPmi).toBe(0);
    expect(restored.assumption?.assumed.monthlyEscrow).toBe(0);
    expect(restored.assumption?.gap.amount).toBe(0);
    expect(restored.assumption?.gap.helocInterestOnly).toBe(true);
    expect(restored.assumption?.assumptionFees).toBe(0);
  });

  it("omits undefined optional fields as JSON.stringify does", () => {
    const inputs: MortgageInputs = {
      mode: "purchase",
      purchase: { purchasePrice: 400000, downPayment: 20, downPaymentType: "percent" },
      refinance: {
        currentLoanBalance: 250000,
        cashOutAmount: 0,
        closingCosts: 0,
        financeClosingCosts: false,
        estimatedHomeValue: null,
      },
      shared: sharedWithSentinels,
    };

    const serialized = serializeInputsForSupabase(inputs);
    const raw = JSON.parse(JSON.stringify(serialized)) as Record<string, unknown>;

    expect(raw.mode).toBe("purchase");
    expect("heloc" in raw).toBe(false);
    expect("assumption" in raw).toBe(false);
    expect("rateMeta" in raw).toBe(false);

    const restored = deserializeInputsFromSupabase(serialized);
    expect(restored.mode).toBe("purchase");
    expect(restored.heloc).toBeUndefined();
    expect(restored.assumption).toBeUndefined();
    expect(restored.rateMeta).toBeUndefined();
  });

  it("produces identical JSON for create and update Supabase persistence paths", () => {
    const purchaseInputs = {
      ...(bmP01.inputs as MortgageInputs),
      client_id: "test-client-purchase",
    } as MortgageInputs;
    const helocInputs = {
      mode: "heloc" as const,
      purchase: purchaseInputs.purchase,
      refinance: purchaseInputs.refinance,
      shared: purchaseInputs.shared,
      heloc: {
        ...DEFAULT_HELOC_INPUTS,
        drawMonths: 120,
        drawMonthsUsed: 60,
        monthlyDraw: 1000,
      },
      client_id: "test-client-heloc",
    } as MortgageInputs;

    const purchaseScenario = createScenarioData("Purchase", purchaseInputs, "user-1");
    const createPayload = toSupabaseRow(purchaseScenario, "user-1").inputs;
    const updatePayload = serializeInputsForSupabase(ensureClientId(purchaseInputs));
    // Create must serialize (clone) rather than persist the live inputs object.
    expect(createPayload).not.toBe(purchaseScenario.inputs);
    expect(createPayload).toEqual(updatePayload);

    const helocScenario = createScenarioData("HELOC", helocInputs, "user-1");
    const helocCreate = toSupabaseRow(helocScenario, "user-1").inputs;
    const helocUpdate = serializeInputsForSupabase(ensureClientId(helocInputs));
    expect(helocCreate).not.toBe(helocScenario.inputs);
    expect(helocCreate).toEqual(helocUpdate);
    expect((helocCreate as Record<string, unknown>).mode).toBe("heloc");
  });
});
