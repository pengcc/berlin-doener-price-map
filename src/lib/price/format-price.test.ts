import { describe, expect, it } from "vitest";
import { formatPriceCents } from "./format-price";

describe("formatPriceCents", () => {
  it("formats integer cents as euros", () => {
    expect(formatPriceCents(750, "de-DE")).toBe("7,50 €");
  });
});
