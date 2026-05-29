export const OUTDATED_PRICE_DAYS = 180;

const RECENT_PRICE_DAYS = 30;
const HIGH_CONFIDENCE_MAX_DAYS = 90;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export type ConfidenceLabel = "high" | "medium" | "low" | "outdated";

export type PriceConfidence = {
  ageDays: number;
  adjustedConfidence: number;
  confidenceLabel: ConfidenceLabel;
  isOutdated: boolean;
};

function clampConfidence(value: number) {
  return Math.max(0, Math.min(100, value));
}

function dateOnlyUtc(value: Date) {
  return Date.UTC(
    value.getUTCFullYear(),
    value.getUTCMonth(),
    value.getUTCDate(),
  );
}

export function isoDateToUtc(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function calculatePriceAgeDays(observedAt: string, now = new Date()) {
  return Math.floor(
    (dateOnlyUtc(now) - isoDateToUtc(observedAt)) / MILLISECONDS_PER_DAY,
  );
}

export function calculateConfidencePenalty(ageDays: number) {
  if (ageDays <= RECENT_PRICE_DAYS) {
    return 0;
  }

  if (ageDays <= HIGH_CONFIDENCE_MAX_DAYS) {
    return 5;
  }

  return 15;
}

export function calculateAdjustedConfidence(
  baseConfidence: number,
  observedAt: string,
  now = new Date(),
) {
  return clampConfidence(
    baseConfidence -
      calculateConfidencePenalty(calculatePriceAgeDays(observedAt, now)),
  );
}

export function isOutdatedPrice(observedAt: string, now = new Date()) {
  return calculatePriceAgeDays(observedAt, now) > OUTDATED_PRICE_DAYS;
}

export function getPriceConfidence(
  baseConfidence: number,
  observedAt: string,
  now = new Date(),
): PriceConfidence {
  const ageDays = calculatePriceAgeDays(observedAt, now);
  const adjustedConfidence = clampConfidence(
    baseConfidence - calculateConfidencePenalty(ageDays),
  );
  const isOutdated = ageDays > OUTDATED_PRICE_DAYS;

  if (isOutdated) {
    return {
      ageDays,
      adjustedConfidence,
      confidenceLabel: "outdated",
      isOutdated,
    };
  }

  if (adjustedConfidence >= 80 && ageDays <= HIGH_CONFIDENCE_MAX_DAYS) {
    return {
      ageDays,
      adjustedConfidence,
      confidenceLabel: "high",
      isOutdated,
    };
  }

  if (adjustedConfidence >= 60 && ageDays <= OUTDATED_PRICE_DAYS) {
    return {
      ageDays,
      adjustedConfidence,
      confidenceLabel: "medium",
      isOutdated,
    };
  }

  return {
    ageDays,
    adjustedConfidence,
    confidenceLabel: "low",
    isOutdated,
  };
}
