"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/data/empty-state";
import type { Locale } from "@/i18n/routing";
import { formatCurrency, formatInteger } from "@/lib/i18n/format";
import {
  ALL_MAP_FILTER_VALUE,
  filterMapPricePoints,
  getMapFilterOptions,
  type MapConfidenceFilter,
  type MapPricePoint,
  type MapProductFilter,
} from "@/lib/map/map-data";
import { getMapTileConfig } from "@/lib/map/tile-config";

const LeafletMap = dynamic(
  () => import("./leaflet-map").then((module) => module.LeafletMap),
  { ssr: false },
);

type Props = {
  locale: Locale;
  points: MapPricePoint[];
};

const DEFAULT_PRODUCT_FILTER = "standard_doener" satisfies MapProductFilter;

function parsePriceFilter(value: string) {
  return value === ALL_MAP_FILTER_VALUE ? undefined : Number(value);
}

export function MapExperience({ locale, points }: Props) {
  const t = useTranslations("MapPage");
  const labels = useTranslations("Labels");
  const tileConfig = getMapTileConfig();
  const options = useMemo(() => getMapFilterOptions(points), [points]);
  const [district, setDistrict] = useState(ALL_MAP_FILTER_VALUE);
  const [productType, setProductType] = useState<MapProductFilter>(
    DEFAULT_PRODUCT_FILTER,
  );
  const [confidence, setConfidence] =
    useState<MapConfidenceFilter>(ALL_MAP_FILTER_VALUE);
  const [minPriceCents, setMinPriceCents] = useState(ALL_MAP_FILTER_VALUE);
  const [maxPriceCents, setMaxPriceCents] = useState(ALL_MAP_FILTER_VALUE);

  const productOptions = options.productTypes.includes(DEFAULT_PRODUCT_FILTER)
    ? options.productTypes
    : [DEFAULT_PRODUCT_FILTER, ...options.productTypes];

  const visiblePoints = useMemo(
    () =>
      filterMapPricePoints(points, {
        confidence,
        district,
        maxPriceCents: parsePriceFilter(maxPriceCents),
        minPriceCents: parsePriceFilter(minPriceCents),
        productType,
      }),
    [confidence, district, maxPriceCents, minPriceCents, points, productType],
  );

  function resetFilters() {
    setDistrict(ALL_MAP_FILTER_VALUE);
    setProductType(DEFAULT_PRODUCT_FILTER);
    setConfidence(ALL_MAP_FILTER_VALUE);
    setMinPriceCents(ALL_MAP_FILTER_VALUE);
    setMaxPriceCents(ALL_MAP_FILTER_VALUE);
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(260px,320px)_1fr]">
      <aside className="border border-neutral-900/10 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-xl">{t("filters.title")}</h2>
            <p className="mt-1 text-neutral-600 text-sm leading-6">
              {t("filters.summary", {
                shown: formatInteger(visiblePoints.length, locale),
                total: formatInteger(points.length, locale),
              })}
            </p>
          </div>
          <button
            className="min-h-9 border border-neutral-900/15 px-3 font-medium text-neutral-700 text-sm hover:border-neutral-950"
            onClick={resetFilters}
            type="button"
          >
            {t("filters.reset")}
          </button>
        </div>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-neutral-800">
              {t("filters.product")}
            </span>
            <select
              className="min-h-11 border border-neutral-900/15 bg-white px-3 text-neutral-900"
              onChange={(event) =>
                setProductType(event.target.value as MapProductFilter)
              }
              value={productType}
            >
              <option value={ALL_MAP_FILTER_VALUE}>
                {t("filters.allProducts")}
              </option>
              {productOptions.map((option) => (
                <option key={option} value={option}>
                  {labels(`productTypes.${option}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-neutral-800">
              {t("filters.district")}
            </span>
            <select
              className="min-h-11 border border-neutral-900/15 bg-white px-3 text-neutral-900"
              onChange={(event) => setDistrict(event.target.value)}
              value={district}
            >
              <option value={ALL_MAP_FILTER_VALUE}>
                {t("filters.allDistricts")}
              </option>
              {options.districts.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-neutral-800">
              {t("filters.confidence")}
            </span>
            <select
              className="min-h-11 border border-neutral-900/15 bg-white px-3 text-neutral-900"
              onChange={(event) =>
                setConfidence(event.target.value as MapConfidenceFilter)
              }
              value={confidence}
            >
              <option value={ALL_MAP_FILTER_VALUE}>
                {t("filters.allConfidence")}
              </option>
              {options.confidenceLabels.map((option) => (
                <option key={option} value={option}>
                  {labels(`confidence.${option}`)}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-neutral-800">
                {t("filters.minPrice")}
              </span>
              <select
                className="min-h-11 border border-neutral-900/15 bg-white px-3 text-neutral-900"
                onChange={(event) => setMinPriceCents(event.target.value)}
                value={minPriceCents}
              >
                <option value={ALL_MAP_FILTER_VALUE}>
                  {t("filters.anyMinPrice")}
                </option>
                {options.priceSteps.map((option) => (
                  <option key={option} value={option}>
                    {formatCurrency(option, locale)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-neutral-800">
                {t("filters.maxPrice")}
              </span>
              <select
                className="min-h-11 border border-neutral-900/15 bg-white px-3 text-neutral-900"
                onChange={(event) => setMaxPriceCents(event.target.value)}
                value={maxPriceCents}
              >
                <option value={ALL_MAP_FILTER_VALUE}>
                  {t("filters.anyMaxPrice")}
                </option>
                {options.priceSteps.map((option) => (
                  <option key={option} value={option}>
                    {formatCurrency(option, locale)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </aside>

      <div className="min-h-[620px] overflow-hidden border border-neutral-900/10 bg-white">
        {tileConfig.status === "available" ? (
          <div className="relative h-full min-h-[620px]">
            <LeafletMap
              locale={locale}
              points={visiblePoints}
              tileConfig={tileConfig}
            />
            {tileConfig.provider === "osm" ? (
              <div className="absolute right-3 bottom-3 z-[500] max-w-xs border border-neutral-900/10 bg-white/95 p-3 text-neutral-700 text-xs leading-5 shadow-sm">
                {t("tile.localFallback")}
              </div>
            ) : null}
            {points.length === 0 ? (
              <div className="absolute top-3 left-3 z-[500] max-w-md">
                <EmptyState body={t("empty.body")} title={t("empty.title")} />
              </div>
            ) : visiblePoints.length === 0 ? (
              <div className="absolute top-3 left-3 z-[500] max-w-md">
                <EmptyState
                  body={t("noResults.body")}
                  title={t("noResults.title")}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex min-h-[620px] items-center justify-center bg-[#e7ede7] p-6">
            <div className="max-w-lg">
              <EmptyState
                body={t("tile.missingBody")}
                title={t("tile.title")}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
