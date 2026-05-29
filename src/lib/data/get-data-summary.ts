import type { PriceRecord } from "../validation/schemas";
import {
  calculateDistrictStats,
  type DistrictStatsOptions,
} from "./calculate-district-stats";
import {
  getLatestPrices,
  type LatestPrice,
  type LatestPriceOptions,
} from "./get-latest-prices";
import type { DataSet } from "./load-data";

const DEFAULT_PRODUCT_TYPE =
  "standard_doener" satisfies PriceRecord["productType"];

export type DataSummaryOptions = LatestPriceOptions & {
  productType?: PriceRecord["productType"];
};

export type DataSummary = {
  shopCount: number;
  activeShopCount: number;
  priceRecordCount: number;
  latestPriceCount: number;
  currentPriceCount: number;
  districtCount: number;
  productType: PriceRecord["productType"];
  averagePriceCents?: number;
  minPriceCents?: number;
  maxPriceCents?: number;
  lastUpdatedAt?: string;
};

function averagePriceCents(prices: LatestPrice[]) {
  if (prices.length === 0) {
    return undefined;
  }

  return Math.round(
    prices.reduce((total, price) => total + price.priceCents, 0) /
      prices.length,
  );
}

function lastUpdatedAt(prices: LatestPrice[]) {
  return prices.reduce<string | undefined>((lastUpdated, price) => {
    if (!lastUpdated || price.observedAt > lastUpdated) {
      return price.observedAt;
    }

    return lastUpdated;
  }, undefined);
}

function getCurrentPrices(dataSet: DataSet, options: DistrictStatsOptions) {
  const productType = options.productType ?? DEFAULT_PRODUCT_TYPE;

  return getLatestPrices(dataSet, { now: options.now }).filter(
    (price) => price.productType === productType && !price.isOutdated,
  );
}

export function getDataSummary(
  dataSet: DataSet,
  options: DataSummaryOptions = {},
): DataSummary {
  const productType = options.productType ?? DEFAULT_PRODUCT_TYPE;
  const latestPrices = getLatestPrices(dataSet, { now: options.now });
  const currentPrices = getCurrentPrices(dataSet, {
    now: options.now,
    productType,
  });

  return {
    shopCount: dataSet.shops.length,
    activeShopCount: dataSet.shops.filter((shop) => shop.status === "active")
      .length,
    priceRecordCount: dataSet.priceRecords.length,
    latestPriceCount: latestPrices.length,
    currentPriceCount: currentPrices.length,
    districtCount: calculateDistrictStats(dataSet, {
      now: options.now,
      productType,
    }).length,
    productType,
    averagePriceCents: averagePriceCents(currentPrices),
    minPriceCents:
      currentPrices.length > 0
        ? Math.min(...currentPrices.map((price) => price.priceCents))
        : undefined,
    maxPriceCents:
      currentPrices.length > 0
        ? Math.max(...currentPrices.map((price) => price.priceCents))
        : undefined,
    lastUpdatedAt: lastUpdatedAt(currentPrices),
  };
}
