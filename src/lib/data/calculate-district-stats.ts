import type { PriceRecord } from "../validation/schemas";
import { getLatestPrices, type LatestPriceOptions } from "./get-latest-prices";
import type { DataSet } from "./load-data";

const DEFAULT_PRODUCT_TYPE =
  "standard_doener" satisfies PriceRecord["productType"];

export type DistrictStatsOptions = LatestPriceOptions & {
  productType?: PriceRecord["productType"];
  includeOutdated?: boolean;
};

export type DistrictStats = {
  district: string;
  borough: string;
  productType: PriceRecord["productType"];
  averagePriceCents: number;
  medianPriceCents: number;
  minPriceCents: number;
  maxPriceCents: number;
  sampleCount: number;
  lastUpdatedAt: string;
};

type DistrictBucket = {
  district: string;
  borough: string;
  prices: number[];
  lastUpdatedAt: string;
};

function averagePriceCents(prices: number[]) {
  return Math.round(
    prices.reduce((total, price) => total + price, 0) / prices.length,
  );
}

function medianPriceCents(prices: number[]) {
  const sortedPrices = [...prices].sort((left, right) => left - right);
  const middle = Math.floor(sortedPrices.length / 2);

  if (sortedPrices.length % 2 === 1) {
    return sortedPrices[middle];
  }

  return Math.round((sortedPrices[middle - 1] + sortedPrices[middle]) / 2);
}

export function calculateDistrictStats(
  dataSet: DataSet,
  options: DistrictStatsOptions = {},
): DistrictStats[] {
  const productType = options.productType ?? DEFAULT_PRODUCT_TYPE;
  const buckets = new Map<string, DistrictBucket>();

  for (const price of getLatestPrices(dataSet, { now: options.now })) {
    if (
      price.productType !== productType ||
      (!options.includeOutdated && price.isOutdated)
    ) {
      continue;
    }

    const key = price.shop.district;
    const bucket = buckets.get(key) ?? {
      district: price.shop.district,
      borough: price.shop.borough,
      prices: [],
      lastUpdatedAt: price.observedAt,
    };

    bucket.prices.push(price.priceCents);

    if (price.observedAt > bucket.lastUpdatedAt) {
      bucket.lastUpdatedAt = price.observedAt;
    }

    buckets.set(key, bucket);
  }

  return Array.from(buckets.values())
    .map((bucket) => ({
      district: bucket.district,
      borough: bucket.borough,
      productType,
      averagePriceCents: averagePriceCents(bucket.prices),
      medianPriceCents: medianPriceCents(bucket.prices),
      minPriceCents: Math.min(...bucket.prices),
      maxPriceCents: Math.max(...bucket.prices),
      sampleCount: bucket.prices.length,
      lastUpdatedAt: bucket.lastUpdatedAt,
    }))
    .sort((left, right) => left.district.localeCompare(right.district, "de"));
}
