import { describe, expect, it } from "vitest";
import type { DataSet } from "../data/load-data";
import { validateDataSet } from "./validate-data";

const validShop = {
  id: "example-doener-kreuzberg",
  name: "Example Döner",
  address: "Oranienstraße 1, 10999 Berlin",
  district: "Kreuzberg",
  borough: "Friedrichshain-Kreuzberg",
  lat: 52.5,
  lng: 13.42,
  status: "active" as const,
};

const validRecord = {
  id: "price-001",
  shopId: "example-doener-kreuzberg",
  observedAt: "2026-05-20",
  priceCents: 700,
  productType: "standard_doener" as const,
  sourceType: "user_submission" as const,
  confidence: 65,
};

describe("validateDataSet", () => {
  it("accepts an empty production dataset", () => {
    expect(
      validateDataSet({ shops: [], priceRecords: [], districts: [] }),
    ).toEqual({
      errors: [],
      warnings: [],
    });
  });

  it("reports duplicate ids", () => {
    const dataSet: DataSet = {
      shops: [validShop, validShop],
      priceRecords: [],
      districts: [],
    };

    expect(validateDataSet(dataSet).errors).toContainEqual(
      expect.objectContaining({
        code: "duplicate_id",
        path: "shops",
      }),
    );
  });

  it("reports price records that reference missing shops", () => {
    const dataSet: DataSet = {
      shops: [],
      priceRecords: [validRecord],
      districts: [],
    };

    expect(validateDataSet(dataSet).errors).toContainEqual(
      expect.objectContaining({
        code: "missing_shop_reference",
        path: "priceRecords[0].shopId",
      }),
    );
  });

  it("warns for stale and future prices without failing validation", () => {
    const dataSet: DataSet = {
      shops: [validShop],
      priceRecords: [
        validRecord,
        {
          ...validRecord,
          id: "price-002",
          observedAt: "2027-01-01",
        },
      ],
      districts: [],
    };

    const result = validateDataSet(dataSet, new Date("2026-12-01T12:00:00Z"));

    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "outdated_price" }),
        expect.objectContaining({ code: "future_observed_at" }),
      ]),
    );
  });
});
