import { describe, expect, it } from "vitest";
import {
  applyGeocodeSuggestionToOverride,
  buildBerlinOfficialWfsUrl,
  buildNominatimSearchUrl,
  getGeocodeCacheKey,
  getNominatimDelayMs,
  parseBerlinAddress,
  parseBerlinOfficialFeatureCollection,
  parseNominatimResults,
} from "./form-geocoding";
import type { FormExportOverrideRow } from "./form-review-tool";

describe("form geocoding helpers", () => {
  it("parses common Berlin address strings for official lookup", () => {
    expect(parseBerlinAddress("Lipschitzallee 27, 12351 Berlin")).toMatchObject(
      {
        houseNumber: "27",
        houseNumberSuffix: "",
        postcode: "12351",
        street: "Lipschitzallee",
      },
    );

    expect(parseBerlinAddress("Bahnhofstr. 20, 12307 Berlin")).toMatchObject({
      houseNumber: "20",
      postcode: "12307",
      street: "Bahnhofstraße",
    });
  });

  it("builds an official Berlin WFS GeoJSON query", () => {
    const parsed = parseBerlinAddress("Lipschitzallee 27, 12351 Berlin");
    const url = new URL(buildBerlinOfficialWfsUrl(parsed));

    expect(url.searchParams.get("OUTPUTFORMAT")).toBe("application/json");
    expect(url.searchParams.get("SRSNAME")).toBe("EPSG:4326");
    expect(url.searchParams.get("CQL_FILTER")).toBe(
      "plz='12351' AND str_name ILIKE 'Lipschitzallee' AND hnr=27",
    );
  });

  it("parses official Berlin WFS GeoJSON suggestions", () => {
    const suggestions = parseBerlinOfficialFeatureCollection({
      features: [
        {
          geometry: { coordinates: [13.47157734, 52.42968172] },
          properties: {
            bez_name: "Neukölln",
            hnr: 27,
            hnr_zusatz: null,
            ort_name: "Gropiusstadt",
            plz: "12351",
            qualitaet: "Qualitaet A",
            str_name: "Lipschitzallee",
          },
        },
      ],
    });

    expect(suggestions[0]).toMatchObject({
      borough: "Neukölln",
      district: "Gropiusstadt",
      label: "Lipschitzallee 27, 12351 Berlin",
      lat: "52.42968172",
      lng: "13.47157734",
      provider: "berlin-official",
    });
  });

  it("builds and parses Nominatim fallback results", () => {
    const url = new URL(
      buildNominatimSearchUrl("Lipschitzallee 27, 12351 Berlin"),
    );

    expect(url.searchParams.get("countrycodes")).toBe("de");
    expect(url.searchParams.get("bounded")).toBe("1");

    const suggestions = parseNominatimResults([
      {
        address: {
          borough: "Neukölln",
          suburb: "Gropiusstadt",
        },
        display_name: "Lipschitzallee 27, Gropiusstadt, Berlin",
        lat: "52.42968172",
        lon: "13.47157734",
      },
    ]);

    expect(suggestions[0]).toMatchObject({
      borough: "Neukölln",
      district: "Gropiusstadt",
      provider: "nominatim",
    });
  });

  it("deduplicates repeated Nominatim fallback candidates", () => {
    const suggestions = parseNominatimResults([
      {
        display_name: "Lipschitzallee 27, Gropiusstadt, Berlin",
        lat: "52.42968172",
        lon: "13.47157734",
      },
      {
        display_name: "Lipschitzallee 27, Gropiusstadt, Berlin",
        lat: "52.42968172",
        lon: "13.47157734",
      },
    ]);

    expect(suggestions).toHaveLength(1);
  });

  it("calculates cache keys and Nominatim rate-limit delays", () => {
    expect(
      getGeocodeCacheKey({
        address: "Lipschitzallee 27, 12351 Berlin",
        provider: "berlin-official",
      }),
    ).toMatch(/^berlin-official-[a-f0-9]{24}\.json$/);
    expect(getNominatimDelayMs({ lastRequestAt: 0, now: 1000 })).toBe(0);
    expect(getNominatimDelayMs({ lastRequestAt: 1000, now: 1400 })).toBe(600);
    expect(getNominatimDelayMs({ lastRequestAt: 1000, now: 2200 })).toBe(0);
  });

  it("applies suggestions without approving or changing review-only fields", () => {
    const override: FormExportOverrideRow = {
      address: "Lipschitzallee 27, 12351 Berlin",
      approved: "",
      borough: "",
      confidence: "65",
      district: "",
      lat: "",
      lng: "",
      notes: "Needs review",
      shopId: "douran-doener-neukoelln",
      shopName: "Douran Döner",
      sourceUrl: "",
      status: "unknown",
    };

    expect(
      applyGeocodeSuggestionToOverride(override, {
        attribution: "Berlin Open Data",
        borough: "Neukölln",
        district: "Gropiusstadt",
        label: "Lipschitzallee 27",
        lat: "52.42968172",
        lng: "13.47157734",
        provider: "berlin-official",
        quality: "Qualitaet A",
        sourceUrl: "https://gdi.berlin.de/services/wfs/adressen_berlin",
      }),
    ).toEqual({
      ...override,
      borough: "Neukölln",
      district: "Gropiusstadt",
      lat: "52.42968172",
      lng: "13.47157734",
    });
  });
});
