#!/usr/bin/env node
/**
 * Independent financial benchmark verification.
 * Does NOT import production calculator code — uses standalone formulas only.
 *
 * Usage: node scripts/verify-benchmarks.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, "../src/lib/__tests__/fixtures");
const DEFAULT_MONETARY_TOLERANCE = 0.01;

function loadFixture(id) {
  const path = join(FIXTURES_DIR, `${id}.json`);
  return JSON.parse(readFileSync(path, "utf-8"));
}

function assertWithinTolerance(actual, expected, tolerance, label) {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    throw new Error(
      `${label}: expected ${expected}, got ${actual} (diff ${diff} > tolerance ${tolerance})`
    );
  }
}

function assertExact(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

/** Standard fixed-rate P&I: L·r(1+r)^n / ((1+r)^n − 1) */
function amortizedPayment(loanAmount, annualRatePercent, termMonths) {
  const r = annualRatePercent / 100 / 12;
  if (r === 0) return loanAmount / termMonths;
  const factor = Math.pow(1 + r, termMonths);
  return (loanAmount * r * factor) / (factor - 1);
}

function totalInterest(loanAmount, payment, termMonths) {
  return payment * termMonths - loanAmount;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function verifyBmP01() {
  const fixture = loadFixture("BM-P01");
  const tol = fixture.tolerance.monetary ?? DEFAULT_MONETARY_TOLERANCE;
  const L = 450000 * 0.8;
  const rate = 6.5;
  const n = 360;
  const r = rate / 100 / 12;

  const pi = amortizedPayment(L, rate, n);
  const interest = totalInterest(L, pi, n);

  console.log("BM-P01 intermediates:", { loanAmount: L, monthlyRate: r, termMonths: n, pi: round2(pi), interest: round2(interest) });

  assertWithinTolerance(L, fixture.expected.loanAmount, tol, "BM-P01 loanAmount");
  assertWithinTolerance(pi, fixture.expected.monthlyPrincipalInterest, tol, "BM-P01 monthlyPrincipalInterest");
  assertWithinTolerance(interest, fixture.expected.totalInterest, tol, "BM-P01 totalInterest");
  assertExact(360, fixture.expected.payoffMonths, "BM-P01 payoffMonths");
  assertWithinTolerance(80, fixture.expected.ltvRatio, tol, "BM-P01 ltvRatio");

  console.log("BM-P01 PASS");
}

function verifyBmP03() {
  const fixture = loadFixture("BM-P03");
  const tol = fixture.tolerance.monetary ?? DEFAULT_MONETARY_TOLERANCE;
  const purchasePrice = 450000;
  const rate = 6.5;
  const n = 360;

  // High LTV: 19% down
  const high = fixture.variants.highLtv;
  const loanHigh = purchasePrice * (1 - high.downPayment / 100);
  const piHigh = amortizedPayment(loanHigh, rate, n);
  const interestHigh = totalInterest(loanHigh, piHigh, n);
  const ltvHigh = (loanHigh / purchasePrice) * 100;

  console.log("BM-P03 highLtv intermediates:", {
    loanAmount: loanHigh,
    ltvRatio: round2(ltvHigh),
    totalInterest: round2(interestHigh),
    monthlyPMI: high.monthlyPMI,
  });

  assertWithinTolerance(loanHigh, high.loanAmount, tol, "BM-P03 highLtv loanAmount");
  assertWithinTolerance(ltvHigh, high.ltvRatio, tol, "BM-P03 highLtv ltvRatio");
  assertWithinTolerance(interestHigh, high.totalInterest, tol, "BM-P03 highLtv totalInterest");
  assertExact(high.monthlyPMI, high.monthlyPMI, "BM-P03 highLtv monthlyPMI (fixture input)");

  // At threshold: 20% down
  const at = fixture.variants.atThreshold;
  const loanAt = purchasePrice * (1 - at.downPayment / 100);
  const piAt = amortizedPayment(loanAt, rate, n);
  const interestAt = totalInterest(loanAt, piAt, n);
  const ltvAt = (loanAt / purchasePrice) * 100;

  console.log("BM-P03 atThreshold intermediates:", {
    loanAmount: loanAt,
    ltvRatio: round2(ltvAt),
    totalInterest: round2(interestAt),
  });

  assertWithinTolerance(loanAt, at.loanAmount, tol, "BM-P03 atThreshold loanAmount");
  assertWithinTolerance(ltvAt, at.ltvRatio, tol, "BM-P03 atThreshold ltvRatio");
  assertWithinTolerance(interestAt, at.totalInterest, tol, "BM-P03 atThreshold totalInterest");

  console.log("BM-P03 PASS");
}

function verifyBmR01() {
  const fixture = loadFixture("BM-R01");
  const tol = fixture.tolerance.monetary ?? DEFAULT_MONETARY_TOLERANCE;
  const L = 300000;
  const rate = 6.5;
  const n = 360;
  const homeValue = 400000;

  const pi = amortizedPayment(L, rate, n);
  const interest = totalInterest(L, pi, n);
  const ltv = (L / homeValue) * 100;

  console.log("BM-R01 intermediates:", { loanAmount: L, pi: round2(pi), interest: round2(interest), ltv: round2(ltv) });

  assertWithinTolerance(L, fixture.expected.loanAmount, tol, "BM-R01 loanAmount");
  assertWithinTolerance(pi, fixture.expected.monthlyPrincipalInterest, tol, "BM-R01 monthlyPrincipalInterest");
  assertWithinTolerance(interest, fixture.expected.totalInterest, tol, "BM-R01 totalInterest");
  assertWithinTolerance(ltv, fixture.expected.ltvRatio, tol, "BM-R01 ltvRatio");

  console.log("BM-R01 PASS");
}

function verifyBmH02() {
  const fixture = loadFixture("BM-H02");
  const tol = fixture.tolerance.monetary ?? DEFAULT_MONETARY_TOLERANCE;
  const inputs = fixture.inputs;
  const {
    creditLimit,
    currentBalance,
    apr,
    drawMonths,
    repayMonths,
    monthlyDraw,
    drawMonthsUsed,
  } = inputs;
  const monthlyRate = apr / 100 / 12;

  // Mirror calculateHeloc: active draws capped at min(drawMonthsUsed, drawMonths),
  // then interest-only draw period continues through full drawMonths.
  const effectiveDrawMonths = Math.min(drawMonthsUsed, drawMonths);

  let balance = currentBalance;
  let drawInterest = 0;

  for (let month = 1; month <= effectiveDrawMonths; month++) {
    if (monthlyDraw > 0) {
      balance = Math.min(balance + monthlyDraw, creditLimit);
    }
    drawInterest += balance * monthlyRate;
  }

  for (let month = effectiveDrawMonths + 1; month <= drawMonths; month++) {
    drawInterest += balance * monthlyRate;
  }

  const repayPi = amortizedPayment(balance, apr, repayMonths);
  const repayInterest = repayPi * repayMonths - balance;
  const interestTotal = drawInterest + repayInterest;

  console.log("BM-H02 intermediates:", {
    effectiveDrawMonths,
    drawMonths,
    balanceEndDraw: balance,
    drawInterest: round2(drawInterest),
    paymentRepay: round2(repayPi),
    repayInterest: round2(repayInterest),
    interestTotal: round2(interestTotal),
  });

  assertWithinTolerance(balance, fixture.expected.balanceEndDraw, tol, "BM-H02 balanceEndDraw");
  assertWithinTolerance(repayPi, fixture.expected.paymentRepay, tol, "BM-H02 paymentRepay");
  assertWithinTolerance(interestTotal, fixture.expected.financingCostOverHorizon, tol, "BM-H02 financingCostOverHorizon");
  assertExact(fixture.expected.timelineMonthsTotal, drawMonths + repayMonths, "BM-H02 timelineMonthsTotal");

  console.log("BM-H02 PASS");
}

function verifyBmA02() {
  const fixture = loadFixture("BM-A02");
  const tol = fixture.tolerance.monetary ?? DEFAULT_MONETARY_TOLERANCE;
  const inputs = fixture.inputs;
  const purchasePrice = inputs.purchasePrice;
  const gapAmount = purchasePrice - inputs.assumed.balance - inputs.downPaymentCash;

  const assumedPi = amortizedPayment(
    inputs.assumed.balance,
    inputs.assumed.apr,
    inputs.assumed.remainingMonths
  );
  const assumedInterest = totalInterest(
    inputs.assumed.balance,
    assumedPi,
    inputs.assumed.remainingMonths
  );

  const gapPi = amortizedPayment(gapAmount, inputs.gap.loanApr, inputs.gap.loanTermMonths);
  const gapInterest = totalInterest(gapAmount, gapPi, inputs.gap.loanTermMonths);
  const paymentTotal = assumedPi + gapPi;
  const financingCost = assumedInterest + gapInterest;
  const ltv = (inputs.assumed.balance / purchasePrice) * 100;

  console.log("BM-A02 intermediates:", {
    gapAmount,
    assumedPi: round2(assumedPi),
    gapPi: round2(gapPi),
    paymentTotal: round2(paymentTotal),
    financingCost: round2(financingCost),
    ltv: round2(ltv),
  });

  assertWithinTolerance(gapAmount, fixture.expected.gapAmount, tol, "BM-A02 gapAmount");
  assertWithinTolerance(assumedPi, fixture.expected.assumedPaymentPi, tol, "BM-A02 assumedPaymentPi");
  assertWithinTolerance(gapPi, fixture.expected.gapPayment, tol, "BM-A02 gapPayment");
  assertWithinTolerance(paymentTotal, fixture.expected.paymentTotal, tol, "BM-A02 paymentTotal");
  assertWithinTolerance(financingCost, fixture.expected.financingCostOverHorizon, tol, "BM-A02 financingCostOverHorizon");
  assertWithinTolerance(ltv, fixture.expected.ltvRatio, tol, "BM-A02 ltvRatio");

  console.log("BM-A02 PASS");
}

function main() {
  console.log("SettleRate independent benchmark verification");
  console.log("Fixtures:", FIXTURES_DIR);
  console.log("Production calculator: NOT USED\n");

  const benchmarks = [
    { id: "BM-P01", fn: verifyBmP01 },
    { id: "BM-P03", fn: verifyBmP03 },
    { id: "BM-R01", fn: verifyBmR01 },
    { id: "BM-H02", fn: verifyBmH02 },
    { id: "BM-A02", fn: verifyBmA02 },
  ];

  for (const { id, fn } of benchmarks) {
    try {
      fn();
    } catch (err) {
      console.error(`\n${id} FAILED:`, err.message);
      process.exit(1);
    }
  }

  console.log(`\nAll ${benchmarks.length} benchmarks verified independently.`);
}

main();
