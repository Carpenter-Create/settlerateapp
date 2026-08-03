/**
 * Shared types and helpers for financial benchmark fixtures.
 */

import type { MortgageInputs } from "@/lib/mortgage";
import type { ScenarioAssumptions } from "@/lib/scenarioContract";

export type BenchmarkStatus =
  | "active"
  | "pending-v2"
  | "regression"
  | "specification-only";

export interface BenchmarkTolerance {
  monetary: number;
  months?: number;
  rate?: number;
}

export interface VerificationMetadata {
  method: string;
  verificationDate: string;
  intermediates?: Record<string, number>;
  notes?: string;
}

export interface FinancingCostComponents {
  interest: number;
  mortgageInsurance?: number;
  fees?: number;
  discountPoints?: number;
  otherBorrowingCosts?: number;
  excludesPrincipal: true;
}

export interface BenchmarkFixture {
  id: string;
  description: string;
  scenarioType: string;
  status: BenchmarkStatus;
  calculatorVersionTarget: string;
  inputs?: MortgageInputs | Record<string, unknown>;
  assumptions?: ScenarioAssumptions;
  expected: Record<string, number | boolean | null | string>;
  financingCostComponents?: FinancingCostComponents;
  tolerance: BenchmarkTolerance;
  verification: VerificationMetadata;
  defectIds?: string[];
  remediationPhase?: string;
  currentBehaviorNotes?: string;
}

export const DEFAULT_MONETARY_TOLERANCE = 0.01;

export function assertWithinTolerance(
  actual: number,
  expected: number,
  tolerance: number = DEFAULT_MONETARY_TOLERANCE,
  label?: string
): void {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    throw new Error(
      `${label ?? "value"}: expected ${expected}, got ${actual} (diff ${diff} > tolerance ${tolerance})`
    );
  }
}

export function loadFixture<T extends BenchmarkFixture>(fixture: T): T {
  return fixture;
}
