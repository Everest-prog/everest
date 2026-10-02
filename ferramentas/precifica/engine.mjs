// Ever.Precifica — deterministic pricing engine
// Monetary values are integer cents. Percentages are basis points (100 bps = 1%).

const RATE_KEYS = ["taxes", "payment", "commission", "other"];
const BPS_SCALE = 10000n;
const CENTS_PER_REAL = 100n;

export class PricingInputError extends Error {
  constructor(code, message, field = null) {
    super(message);
    this.name = "PricingInputError";
    this.code = code;
    this.field = field;
  }
}

function requireSafeInteger(value, field, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new PricingInputError(
      "INVALID_INTEGER",
      `${field} must be a safe integer between ${min} and ${max}.`,
      field
    );
  }
  return BigInt(value);
}

function toSafeNumber(value, field = "result") {
  const max = BigInt(Number.MAX_SAFE_INTEGER);
  const min = -max;
  if (value > max || value < min) {
    throw new RangeError(`${field} exceeds JavaScript safe-integer range.`);
  }
  return Number(value);
}

function ceilDiv(numerator, denominator) {
  if (denominator <= 0n) throw new RangeError("denominator must be positive");
  if (numerator < 0n) throw new RangeError("ceilDiv expects a non-negative numerator");
  return (numerator + denominator - 1n) / denominator;
}

function roundHalfUpDiv(numerator, denominator) {
  if (denominator <= 0n) throw new RangeError("denominator must be positive");
  if (numerator < 0n) throw new RangeError("roundHalfUpDiv expects a non-negative numerator");
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  return quotient + (remainder * 2n >= denominator ? 1n : 0n);
}

function roundSignedHalfUpDiv(numerator, denominator) {
  if (numerator >= 0n) return roundHalfUpDiv(numerator, denominator);
  return -roundHalfUpDiv(-numerator, denominator);
}

function normalizeRates(ratesBps = {}) {
  const normalized = {};
  for (const key of RATE_KEYS) {
    normalized[key] = requireSafeInteger(ratesBps[key] ?? 0, `ratesBps.${key}`, {
      min: 0,
      max: 9999,
    });
  }
  return normalized;
}

function buildContext(input) {
  const directCostCents = requireSafeInteger(input.directCostCents ?? 0, "directCostCents");
  const additionalCostCents = requireSafeInteger(
    input.additionalCostCents ?? 0,
    "additionalCostCents"
  );
  const allocatedFixedCostCents = requireSafeInteger(
    input.allocatedFixedCostCents ?? 0,
    "allocatedFixedCostCents"
  );
  const fixedFeeCents = requireSafeInteger(input.fixedFeeCents ?? 0, "fixedFeeCents");

  const rates = normalizeRates(input.ratesBps);
  const totalVariableRateBps = RATE_KEYS.reduce((sum, key) => sum + rates[key], 0n);

  const desiredMarginBps = requireSafeInteger(
    input.desiredMarginBps,
    "desiredMarginBps",
    { min: 0, max: 9999 }
  );
  const minimumMarginBps = requireSafeInteger(
    input.minimumMarginBps,
    "minimumMarginBps",
    { min: 0, max: 9999 }
  );

  if (minimumMarginBps > desiredMarginBps) {
    throw new PricingInputError(
      "MIN_MARGIN_ABOVE_DESIRED",
      "minimumMarginBps cannot be greater than desiredMarginBps.",
      "minimumMarginBps"
    );
  }

  if (totalVariableRateBps >= BPS_SCALE) {
    throw new PricingInputError(
      "VARIABLE_RATE_AT_OR_ABOVE_100",
      "The sum of variable rates must be below 100%.",
      "ratesBps"
    );
  }

  if (totalVariableRateBps + desiredMarginBps >= BPS_SCALE) {
    throw new PricingInputError(
      "DESIRED_MARGIN_NOT_FEASIBLE",
      "Variable rates plus desired margin must be below 100%.",
      "desiredMarginBps"
    );
  }

  if (totalVariableRateBps + minimumMarginBps >= BPS_SCALE) {
    throw new PricingInputError(
      "MINIMUM_MARGIN_NOT_FEASIBLE",
      "Variable rates plus minimum margin must be below 100%.",
      "minimumMarginBps"
    );
  }

  const costBaseCents =
    directCostCents + additionalCostCents + allocatedFixedCostCents + fixedFeeCents;

  if (costBaseCents <= 0n) {
    throw new PricingInputError(
      "ZERO_COST_BASE",
      "At least one monetary cost must be greater than zero.",
      "directCostCents"
    );
  }

  return {
    directCostCents,
    additionalCostCents,
    allocatedFixedCostCents,
    fixedFeeCents,
    costBaseCents,
    rates,
    totalVariableRateBps,
    desiredMarginBps,
    minimumMarginBps,
  };
}

function variableChargesForPrice(ctx, priceCents) {
  const breakdown = {};
  let total = 0n;

  for (const key of RATE_KEYS) {
    const charge = roundHalfUpDiv(priceCents * ctx.rates[key], BPS_SCALE);
    breakdown[key] = charge;
    total += charge;
  }

  return { breakdown, total };
}

