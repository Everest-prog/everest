import test from "node:test";
import assert from "node:assert/strict";
import {
  calculatePricing,
  calculateDiscountLimits,
  simulateDiscount,
} from "../ferramentas/precifica/engine.mjs";
import { DEMO_CASES, DEMO_STEPS } from "../demos/precifica/cases.mjs";

test("Both approved demo cases cover all eight guided steps", () => {
  assert.equal(DEMO_STEPS.length, 8);
  assert.deepEqual(Object.keys(DEMO_CASES), ["product", "service"]);
  for (const item of Object.values(DEMO_CASES)) {
    assert.ok(item.name);
    assert.ok(item.question);
    assert.equal(item.input.currentPriceCents, item.currentPriceCents);
    assert.equal(item.input.desiredMarginBps, item.desiredMarginBps);
    assert.equal(item.input.minimumMarginBps, item.minimumMarginBps);
    assert.deepEqual(item.input.ratesBps, item.ratesBps);
    assert.equal(item.input.additionalCostCents, item.extras.primaryCents + item.extras.secondaryCents);
    assert.equal(item.input.fixedFeeCents, item.extras.fixedFeeCents);
  }
});

test("Product demo uses real engine and discloses below-minimum current margin", () => {
  const result = calculatePricing(DEMO_CASES.product.input);
  assert.equal(result.costBaseCents, 4600);
  assert.equal(result.technical.priceCents, 6970);
  assert.equal(result.commercial.priceCents, 7000);
  assert.equal(result.commercial.profitCents, 1770);
  assert.equal(result.current.priceCents, 5990);
  assert.equal(result.current.profitCents, 851);
  assert.equal(result.current.marginBps, 1421);
  assert.equal(result.current.status, "BELOW_MINIMUM");
  const discount = simulateDiscount(DEMO_CASES.product.input, result.commercial.priceCents, 1000);
  assert.equal(discount.discountedPriceCents, 6300);
  assert.equal(discount.evaluation.profitCents, 1133);
  assert.equal(discount.evaluation.marginBps, 1798);
  const limits = calculateDiscountLimits(DEMO_CASES.product.input, result.commercial.priceCents);
  assert.equal(limits.maximumSafeDiscountBps, 1353);
});

test("Service demo uses hourly and billable capacity calculations", () => {
  const result = calculatePricing(DEMO_CASES.service.input);
  assert.equal(result.costBaseCents, 6700);
  assert.equal(result.technical.priceCents, 10983);
  assert.equal(result.commercial.priceCents, 11000);
  assert.equal(result.commercial.profitCents, 3310);
  assert.equal(result.current.priceCents, 9500);
  assert.equal(result.current.profitCents, 1945);
  assert.equal(result.current.marginBps, 2047);
  assert.equal(result.current.status, "BELOW_DESIRED");
  const discount = simulateDiscount(DEMO_CASES.service.input, result.commercial.priceCents, 1000);
  assert.equal(discount.discountedPriceCents, 9900);
  assert.equal(discount.evaluation.profitCents, 2309);
  assert.equal(discount.evaluation.marginBps, 2332);
  const limits = calculateDiscountLimits(DEMO_CASES.service.input, result.commercial.priceCents);
  assert.equal(limits.maximumSafeDiscountBps, 1421);
});

test("Demo records contain no purchaser identity, auth token or analytics binding", () => {
  for (const example of Object.values(DEMO_CASES)) {
    const keys = Object.keys(example);
    assert.ok(!keys.some((key) => /email|password|token|entitlement|session/i.test(key)));
  }
});
