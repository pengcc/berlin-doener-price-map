import { createHash } from "node:crypto";
import type { FormExportOverrideRow } from "./form-review-tool";
import { normalizeAddressForReview } from "./process-form-export";

export const GEOCODE_CACHE_DIR = "dev_locals/data/geocode-cache";
export const BERLIN_OFFICIAL_WFS_URL =
  "https://gdi.berlin.de/services/wfs/adressen_berlin";
export const NOMINATIM_SEARCH_URL =
  "https://nominatim.openstreetmap.org/search";
export const NOMINATIM_USER_AGENT =
  "BerlinDoenerPriceMapLocalReview/0.1 (https://github.com/pengcc/berlin-doener-price-map)";
export const NOMINATIM_MIN_REQUEST_INTERVAL_MS = 1000;

const BERLIN_VIEWBOX = {
  east: 13.759110693703263,
  north: 52.66591787320944,
  south: 52.33235628216095,
  west: 13.080773164787484,
};

export type GeocodeProvider = "berlin-official" | "nominatim";

export type ParsedBerlinAddress = {
  city: string;
  houseNumber: string;
  houseNumberSuffix: string;
  original: string;
  postcode: string;
  street: string;
  warnings: string[];
};

export type GeocodeSuggestion = {
  attribution: string;
  borough: string;
  district: string;
  label: string;
  lat: string;
  lng: string;
  provider: GeocodeProvider;
  quality: string;
  sourceUrl: string;
};

export type GeocodeLookupResult = {
  cached: boolean;
  parsedAddress?: ParsedBerlinAddress;
  provider: GeocodeProvider;
  suggestions: GeocodeSuggestion[];
  warnings: string[];
};

type BerlinOfficialFeature = {
  geometry?: {
    coordinates?: unknown;
  };
  properties?: Record<string, unknown>;
};

type BerlinOfficialFeatureCollection = {
  features?: BerlinOfficialFeature[];
};

type NominatimResult = {
  address?: Record<string, unknown>;
  display_name?: unknown;
  lat?: unknown;
  lon?: unknown;
};

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeStreetName(value: string) {
  return normalizeWhitespace(value)
    .replace(/str\.?$/i, "straße")
    .replace(/strasse$/i, "straße");
}

function normalizeHouseNumberSuffix(value: string | undefined) {
  return value ? value.trim().toUpperCase() : "";
}

