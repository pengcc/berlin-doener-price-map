import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PRICE_RECORD_HEADERS } from "../src/lib/data/load-price-records";
import type { District, Shop } from "../src/lib/validation/schemas";

type DemoLocation = {
  borough: string;
  district: string;
  lat: number;
  lng: number;
  postalCode: string;
};

const DEMO_DIRECTORY = join(process.cwd(), "data", "demo");
const OBSERVED_AT = "2026-05-29";
const PRICE_OPTIONS_CENTS = [600, 650, 700, 750, 800, 850, 900] as const;

const demoLocations: DemoLocation[] = [
  {
    borough: "Mitte",
    district: "Mitte",
    lat: 52.52,
    lng: 13.405,
    postalCode: "10115",
  },
  {
    borough: "Mitte",
    district: "Wedding",
    lat: 52.548,
    lng: 13.36,
    postalCode: "13353",
  },
  {
    borough: "Friedrichshain-Kreuzberg",
    district: "Friedrichshain",
    lat: 52.515,
    lng: 13.454,
    postalCode: "10245",
  },
  {
    borough: "Friedrichshain-Kreuzberg",
    district: "Kreuzberg",
    lat: 52.499,
    lng: 13.421,
    postalCode: "10999",
  },
  {
    borough: "Pankow",
    district: "Prenzlauer Berg",
    lat: 52.539,
    lng: 13.424,
    postalCode: "10405",
  },
  {
    borough: "Pankow",
    district: "Pankow",
    lat: 52.569,
    lng: 13.402,
    postalCode: "13187",
  },
  {
    borough: "Charlottenburg-Wilmersdorf",
    district: "Charlottenburg",
    lat: 52.516,
    lng: 13.304,
    postalCode: "10625",
  },
  {
    borough: "Charlottenburg-Wilmersdorf",
    district: "Wilmersdorf",
    lat: 52.487,
    lng: 13.32,
    postalCode: "10707",
  },
  {
    borough: "Spandau",
    district: "Spandau",
    lat: 52.535,
    lng: 13.201,
    postalCode: "13597",
  },
  {
    borough: "Spandau",
    district: "Siemensstadt",
    lat: 52.54,
    lng: 13.264,
    postalCode: "13629",
  },
  {
    borough: "Steglitz-Zehlendorf",
    district: "Steglitz",
    lat: 52.456,
    lng: 13.322,
    postalCode: "12163",
  },
  {
    borough: "Steglitz-Zehlendorf",
    district: "Zehlendorf",
    lat: 52.433,
    lng: 13.258,
    postalCode: "14163",
  },
  {
    borough: "Tempelhof-Schöneberg",
    district: "Schöneberg",
    lat: 52.483,
    lng: 13.35,
    postalCode: "10827",
  },
  {
    borough: "Tempelhof-Schöneberg",
    district: "Tempelhof",
    lat: 52.466,
    lng: 13.385,
    postalCode: "12101",
  },
  {
    borough: "Neukölln",
    district: "Neukölln",
    lat: 52.477,
    lng: 13.439,
    postalCode: "12047",
  },
  {
    borough: "Neukölln",
    district: "Britz",
    lat: 52.448,
    lng: 13.449,
    postalCode: "12347",
  },
  {
    borough: "Treptow-Köpenick",
    district: "Alt-Treptow",
    lat: 52.488,
    lng: 13.459,
    postalCode: "12435",
  },
  {
    borough: "Treptow-Köpenick",
    district: "Köpenick",
    lat: 52.445,
    lng: 13.574,
    postalCode: "12555",
  },
  {
    borough: "Marzahn-Hellersdorf",
    district: "Marzahn",
    lat: 52.543,
    lng: 13.558,
    postalCode: "12681",
  },
  {
    borough: "Marzahn-Hellersdorf",
    district: "Hellersdorf",
    lat: 52.536,
    lng: 13.604,
    postalCode: "12627",
  },
  {
    borough: "Lichtenberg",
    district: "Lichtenberg",
    lat: 52.52,
    lng: 13.48,
    postalCode: "10365",
  },
  {
    borough: "Lichtenberg",
    district: "Friedrichsfelde",
    lat: 52.505,
    lng: 13.52,
    postalCode: "10315",
  },
  {
    borough: "Reinickendorf",
    district: "Reinickendorf",
    lat: 52.567,
    lng: 13.333,
    postalCode: "13407",
  },
  {
    borough: "Reinickendorf",
    district: "Tegel",
    lat: 52.589,
    lng: 13.279,
    postalCode: "13507",
  },
];

function toSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function demoPriceForIndex(index: number) {
  return PRICE_OPTIONS_CENTS[(index * 5 + 2) % PRICE_OPTIONS_CENTS.length];
}

function buildShops(): Shop[] {
  return demoLocations.map((location, index) => {
    const number = index + 1;
    const districtSlug = toSlug(location.district);

    return {
      id: `demo-${districtSlug}-doener-${number.toString().padStart(2, "0")}`,
      name: `Demo Doener ${location.district}`,
      address: `Demoallee ${number}, ${location.postalCode} Berlin`,
      district: location.district,
      borough: location.borough,
      lat: location.lat,
      lng: location.lng,
      status: "active",
    };
  });
}

function buildDistricts(): District[] {
  const boroughs = Array.from(
    new Set(demoLocations.map((location) => location.borough)),
  ).map((borough) => ({
    id: `borough-${toSlug(borough)}`,
    name: borough,
    type: "borough" as const,
  }));

  const districts = demoLocations.map((location) => ({
    id: `district-${toSlug(location.district)}`,
    name: location.district,
    type: "district" as const,
    borough: location.borough,
  }));

  return [...boroughs, ...districts].sort((a, b) => a.id.localeCompare(b.id));
}

function buildPriceRecordRows(shops: Shop[]) {
  return shops.map((shop, index) => [
    `demo-price-${(index + 1).toString().padStart(2, "0")}`,
    shop.id,
    OBSERVED_AT,
    demoPriceForIndex(index).toString(),
    "standard_doener",
    "unknown",
    "40",
    "",
    "Unverified generated demo record; not a real observed price.",
  ]);
}

function toCsv(rows: string[][]) {
  return rows.map((row) => row.join(",")).join("\n");
}

const shops = buildShops();
const districts = buildDistricts();
const priceRows = buildPriceRecordRows(shops);

mkdirSync(DEMO_DIRECTORY, { recursive: true });
writeFileSync(
  join(DEMO_DIRECTORY, "shops.json"),
  `${JSON.stringify(shops, null, 2)}\n`,
);
writeFileSync(
  join(DEMO_DIRECTORY, "districts.json"),
  `${JSON.stringify(districts, null, 2)}\n`,
);
writeFileSync(
  join(DEMO_DIRECTORY, "price-records.csv"),
  `${toCsv([[...PRICE_RECORD_HEADERS], ...priceRows])}\n`,
);

console.log(
  `Generated demo data: ${shops.length} shops, ${priceRows.length} price records, ${districts.length} districts.`,
);