function meetsMargin(profitCents, priceCents, targetMarginBps) {
  return profitCents * BPS_SCALE >= priceCents * targetMarginBps;
}

function evaluatePriceInternal(ctx, priceCents) {
  const variableCharges = variableChargesForPrice(ctx, priceCents);
  const profitCents = priceCents - ctx.costBaseCents - variableCharges.total;
  const marginBps = roundSignedHalfUpDiv(profitCents * BPS_SCALE, priceCents);
  const markupX10000 = roundHalfUpDiv(priceCents * BPS_SCALE, ctx.costBaseCents);

  let status = "AT_OR_ABOVE_DESIRED";
  if (profitCents < 0n) {
    status = "LOSS";
  } else if (!meetsMargin(profitCents, priceCents, ctx.minimumMarginBps)) {
    status = "BELOW_MINIMUM";
  } else if (!meetsMargin(profitCents, priceCents, ctx.desiredMarginBps)) {
    status = "BELOW_DESIRED";
  }

  return {
    priceCents,
    variableCharges,
    profitCents,
    marginBps,
    markupX10000,
    status,
  };
}

function publicEvaluation(evaluation) {
  const breakdown = {};
  for (const key of RATE_KEYS) {
    breakdown[key] = toSafeNumber(
      evaluation.variableCharges.breakdown[key],
      `variableChargesCents.${key}`
    );
  }

  return {
    priceCents: toSafeNumber(evaluation.priceCents, "priceCents"),
    variableChargesCents: breakdown,
    totalVariableChargesCents: toSafeNumber(
      evaluation.variableCharges.total,
      "totalVariableChargesCents"
    ),
    profitCents: toSafeNumber(evaluation.profitCents, "profitCents"),
    marginBps: toSafeNumber(evaluation.marginBps, "marginBps"),
    markupX10000: toSafeNumber(evaluation.markupX10000, "markupX10000"),
    status: evaluation.status,
  };
}

function findPriceForMargin(ctx, targetMarginBps) {
  const denominator = BPS_SCALE - ctx.totalVariableRateBps - targetMarginBps;
  if (denominator <= 0n) {
    throw new PricingInputError(
      "MARGIN_NOT_FEASIBLE",
      "Variable rates plus target margin must be below 100%."
    );
  }

  let candidate = ceilDiv(ctx.costBaseCents * BPS_SCALE, denominator);

  // Component-by-component cent rounding may require a few additional cents
  // beyond the closed-form result. Search deterministically for the first
  // price that actually satisfies the target under the same rounding policy.
  const maxAdjustments = 100000;
  for (let i = 0; i <= maxAdjustments; i += 1) {
    const evaluation = evaluatePriceInternal(ctx, candidate);
    if (meetsMargin(evaluation.profitCents, candidate, targetMarginBps)) {
      return candidate;
    }
    candidate += 1n;
  }

  throw new RangeError("Unable to converge on a valid price within the adjustment limit.");
}

function roundUpToWholeReal(priceCents) {
  return ceilDiv(priceCents, CENTS_PER_REAL) * CENTS_PER_REAL;
}

function roundUpToEnding(priceCents, endingCents) {
  const ending = requireSafeInteger(endingCents, "psychologicalEndingCents", {
    min: 0,
    max: 99,
  });
  const reais = priceCents / CENTS_PER_REAL;
  let candidate = reais * CENTS_PER_REAL + ending;
  if (candidate < priceCents) candidate += CENTS_PER_REAL;
  return candidate;
}

function applyDiscountInternal(referencePriceCents, discountBps) {
  return roundHalfUpDiv(
    referencePriceCents * (BPS_SCALE - discountBps),
    BPS_SCALE
  );
}

function maxDiscountForMargin(ctx, referencePriceCents, targetMarginBps) {
  const baseEvaluation = evaluatePriceInternal(ctx, referencePriceCents);
  if (!meetsMargin(baseEvaluation.profitCents, referencePriceCents, targetMarginBps)) {
    return 0n;
  }

  let maximum = 0n;
  for (let discount = 1n; discount <= BPS_SCALE; discount += 1n) {
    const discountedPrice = applyDiscountInternal(referencePriceCents, discount);
    if (discountedPrice <= 0n) continue;
    const evaluation = evaluatePriceInternal(ctx, discountedPrice);
    if (meetsMargin(evaluation.profitCents, discountedPrice, targetMarginBps)) {
      maximum = discount;
    }
  }
  return maximum;
}

export function allocateProductFixedCostCents(monthlyFixedCostCents, expectedUnits) {
  const monthly = requireSafeInteger(monthlyFixedCostCents, "monthlyFixedCostCents");
  const units = requireSafeInteger(expectedUnits, "expectedUnits", {
    min: 1,
    max: Number.MAX_SAFE_INTEGER,
  });
  return toSafeNumber(ceilDiv(monthly, units), "allocatedFixedCostCents");
}

