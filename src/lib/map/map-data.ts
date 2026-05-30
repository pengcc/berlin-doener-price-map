import type { ConfidenceLabel } from "@/lib/price/confidence";
import type { PriceRecord } from "@/lib/validation/schemas";
import {
  getLatestPrices,
  type LatestPriceOptions,
} from "../data/get-latest-prices";
import type { DataSet } from "../data/load-data";

export const BERLIN_MAP_CENTER = {
  lat: 52.52,
  lng: 13.405,
} as const;

export const BERLIN_MAP_ZOOM = 11;
export const ALL_MAP_FILTER_VALUE = "all";

export type MapProductFilter =
  | typeof ALL_MAP_FILTER_VALUE
  | PriceRecord["productType"];
export type MapConfidenceFilter =
  | typeof ALL_MAP_FILTER_VALUE
  | Exclude<ConfidenceLabel, "outdated">;

export type MapPricePoint = {
  adjustedConfidence: number;
  ageDays: number;
  borough: string;
  confidenceLabel: Exclude<ConfidenceLabel, "outdated">;
  district: string;
  id: string;
  lat: number;
  lng: number;
  observedAt: string;
  priceCents: number;
  productType: PriceRecord["productType"];
  shopAddress: string;
  shopId: string;
  shopName: string;
  sourceType: PriceRecord["sourceType"];
};

export type MapPointFilters = {
  confidence?: MapConfidenceFilter;
  district?: string;
  maxPriceCents?: number;
  minPriceCents?: number;
  productType?: MapProductFilter;
};

export type MapFilterOptions = {
  confidenceLabels: Exclude<ConfidenceLabel, "outdated">[];
  districts: string[];
  priceSteps: number[];
  productTypes: PriceRecord["productType"][];
};

const confidenceLabelOrder = ["high", "medium", "low"] as const;

function compareText(left: string, right: string) {
  return left.localeCompare(right, "de");
}

function uniqueSortedValues<T extends string>(values: T[]) {
  return Array.from(new Set(values)).sort(compareText);
}

function uniqueSortedNumbers(values: number[]) {
  return Array.from(new Set(values)).sort((left, right) => left - right);
}

export function getMapPricePoints(
  dataSet: DataSet,
  options: LatestPriceOptions = {},
): MapPricePoint[] {
  return getLatestPrices(dataSet, options)
    .filter((price) => !price.isOutdated && price.shop.status === "active")
    .map((price) => ({
      adjustedConfidence: price.adjustedConfidence,
      ageDays: price.ageDays,
      borough: price.shop.borough,
      confidenceLabel: price.confidenceLabel as Exclude<
        ConfidenceLabel,
        "outdated"
      >,
      district: price.shop.district,
      id: price.id,
      lat: price.shop.lat,
      lng: price.shop.lng,
      observedAt: price.observedAt,
      priceCents: price.priceCents,
      productType: price.productType,
      shopAddress: price.shop.address,
      shopId: price.shopId,
      shopName: price.shop.name ?? price.shop.address,
      sourceType: price.sourceType,
    }));
}

export function getMapFilterOptions(points: MapPricePoint[]): MapFilterOptions {
  const availableConfidenceLabels = new Set(
    points.map((point) => point.confidenceLabel),
  );

  return {
    confidenceLabels: confidenceLabelOrder.filter((label) =>
      availableConfidenceLabels.has(label),
    ),
    districts: uniqueSortedValues(points.map((point) => point.district)),
    priceSteps: uniqueSortedNumbers(points.map((point) => point.priceCents)),
    productTypes: uniqueSortedValues(points.map((point) => point.productType)),
  };
}

export function filterMapPricePoints(
  points: MapPricePoint[],
  filters: MapPointFilters = {},
) {
  return points.filter((point) => {
    if (
      filters.district &&
      filters.district !== ALL_MAP_FILTER_VALUE &&
      point.district !== filters.district
    ) {
      return false;
    }

    if (
      filters.productType &&
      filters.productType !== ALL_MAP_FILTER_VALUE &&
      point.productType !== filters.productType
    ) {
      return false;
    }

    if (
      filters.confidence &&
      filters.confidence !== ALL_MAP_FILTER_VALUE &&
      point.confidenceLabel !== filters.confidence
    ) {
      return false;
    }

    if (
      filters.minPriceCents !== undefined &&
      point.priceCents < filters.minPriceCents
    ) {
      return false;
    }

    if (
      filters.maxPriceCents !== undefined &&
      point.priceCents > filters.maxPriceCents
    ) {
      return false;
    }

    return true;
  });
}
