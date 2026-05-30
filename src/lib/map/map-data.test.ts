import { describe, expect, it } from "vitest";
import { DEMO_DATA_DIRECTORY } from "@/lib/data/data-source";
import type { DataSet } from "@/lib/data/load-data";
import { loadDataSet } from "@/lib/data/load-data";
import {
  filterMapPricePoints,
  getMapFilterOptions,
  getMapPricePoints,
} from "./map-data";
import { getMapTileConfig } from "./tile-config";

const now = new Date("2026-05-30T12:00:00Z");

const dataSet: DataSet = {
  districts: [],
  priceRecords: [
    {
      confidence: 90,
      id: "price-alpha-standard",
      observedAt: "2026-05-20",
      priceCents: 650,
      productType: "standard_doener",
      shopId: "alpha-doener",
      sourceType: "menu_photo",
    },
    {
      confidence: 65,
      id: "price-alpha-vegan",
      observedAt: "2026-05-21",
      priceCents: 800,
      productType: "vegan_doener",
      shopId: "alpha-doener",
      sourceType: "user_submission",
    },
    {
      confidence: 40,
      id: "price-beta-standard",
      observedAt: "2026-04-10",
      priceCents: 900,
      productType: "standard_doener",
      shopId: "beta-doener",
      sourceType: "unknown",
    },
    {
      confidence: 90,
      id: "price-closed-standard",
      observedAt: "2026-05-20",
      priceCents: 700,
      productType: "standard_doener",
      shopId: "closed-doener",
      sourceType: "menu_photo",
    },
    {
      confidence: 90,
      id: "price-outdated-standard",
      observedAt: "2025-01-01",
      priceCents: 500,
      productType: "standard_doener",
      shopId: "outdated-doener",
      sourceType: "menu_photo",
    },
  ],
  shops: [
    {
      address: "Alpha Strasse 1, 10999 Berlin",
      borough: "Friedrichshain-Kreuzberg",
      district: "Kreuzberg",
      id: "alpha-doener",
      lat: 52.5,
      lng: 13.42,
      name: "Alpha Doener",
      status: "active",
    },
    {
      address: "Beta Strasse 1, 10115 Berlin",
      borough: "Mitte",
      district: "Mitte",
      id: "beta-doener",
      lat: 52.52,
      lng: 13.405,
      name: "Beta Doener",
      status: "active",
    },
    {
      address: "Closed Strasse 1, 12047 Berlin",
      borough: "Neukoelln",
      district: "Neukoelln",
      id: "closed-doener",
      lat: 52.48,
      lng: 13.44,
      status: "closed",
    },
    {
      address: "Old Strasse 1, 13353 Berlin",
      borough: "Mitte",
      district: "Wedding",
      id: "outdated-doener",
      lat: 52.55,
      lng: 13.36,
      status: "active",
    },
  ],
};

describe("map data helpers", () => {
  it("builds serializable current active map points", () => {
    const points = getMapPricePoints(dataSet, { now });

    expect(points.map((point) => point.id)).toEqual([
      "price-alpha-standard",
      "price-alpha-vegan",
      "price-beta-standard",
    ]);
    expect(points[0]).toMatchObject({
      confidenceLabel: "high",
      district: "Kreuzberg",
      lat: 52.5,
      lng: 13.42,
      priceCents: 650,
      shopName: "Alpha Doener",
    });
  });

  it("derives stable filter options", () => {
    const points = getMapPricePoints(dataSet, { now });

    expect(getMapFilterOptions(points)).toEqual({
      confidenceLabels: ["high", "medium", "low"],
      districts: ["Kreuzberg", "Mitte"],
      priceSteps: [650, 800, 900],
      productTypes: ["standard_doener", "vegan_doener"],
    });
  });

  it("filters by product, district, price range, and confidence", () => {
    const points = getMapPricePoints(dataSet, { now });

    expect(
      filterMapPricePoints(points, {
        confidence: "high",
        district: "Kreuzberg",
        maxPriceCents: 700,
        minPriceCents: 600,
        productType: "standard_doener",
      }).map((point) => point.id),
    ).toEqual(["price-alpha-standard"]);
  });

  it("keeps generated demo data available for map presentation", () => {
    const points = getMapPricePoints(loadDataSet(DEMO_DATA_DIRECTORY), { now });

    expect(points).toHaveLength(24);
    expect(new Set(points.map((point) => point.priceCents))).toEqual(
      new Set([600, 650, 700, 750, 800, 850, 900]),
    );
    expect(new Set(points.map((point) => point.confidenceLabel))).toEqual(
      new Set(["low"]),
    );
  });

  it("uses MapTiler, local OSM fallback, or no-tile config by environment", () => {
    expect(
      getMapTileConfig({ mapTilerKey: "public-key", nodeEnv: "production" }),
    ).toMatchObject({
      provider: "maptiler",
      status: "available",
    });
    expect(
      getMapTileConfig({ mapTilerKey: "", nodeEnv: "development" }),
    ).toMatchObject({
      provider: "osm",
      status: "available",
    });
    expect(
      getMapTileConfig({ mapTilerKey: "", nodeEnv: "production" }),
    ).toEqual({
      provider: "none",
      reason: "missing-maptiler-key",
      status: "unavailable",
    });
  });
});