export function allocateServiceFixedCostCents(
  monthlyFixedCostCents,
  billableMinutes,
  serviceMinutes
) {
  const monthly = requireSafeInteger(monthlyFixedCostCents, "monthlyFixedCostCents");
  const capacity = requireSafeInteger(billableMinutes, "billableMinutes", {
    min: 1,
    max: Number.MAX_SAFE_INTEGER,
  });
  const consumed = requireSafeInteger(serviceMinutes, "serviceMinutes", {
    min: 0,
    max: Number.MAX_SAFE_INTEGER,
  });

  return toSafeNumber(
    ceilDiv(monthly * consumed, capacity),
    "allocatedServiceFixedCostCents"
  );
}

export function evaluatePrice(input, priceCents) {
  const ctx = buildContext(input);
  const price = requireSafeInteger(priceCents, "priceCents", {
    min: 1,
    max: Number.MAX_SAFE_INTEGER,
  });
  return publicEvaluation(evaluatePriceInternal(ctx, price));
}

export function simulateDiscount(input, referencePriceCents, discountBps) {
  const ctx = buildContext(input);
  const reference = requireSafeInteger(referencePriceCents, "referencePriceCents", {
    min: 1,
    max: Number.MAX_SAFE_INTEGER,
  });
  const discount = requireSafeInteger(discountBps, "discountBps", {
    min: 0,
    max: 10000,
  });
  const discountedPrice = applyDiscountInternal(reference, discount);

  if (discountedPrice <= 0n) {
    return {
      discountBps: toSafeNumber(discount, "discountBps"),
      referencePriceCents: toSafeNumber(reference, "referencePriceCents"),
      discountedPriceCents: 0,
      evaluation: null,
      status: "ZERO_PRICE",
    };
  }

  return {
    discountBps: toSafeNumber(discount, "discountBps"),
    referencePriceCents: toSafeNumber(reference, "referencePriceCents"),
    discountedPriceCents: toSafeNumber(discountedPrice, "discountedPriceCents"),
    evaluation: publicEvaluation(evaluatePriceInternal(ctx, discountedPrice)),
    status: "OK",
  };
}

export function calculateDiscountLimits(input, referencePriceCents) {
  const ctx = buildContext(input);
  const reference = requireSafeInteger(referencePriceCents, "referencePriceCents", {
    min: 1,
    max: Number.MAX_SAFE_INTEGER,
  });

  return {
    referencePriceCents: toSafeNumber(reference, "referencePriceCents"),
    preserveDesiredMarginBps: toSafeNumber(
      maxDiscountForMargin(ctx, reference, ctx.desiredMarginBps),
      "preserveDesiredMarginBps"
    ),
    maximumSafeDiscountBps: toSafeNumber(
      maxDiscountForMargin(ctx, reference, ctx.minimumMarginBps),
      "maximumSafeDiscountBps"
    ),
  };
}

export function calculatePricing(input) {
  const ctx = buildContext(input);

  const breakEvenPrice = findPriceForMargin(ctx, 0n);
  const technicalPrice = findPriceForMargin(ctx, ctx.desiredMarginBps);
  const commercialPrice = roundUpToWholeReal(technicalPrice);
  const psychologicalEndingCents = input.psychologicalEndingCents ?? 90;
  const psychologicalPrice = roundUpToEnding(
    technicalPrice,
    psychologicalEndingCents
  );

  const result = {
    policy: {
      moneyUnit: "cent",
      rateUnit: "basis-point",
      percentagePrecision: "0.01 percentage point",
      variableChargeRounding: "half-up per component to cent",
      fixedCostAllocationRounding: "up to cent",
      targetPriceRounding: "up until target margin is actually met",
    },
    costBaseCents: toSafeNumber(ctx.costBaseCents, "costBaseCents"),
    totalVariableRateBps: toSafeNumber(
      ctx.totalVariableRateBps,
      "totalVariableRateBps"
    ),
    breakEven: publicEvaluation(evaluatePriceInternal(ctx, breakEvenPrice)),
    technical: publicEvaluation(evaluatePriceInternal(ctx, technicalPrice)),
    commercial: publicEvaluation(evaluatePriceInternal(ctx, commercialPrice)),
    psychological: publicEvaluation(
      evaluatePriceInternal(ctx, psychologicalPrice)
    ),
  };

  if (input.currentPriceCents != null) {
    const current = requireSafeInteger(input.currentPriceCents, "currentPriceCents", {
      min: 1,
      max: Number.MAX_SAFE_INTEGER,
    });
    const currentEvaluation = evaluatePriceInternal(ctx, current);
    result.current = publicEvaluation(currentEvaluation);
    result.current.gapToTechnicalCents = toSafeNumber(
      technicalPrice - current,
      "gapToTechnicalCents"
    );
  }

  const discountReference =
    input.discountReferencePriceCents ??
    input.currentPriceCents ??
    toSafeNumber(psychologicalPrice, "psychologicalPriceCents");

  result.discountLimits = calculateDiscountLimits(input, discountReference);

  if (input.discountBps != null) {
    result.discountSimulation = simulateDiscount(
      input,
      discountReference,
      input.discountBps
    );
  }

  return result;
}
