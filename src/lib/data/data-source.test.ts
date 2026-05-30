import { describe, expect, it } from "vitest";
import { validateDataSet } from "../validation/validate-data";
import {
  DEMO_DATA_DIRECTORY,
  getDataDirectoryForMode,
  getDataMode,
  getPathForDataMode,
} from "./data-source";
import { loadDataSet } from "./load-data";

const ALLOWED_DEMO_PRICES = new Set([600, 650, 700, 750, 800, 850, 900]);

describe("data source selection", () => {
  it("defaults to production data unless demo mode is explicit", () => {
    expect(getDataMode("")).toBe("production");
    expect(getDataMode("production")).toBe("production");
    expect(getDataMode("invalid")).toBe("production");
    expect(getDataMode("demo")).toBe("demo");
  });

  it("builds stable data mode paths", () => {
    expect(getPathForDataMode("/", "production")).toBe("/");
    expect(getPathForDataMode("/prices", "production")).toBe("/prices");
    expect(getPathForDataMode("/", "demo")).toBe("/demo");
    expect(getPathForDataMode("/prices", "demo")).toBe("/demo/prices");
  });

  it("maps demo mode to separate demo data files", () => {
    expect(getDataDirectoryForMode("production")).toBe("data");
    expect(getDataDirectoryForMode("demo")).toBe(DEMO_DATA_DIRECTORY);
  });

  it("keeps generated demo data valid and visibly unverified", () => {
    const dataSet = loadDataSet(DEMO_DATA_DIRECTORY);
    const result = validateDataSet(dataSet, new Date("2026-05-30T12:00:00Z"));

    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(dataSet.shops).toHaveLength(24);
    expect(dataSet.priceRecords).toHaveLength(24);
    expect(new Set(dataSet.shops.map((shop) => shop.borough)).size).toBe(12);

    for (const record of dataSet.priceRecords) {
      expect(ALLOWED_DEMO_PRICES.has(record.priceCents)).toBe(true);
      expect(record.sourceType).toBe("unknown");
      expect(record.confidence).toBe(40);
      expect(record.notes).toContain("Unverified generated demo record");
    }
  });
});
