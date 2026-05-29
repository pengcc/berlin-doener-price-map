import { describe, expect, it } from "vitest";
import { calculateDistrictStats } from "./calculate-district-stats";
import { getDataSummary } from "./get-data-summary";
import { getLatestPrices } from "./get-latest-prices";
import { getPriceRankings } from "./get-rankings";
import type { DataSet } from "./load-data";

const now = new Date("2026-05-29T12:00:00Z");

const dataSet: DataSet = {
  shops: [
    {
      id: "alpha-doener-kreuzberg",
      name: "Alpha Döner",
      address: "Oranienstraße 1, 10999 Berlin",
      district: "Kreuzberg",
      borough: "Friedrichshain-Kreuzberg",
      lat: 52.5,
      lng: 13.42,
      status: "active",
    },
    {
      id: "beta-doener-kreuzberg",
      name: "Beta Döner",
      address: "Kottbusser Damm 1, 10967 Berlin",
      district: "Kreuzberg",
      borough: "Friedrichshain-Kreuzberg",
      lat: 52.49,
      lng: 13.42,
      status: "active",
    },
    {
      id: "charlie-doener-mitte",
      name: "Charlie Döner",
      address: "Invalidenstraße 1, 10115 Berlin",
      district: "Mitte",
      borough: "Mitte",
      lat: 52.53,
      lng: 13.38,
      status: "active",
    },
    {
      id: "delta-doener-neukoelln",
      name: "Delta Döner",
      address: "Sonnenallee 1, 12047 Berlin",
      district: "Neukölln",
      borough: "Neukölln",
      lat: 52.48,
      lng: 13.44,
      status: "active",
    },
  ],
  priceRecords: [
    {
      id: "price-alpha-old",
      shopId: "alpha-doener-kreuzberg",
      observedAt: "2026-01-01",
      priceCents: 850,
      productType: "standard_doener",
      sourceType: "manual_observation",
      confidence: 85,
    },
    {
      id: "price-alpha-001",
      shopId: "alpha-doener-kreuzberg",
      observedAt: "2026-05-20",
      priceCents: 710,
      productType: "standard_doener",
      sourceType: "user_submission",
      confidence: 70,
    },
    {
      id: "price-alpha-002",
      shopId: "alpha-doener-kreuzberg",
      observedAt: "2026-05-20",
      priceCents: 700,
      productType: "standard_doener",
      sourceType: "user_submission",
      confidence: 70,
    },
    {
      id: "price-alpha-chicken",
      shopId: "alpha-doener-kreuzberg",
      observedAt: "2026-05-21",
      priceCents: 750,
      productType: "chicken_doener",
      sourceType: "menu_photo",
      confidence: 90,
    },
    {
      id: "price-beta-001",
      shopId: "beta-doener-kreuzberg",
      observedAt: "2026-04-15",
      priceCents: 800,
      productType: "standard_doener",
      sourceType: "menu_photo",
      confidence: 90,
    },
    {
      id: "price-charlie-001",
      shopId: "charlie-doener-mitte",
      observedAt: "2026-05-25",
      priceCents: 650,
      productType: "standard_doener",
      sourceType: "menu_photo",
      confidence: 90,
    },
    {
      id: "price-delta-outdated",
      shopId: "delta-doener-neukoelln",
      observedAt: "2025-11-01",
      priceCents: 500,
      productType: "standard_doener",
      sourceType: "menu_photo",
      confidence: 90,
    },
  ],
  districts: [],
};

describe("data read models", () => {
  it("selects latest prices by shop and product with deterministic id tie-breaks", () => {
    const latestPrices = getLatestPrices(dataSet, { now });

    expect(latestPrices).toHaveLength(5);
    expect(
      latestPrices.find(
        (price) =>
          price.shopId === "alpha-doener-kreuzberg" &&
          price.productType === "standard_doener",
      ),
    ).toMatchObject({
      id: "price-alpha-002",
      priceCents: 700,
      adjustedConfidence: 70,
      confidenceLabel: "medium",
    });
  });

  it("skips price records with missing shop references in read models", () => {
    const latestPrices = getLatestPrices(
      {
        ...dataSet,
        priceRecords: [
          ...dataSet.priceRecords,
          {
            id: "price-missing-shop",
            shopId: "missing-shop",
            observedAt: "2026-05-20",
            priceCents: 100,
            productType: "standard_doener",
            sourceType: "unknown",
            confidence: 40,
          },
        ],
      },
      { now },
    );

    expect(latestPrices.map((price) => price.id)).not.toContain(
      "price-missing-shop",
    );
  });

  it("builds default standard Döner rankings without outdated prices", () => {
    const rankings = getPriceRankings(dataSet, { now });

    expect(rankings).toMatchObject({
      productType: "standard_doener",
      sampleCount: 3,
      lastUpdatedAt: "2026-05-25",
    });
    expect(rankings.cheapest.map((price) => price.id)).toEqual([
      "price-charlie-001",
      "price-alpha-002",
      "price-beta-001",
    ]);
    expect(rankings.mostExpensive[0].id).toBe("price-beta-001");
    expect(rankings.recentlyUpdated[0].id).toBe("price-charlie-001");
    expect(rankings.bestConfidence[0].id).toBe("price-charlie-001");
  });

  it("calculates district statistics from latest non-outdated standard prices", () => {
    expect(calculateDistrictStats(dataSet, { now })).toEqual([
      {
        district: "Kreuzberg",
        borough: "Friedrichshain-Kreuzberg",
        productType: "standard_doener",
        averagePriceCents: 750,
        medianPriceCents: 750,
        minPriceCents: 700,
        maxPriceCents: 800,
        sampleCount: 2,
        lastUpdatedAt: "2026-05-20",
      },
      {
        district: "Mitte",
        borough: "Mitte",
        productType: "standard_doener",
        averagePriceCents: 650,
        medianPriceCents: 650,
        minPriceCents: 650,
        maxPriceCents: 650,
        sampleCount: 1,
        lastUpdatedAt: "2026-05-25",
      },
    ]);
  });

  it("summarizes current standard price coverage", () => {
    expect(getDataSummary(dataSet, { now })).toEqual({
      shopCount: 4,
      activeShopCount: 4,
      priceRecordCount: 7,
      latestPriceCount: 5,
      currentPriceCount: 3,
      districtCount: 2,
      productType: "standard_doener",
      averagePriceCents: 717,
      minPriceCents: 650,
      maxPriceCents: 800,
      lastUpdatedAt: "2026-05-25",
    });
  });

  it("handles an empty dataset", () => {
    const emptyDataSet: DataSet = {
      shops: [],
      priceRecords: [],
      districts: [],
    };

    expect(getLatestPrices(emptyDataSet, { now })).toEqual([]);
    expect(getPriceRankings(emptyDataSet, { now })).toMatchObject({
      sampleCount: 0,
      cheapest: [],
      mostExpensive: [],
    });
    expect(calculateDistrictStats(emptyDataSet, { now })).toEqual([]);
    expect(getDataSummary(emptyDataSet, { now })).toMatchObject({
      shopCount: 0,
      currentPriceCount: 0,
      averagePriceCents: undefined,
    });
  });
});
