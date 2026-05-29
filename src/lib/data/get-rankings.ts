import type { PriceRecord } from "../validation/schemas";
import {
  getLatestPrices,
  type LatestPrice,
  type LatestPriceOptions,
} from "./get-latest-prices";
import type { DataSet } from "./load-data";

const DEFAULT_PRODUCT_TYPE =
  "standard_doener" satisfies PriceRecord["productType"];

export type PriceRankingsOptions = LatestPriceOptions & {
  productType?: PriceRecord["productType"];
  includeOutdated?: boolean;
  limit?: number;
};

export type PriceRankings = {
  productType: PriceRecord["productType"];
  sampleCount: number;
  lastUpdatedAt?: string;
  cheapest: LatestPrice[];
  mostExpensive: LatestPrice[];
  recentlyUpdated: LatestPrice[];
  bestConfidence: LatestPrice[];
};

function newestFirst(left: LatestPrice, right: LatestPrice) {
  if (left.observedAt !== right.observedAt) {
    return right.observedAt.localeCompare(left.observedAt);
  }

  return right.id.localeCompare(left.id);
}

function cheapestFirst(left: LatestPrice, right: LatestPrice) {
  if (left.priceCents !== right.priceCents) {
    return left.priceCents - right.priceCents;
  }

  return newestFirst(left, right);
}

function mostExpensiveFirst(left: LatestPrice, right: LatestPrice) {
  if (left.priceCents !== right.priceCents) {
    return right.priceCents - left.priceCents;
  }

  return newestFirst(left, right);
}

function bestConfidenceFirst(left: LatestPrice, right: LatestPrice) {
  if (left.adjustedConfidence !== right.adjustedConfidence) {
    return right.adjustedConfidence - left.adjustedConfidence;
  }

  return newestFirst(left, right);
}

function limitResults(prices: LatestPrice[], limit?: number) {
  if (limit === undefined) {
    return prices;
  }

  return prices.slice(0, limit);
}

function getLastUpdatedAt(prices: LatestPrice[]) {
  return prices.reduce<string | undefined>((lastUpdatedAt, price) => {
    if (!lastUpdatedAt || price.observedAt > lastUpdatedAt) {
      return price.observedAt;
    }

    return lastUpdatedAt;
  }, undefined);
}

export function getPriceRankings(
  dataSet: DataSet,
  options: PriceRankingsOptions = {},
): PriceRankings {
  const productType = options.productType ?? DEFAULT_PRODUCT_TYPE;
  const prices = getLatestPrices(dataSet, { now: options.now }).filter(
    (price) =>
      price.productType === productType &&
      (options.includeOutdated || !price.isOutdated),
  );

  return {
    productType,
    sampleCount: prices.length,
    lastUpdatedAt: getLastUpdatedAt(prices),
    cheapest: limitResults([...prices].sort(cheapestFirst), options.limit),
    mostExpensive: limitResults(
      [...prices].sort(mostExpensiveFirst),
      options.limit,
    ),
    recentlyUpdated: limitResults([...prices].sort(newestFirst), options.limit),
    bestConfidence: limitResults(
      [...prices].sort(bestConfidenceFirst),
      options.limit,
    ),
  };
}
