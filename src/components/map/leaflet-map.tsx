"use client";

import L from "leaflet";
import { useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { Locale } from "@/i18n/routing";
import { formatCurrency, formatDate } from "@/lib/i18n/format";
import {
  BERLIN_MAP_CENTER,
  BERLIN_MAP_ZOOM,
  type MapPricePoint,
} from "@/lib/map/map-data";
import type { MapTileConfig } from "@/lib/map/tile-config";

type Props = {
  locale: Locale;
  points: MapPricePoint[];
  tileConfig: Extract<MapTileConfig, { status: "available" }>;
};

function BoundsController({ points }: { points: MapPricePoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) {
      map.setView(
        [BERLIN_MAP_CENTER.lat, BERLIN_MAP_CENTER.lng],
        BERLIN_MAP_ZOOM,
      );
      return;
    }

    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14);
      return;
    }

    map.fitBounds(
      L.latLngBounds(points.map((point) => [point.lat, point.lng])).pad(0.15),
      {
        maxZoom: 15,
        padding: [32, 32],
      },
    );
  }, [map, points]);

  return null;
}

function PriceMarker({
  locale,
  point,
}: {
  locale: Locale;
  point: MapPricePoint;
}) {
  const t = useTranslations("MapPage");
  const labels = useTranslations("Labels");
  const priceLabel = formatCurrency(point.priceCents, locale);
  const icon = useMemo(
    () =>
      L.divIcon({
        className: "doener-price-marker",
        html: `<span>${priceLabel}</span>`,
        iconAnchor: [32, 20],
        iconSize: [64, 40],
        popupAnchor: [0, -22],
      }),
    [priceLabel],
  );

  return (
    <Marker icon={icon} position={[point.lat, point.lng]}>
      <Popup minWidth={240}>
        <div className="space-y-3">
          <div>
            <p className="font-semibold text-base text-neutral-950">
              {point.shopName}
            </p>
            <p className="mt-1 text-neutral-600 text-sm leading-5">
              {point.shopAddress}
            </p>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
            <dt className="text-neutral-500">{t("popup.price")}</dt>
            <dd className="font-semibold text-neutral-950">{priceLabel}</dd>
            <dt className="text-neutral-500">{t("popup.product")}</dt>
            <dd>{labels(`productTypes.${point.productType}`)}</dd>
            <dt className="text-neutral-500">{t("popup.district")}</dt>
            <dd>
              {point.district}, {point.borough}
            </dd>
            <dt className="text-neutral-500">{t("popup.observed")}</dt>
            <dd>{formatDate(point.observedAt, locale)}</dd>
            <dt className="text-neutral-500">{t("popup.confidence")}</dt>
            <dd>{labels(`confidence.${point.confidenceLabel}`)}</dd>
          </dl>
        </div>
      </Popup>
    </Marker>
  );
}

export function LeafletMap({ locale, points, tileConfig }: Props) {
  return (
    <MapContainer
      center={[BERLIN_MAP_CENTER.lat, BERLIN_MAP_CENTER.lng]}
      className="h-full min-h-[620px] w-full"
      preferCanvas={true}
      scrollWheelZoom={false}
      zoom={BERLIN_MAP_ZOOM}
    >
      <TileLayer
        attribution={tileConfig.attribution}
        maxZoom={tileConfig.maxZoom}
        url={tileConfig.url}
      />
      <BoundsController points={points} />
      {points.map((point) => (
        <PriceMarker key={point.id} locale={locale} point={point} />
      ))}
    </MapContainer>
  );
}