function getStringProperty(
  properties: Record<string, unknown> | undefined,
  key: string,
) {
  const value = properties?.[key];
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function getNumberProperty(
  properties: Record<string, unknown> | undefined,
  key: string,
) {
  const value = properties?.[key];
  return typeof value === "number" || typeof value === "string"
    ? String(value)
    : "";
}

function escapeCqlString(value: string) {
  return value.replaceAll("'", "''");
}

function formatCoordinate(value: number) {
  return value.toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
}

function getNominatimAddressPart(
  address: Record<string, unknown> | undefined,
  keys: string[],
) {
  for (const key of keys) {
    const value = address?.[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

export function parseBerlinAddress(address: string): ParsedBerlinAddress {
  const warnings: string[] = [];
  const original = normalizeWhitespace(address);
  const postcodeMatch = original.match(/\b(1\d{4})\b/);
  const postcode = postcodeMatch?.[1] ?? "";

  if (!postcode) {
    warnings.push(
      "Address must include a Berlin postcode for official lookup.",
    );
  }

  const beforePostcode = postcodeMatch
    ? original.slice(0, postcodeMatch.index).replace(/,\s*$/, "")
    : original;
  const citySegment = postcodeMatch
    ? original.slice((postcodeMatch.index ?? 0) + postcode.length)
    : "";
  const city = /berlin/i.test(citySegment) || postcode ? "Berlin" : "";
  const streetAndNumber = beforePostcode
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .at(-1);
  const streetMatch = streetAndNumber?.match(
    /^(.+?)\s+(\d{1,4})(?:\s*([a-zA-Z]))?(?:\s*[-/].*)?$/,
  );

  if (!streetMatch) {
    warnings.push(
      "Address must include street and house number for official lookup.",
    );

    return {
      city,
      houseNumber: "",
      houseNumberSuffix: "",
      original,
      postcode,
      street: streetAndNumber ? normalizeStreetName(streetAndNumber) : "",
      warnings,
    };
  }

  if (/[-/]/.test(streetAndNumber ?? "")) {
    warnings.push(
      "Address range detected; official lookup uses the first house number only.",
    );
  }

  return {
    city,
    houseNumber: streetMatch[2] ?? "",
    houseNumberSuffix: normalizeHouseNumberSuffix(streetMatch[3]),
    original,
    postcode,
    street: normalizeStreetName(streetMatch[1] ?? ""),
    warnings,
  };
}

export function canQueryBerlinOfficialAddress(parsed: ParsedBerlinAddress) {
  return Boolean(parsed.postcode && parsed.street && parsed.houseNumber);
}

export function buildBerlinOfficialWfsUrl(parsed: ParsedBerlinAddress) {
  const filterParts = [
    `plz='${escapeCqlString(parsed.postcode)}'`,
    `str_name ILIKE '${escapeCqlString(parsed.street)}'`,
    `hnr=${Number(parsed.houseNumber)}`,
  ];

  if (parsed.houseNumberSuffix) {
    filterParts.push(
      `hnr_zusatz='${escapeCqlString(parsed.houseNumberSuffix)}'`,
    );
  }

  const searchParams = new URLSearchParams({
    COUNT: "5",
    CQL_FILTER: filterParts.join(" AND "),
    OUTPUTFORMAT: "application/json",
    REQUEST: "GetFeature",
    SERVICE: "WFS",
    SRSNAME: "EPSG:4326",
    TYPENAMES: "adressen_berlin:adressen_berlin",
    VERSION: "2.0.0",
  });

  return `${BERLIN_OFFICIAL_WFS_URL}?${searchParams.toString()}`;
}

export function buildNominatimSearchUrl(address: string) {
  const searchParams = new URLSearchParams({
    addressdetails: "1",
    bounded: "1",
    countrycodes: "de",
    format: "jsonv2",
    limit: "5",
    q: address,
    viewbox: [
      BERLIN_VIEWBOX.west,
      BERLIN_VIEWBOX.north,
      BERLIN_VIEWBOX.east,
      BERLIN_VIEWBOX.south,
    ].join(","),
  });

  return `${NOMINATIM_SEARCH_URL}?${searchParams.toString()}`;
}

export function parseBerlinOfficialFeatureCollection(
  payload: BerlinOfficialFeatureCollection,
) {
  const suggestions: GeocodeSuggestion[] = [];

  for (const feature of payload.features ?? []) {
    const coordinates = feature.geometry?.coordinates;

    if (
      !Array.isArray(coordinates) ||
      typeof coordinates[0] !== "number" ||
      typeof coordinates[1] !== "number"
    ) {
      continue;
    }

    const properties = feature.properties;
    const houseNumber = getNumberProperty(properties, "hnr");
    const suffix = getStringProperty(properties, "hnr_zusatz");
    const street = getStringProperty(properties, "str_name");
    const postcode = getStringProperty(properties, "plz");
    const district = getStringProperty(properties, "ort_name");
    const borough = getStringProperty(properties, "bez_name");

    suggestions.push({
      attribution:
        "Amt für Statistik Berlin-Brandenburg / Berlin Open Data (dl-de-zero-2.0)",
      borough,
      district,
      label: normalizeWhitespace(
        `${street} ${houseNumber}${suffix}, ${postcode} Berlin`,
      ),
      lat: formatCoordinate(coordinates[1]),
      lng: formatCoordinate(coordinates[0]),
      provider: "berlin-official",
      quality: getStringProperty(properties, "qualitaet"),
      sourceUrl: BERLIN_OFFICIAL_WFS_URL,
    });
  }

  return suggestions;
}

export function parseNominatimResults(payload: NominatimResult[]) {
  const suggestions: GeocodeSuggestion[] = [];

  for (const result of payload) {
    const lat = Number(result.lat);
    const lng = Number(result.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      continue;
    }

    const address = result.address;
    const district = getNominatimAddressPart(address, [
      "suburb",
      "city_district",
      "quarter",
      "neighbourhood",
    ]);
    const borough = getNominatimAddressPart(address, [
      "borough",
      "municipality",
      "county",
    ]);

    suggestions.push({
      attribution: "OpenStreetMap contributors, ODbL 1.0",
      borough,
      district,
      label:
        typeof result.display_name === "string"
          ? result.display_name
          : "Nominatim result",
      lat: formatCoordinate(lat),
      lng: formatCoordinate(lng),
      provider: "nominatim",
      quality: "OSM/Nominatim result; maintainer must verify",
      sourceUrl: NOMINATIM_SEARCH_URL,
    });
  }

  return suggestions;
}

export function getNominatimDelayMs({
  lastRequestAt,
  now,
}: {
  lastRequestAt: number;
  now: number;
}) {
  if (lastRequestAt <= 0) {
    return 0;
  }

  return Math.max(0, NOMINATIM_MIN_REQUEST_INTERVAL_MS - (now - lastRequestAt));
}

export function getGeocodeCacheKey({
  address,
  provider,
}: {
  address: string;
  provider: GeocodeProvider;
}) {
  const normalizedAddress = normalizeAddressForReview(address);
  const digest = createHash("sha256")
    .update(`${provider}:${normalizedAddress}`)
    .digest("hex")
    .slice(0, 24);

  return `${provider}-${digest}.json`;
}

export function applyGeocodeSuggestionToOverride(
  override: FormExportOverrideRow,
  suggestion: GeocodeSuggestion,
): FormExportOverrideRow {
  return {
    ...override,
    borough: suggestion.borough || override.borough,
    district: suggestion.district || override.district,
    lat: suggestion.lat || override.lat,
    lng: suggestion.lng || override.lng,
  };
}
