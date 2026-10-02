import test from "node:test";
import assert from "node:assert/strict";

import {
  PricingInputError,
  allocateProductFixedCostCents,
  allocateServiceFixedCostCents,
  calculateDiscountLimits,
  calculatePricing,
  evaluatePrice,
  simulateDiscount,
} from "../ferramentas/precifica/engine.mjs";

const baseInput = {
  directCostCents: 5000,
  additionalCostCents: 0,
  allocatedFixedCostCents: 0,
  fixedFeeCents: 0,
  ratesBps: {
    taxes: 0,
    payment: 0,
    commission: 0,
    other: 0,
  },
  desiredMarginBps: 2500,
  minimumMarginBps: 1000,
};

test("allocates product fixed costs by expected units, rounding up", () => {
  assert.equal(allocateProductFixedCostCents(500000, 500), 1000);
  assert.equal(allocateProductFixedCostCents(10000, 3), 3334);
});

test("allocates service fixed costs by billable time", () => {
  // R$ 6.000 / 120h * 3h = R$ 150
  assert.equal(allocateServiceFixedCostCents(600000, 7200, 180), 15000);
});

test("calculates deterministic target prices without variable rates", () => {
  const result = calculatePricing(baseInput);

  assert.equal(result.costBaseCents, 5000);
  assert.equal(result.breakEven.priceCents, 5000);
  assert.equal(result.technical.priceCents, 6667);
  assert.equal(result.technical.status, "AT_OR_ABOVE_DESIRED");
  assert.equal(result.commercial.priceCents, 6700);
  assert.equal(result.psychological.priceCents, 6690);
  assert.ok(result.technical.marginBps >= 2500);
});

test("supports a configurable psychological ending", () => {
  const result = calculatePricing({
    ...baseInput,
    psychologicalEndingCents: 99,
  });

  assert.equal(result.psychological.priceCents, 6699);
});

test("diagnoses current prices using the configured margin bands", () => {
  assert.equal(evaluatePrice(baseInput, 4900).status, "LOSS");
  assert.equal(evaluatePrice(baseInput, 5400).status, "BELOW_MINIMUM");
  assert.equal(evaluatePrice(baseInput, 6000).status, "BELOW_DESIRED");
  assert.equal(evaluatePrice(baseInput, 7000).status, "AT_OR_ABOVE_DESIRED");
});

test("returns the gap from current price to technical target", () => {
  const result = calculatePricing({
    ...baseInput,
    currentPriceCents: 6000,
  });

  assert.equal(result.current.priceCents, 6000);
  assert.equal(result.current.gapToTechnicalCents, 667);
  assert.equal(result.current.status, "BELOW_DESIRED");
});

test("preserves the variable-rate breakdown and rounds each component half-up", () => {
  const input = {
    ...baseInput,
    directCostCents: 50,
    desiredMarginBps: 0,
    minimumMarginBps: 0,
    ratesBps: {
      taxes: 50,
      payment: 0,
      commission: 0,
      other: 0,
    },
  };

  const evaluation = evaluatePrice(input, 100);
  assert.equal(evaluation.variableChargesCents.taxes, 1);
  assert.equal(evaluation.totalVariableChargesCents, 1);
  assert.equal(evaluation.profitCents, 49);
});

test("sums variable rates but still verifies the realized target after cent rounding", () => {
  const result = calculatePricing({
    ...baseInput,
    ratesBps: {
      taxes: 600,
      payment: 320,
      commission: 1200,
      other: 100,
    },
  });

  assert.equal(result.totalVariableRateBps, 2220);
  assert.equal(result.technical.status, "AT_OR_ABOVE_DESIRED");
  assert.ok(result.technical.marginBps >= 2500);
  assert.ok(result.breakEven.profitCents >= 0);
});

test("calculates desired-margin and minimum-margin discount limits", () => {
  const limits = calculateDiscountLimits(baseInput, 10000);

  assert.equal(limits.preserveDesiredMarginBps, 3333);
  assert.equal(limits.maximumSafeDiscountBps, 4444);
});

test("simulates a discount and classifies the resulting price", () => {
  const simulation = simulateDiscount(baseInput, 10000, 4500);

  assert.equal(simulation.discountedPriceCents, 5500);
  assert.equal(simulation.evaluation.profitCents, 500);
  assert.equal(simulation.evaluation.status, "BELOW_MINIMUM");
});

test("reports markup as a secondary factor without using it as an input", () => {
  const evaluation = evaluatePrice(
    {
      ...baseInput,
      desiredMarginBps: 0,
      minimumMarginBps: 0,
    },
    10000
  );

  assert.equal(evaluation.markupX10000, 20000);
});

test("rejects minimum margin above desired margin", () => {
  assert.throws(
    () =>
      calculatePricing({
        ...baseInput,
        desiredMarginBps: 1000,
        minimumMarginBps: 1500,
      }),
    (error) =>
      error instanceof PricingInputError &&
      error.code === "MIN_MARGIN_ABOVE_DESIRED"
  );
});

test("rejects variable rates plus desired margin at or above 100%", () => {
  assert.throws(
    () =>
      calculatePricing({
        ...baseInput,
        ratesBps: {
          taxes: 8000,
          payment: 0,
          commission: 0,
          other: 0,
        },
      }),
    (error) =>
      error instanceof PricingInputError &&
      error.code === "DESIRED_MARGIN_NOT_FEASIBLE"
  );
});

test("rejects a zero cost base because a price cannot be derived from margin alone", () => {
  assert.throws(
    () =>
      calculatePricing({
        ...baseInput,
        directCostCents: 0,
      }),
    (error) =>
      error instanceof PricingInputError && error.code === "ZERO_COST_BASE"
  );
});
