import { describe, expect, it } from "vitest";
import {
  createEmptyPriceIntakeRow,
  formatPriceIntakeRowsAsCsv,
  formatPriceIntakeRowsAsMarkdown,
  parseEuroPriceToCents,
  validatePriceIntakeRows,
} from "./price-intake";

describe("price intake helpers", () => {
  it("normalizes euro prices to integer cents", () => {
    expect(parseEuroPriceToCents("7")).toBe(700);
    expect(parseEuroPriceToCents("7,50")).toBe(750);
    expect(parseEuroPriceToCents("€8.05")).toBe(805);
    expect(parseEuroPriceToCents("9 EUR")).toBe(900);
    expect(parseEuroPriceToCents("0.50")).toBeUndefined();
    expect(parseEuroPriceToCents("7.999")).toBeUndefined();
  });

  it("validates required contributor fields", () => {
    const result = validatePriceIntakeRows([createEmptyPriceIntakeRow()]);

    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.field)).toEqual([
      "shopAddress",
      "observedAt",
      "priceEuro",
      "sourceContext",
    ]);
  });

  it("validates date, price, enum, and URL shape", () => {
    const row = {
      ...createEmptyPriceIntakeRow(),
      observedAt: "2026-02-30",
      priceEuro: "free",
      productType: "not-a-product",
      shopAddress: "Hauptstrasse 1, 10827 Berlin",
      sourceContext: "Counter menu",
      sourceType: "not-a-source",
      sourceUrl: "ftp://example.com/private",
    };

    expect(
      validatePriceIntakeRows([row]).errors.map((error) => error.code),
    ).toEqual([
      "invalid_date",
      "invalid_price",
      "invalid_product_type",
      "invalid_source_type",
      "invalid_url",
    ]);
  });

  it("exports valid rows as CSV and Markdown with escaping", () => {
    const row = {
      ...createEmptyPriceIntakeRow(),
      notes: "contains, comma",
      observedAt: "2026-06-01",
      priceEuro: "7.50",
      shopAddress: "Hauptstrasse 1, 10827 Berlin",
      shopName: 'A "quoted" shop',
      sourceContext: "menu | counter",
    };
    const result = validatePriceIntakeRows([row]);

    expect(result.valid).toBe(true);
    expect(formatPriceIntakeRowsAsCsv(result.normalizedRows)).toContain(
      '"A ""quoted"" shop"',
    );
    expect(formatPriceIntakeRowsAsCsv(result.normalizedRows)).toContain(
      '"contains, comma"',
    );
    expect(formatPriceIntakeRowsAsMarkdown(result.normalizedRows)).toContain(
      "menu \\| counter",
    );
  });
});
