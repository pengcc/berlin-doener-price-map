import { describe, expect, it } from "vitest";
import {
  calculateAdjustedConfidence,
  calculatePriceAgeDays,
  getPriceConfidence,
  isOutdatedPrice,
} from "./confidence";

const now = new Date("2026-05-29T12:00:00Z");

describe("price confidence", () => {
  it("calculates date-only age in UTC", () => {
    expect(calculatePriceAgeDays("2026-05-20", now)).toBe(9);
  });

  it("keeps recent high-confidence records high", () => {
    expect(getPriceConfidence(85, "2026-05-20", now)).toEqual({
      ageDays: 9,
      adjustedConfidence: 85,
      confidenceLabel: "high",
      isOutdated: false,
    });
  });

  it("applies age penalties and labels medium confidence", () => {
    expect(calculateAdjustedConfidence(65, "2026-04-15", now)).toBe(60);
    expect(getPriceConfidence(65, "2026-04-15", now).confidenceLabel).toBe(
      "medium",
    );
  });

  it("labels low confidence before the outdated cutoff", () => {
    expect(getPriceConfidence(70, "2026-02-01", now)).toEqual({
      ageDays: 117,
      adjustedConfidence: 55,
      confidenceLabel: "low",
      isOutdated: false,
    });
  });

  it("marks prices older than 180 days as outdated", () => {
    expect(isOutdatedPrice("2025-11-01", now)).toBe(true);
    expect(getPriceConfidence(90, "2025-11-01", now).confidenceLabel).toBe(
      "outdated",
    );
  });
});
