import { describe, expect, it } from "vitest";
import { coerceOptionalInterestRate } from "@/lib/coerceOptionalInterestRate";
import {
  DEFAULT_INPUTS,
  type MortgageInputs,
  type RefinanceInputs as RefinanceInputsType,
} from "@/lib/mortgage";

/**
 * Mirrors RefinanceInputs.updateRefinance → onBatchUpdate for the rate field.
 */
function applyCurrentInterestRateUpdate(
  inputs: MortgageInputs,
  rawValue: number | null | undefined
): MortgageInputs {
  const updates: Partial<RefinanceInputsType> = {
    currentInterestRate: coerceOptionalInterestRate(rawValue),
  };
  return {
    ...inputs,
    refinance: { ...inputs.refinance, ...updates },
  };
}

describe("refinance currentInterestRate input coercion", () => {
  it("preserves explicit 0% through the input update path", () => {
    const base: MortgageInputs = {
      ...DEFAULT_INPUTS,
      mode: "refinance",
      refinance: {
        ...DEFAULT_INPUTS.refinance,
        currentInterestRate: null,
        currentRemainingTermMonths: 300,
      },
    };

    const updated = applyCurrentInterestRateUpdate(base, 0);

    expect(updated.refinance.currentInterestRate).toBe(0);
    expect(updated.refinance.currentInterestRate).not.toBeNull();
  });

  it("keeps null/undefined as empty (null)", () => {
    expect(coerceOptionalInterestRate(null)).toBeNull();
    expect(coerceOptionalInterestRate(undefined)).toBeNull();
    expect(coerceOptionalInterestRate(Number.NaN)).toBeNull();
  });

  it("preserves positive rates unchanged", () => {
    expect(coerceOptionalInterestRate(7.5)).toBe(7.5);
  });
});
