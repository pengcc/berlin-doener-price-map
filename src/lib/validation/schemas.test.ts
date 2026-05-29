import { describe, expect, it } from "vitest";
import {
  isIsoDate,
  priceRecordCsvRowSchema,
  priceRecordSchema,
  shopSchema,
} from "./schemas";

describe("data schemas", () => {
  it("accepts a valid shop and normalizes empty optional URLs", () => {
    const shop = shopSchema.parse({
      id: "example-doener-kreuzberg",
      name: "Example Döner",
      address: "Oranienstraße 1, 10999 Berlin",
      district: "Kreuzberg",
      borough: "Friedrichshain-Kreuzberg",
      lat: 52.5,
      lng: 13.42,
      osmUrl: "",
      websiteUrl: "",
      status: "active",
    });

    expect(shop.osmUrl).toBeUndefined();
    expect(shop.websiteUrl).toBeUndefined();
  });

  it("rejects invalid dates and coordinates", () => {
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(() =>
      shopSchema.parse({
        id: "outside-berlin",
        address: "Invalid",
        district: "Kreuzberg",
        borough: "Friedrichshain-Kreuzberg",
        lat: 51.9,
        lng: 13.42,
        status: "active",
      }),
    ).toThrow();
  });

  it("coerces CSV numeric fields for price records", () => {
    const record = priceRecordCsvRowSchema.parse({
      id: "price-001",
      shopId: "example-doener-kreuzberg",
      observedAt: "2026-05-20",
      priceCents: "700",
      productType: "standard_doener",
      sourceType: "user_submission",
      confidence: "65",
      sourceUrl: "",
      notes: "",
    });

    expect(record.priceCents).toBe(700);
    expect(record.confidence).toBe(65);
    expect(record.notes).toBeUndefined();
  });

  it("rejects impossible price values", () => {
    expect(() =>
      priceRecordSchema.parse({
        id: "price-001",
        shopId: "example-doener-kreuzberg",
        observedAt: "2026-05-20",
        priceCents: 0,
        productType: "standard_doener",
        sourceType: "user_submission",
        confidence: 65,
      }),
    ).toThrow();
  });
});
