# Data Rules

## Files

`/data/shops.json`

```json
[
  {
    "id": "ruyada-gemuese-kebab-schoeneberg",
    "name": "Rüyada Gemüse Kebab",
    "address": "Hauptstraße 133, 10827 Berlin",
    "district": "Schöneberg",
    "borough": "Tempelhof-Schöneberg",
    "lat": 52.4867,
    "lng": 13.3519,
    "osmUrl": "",
    "websiteUrl": "",
    "status": "active"
  }
]
```

`/data/price-records.csv`

```csv
id,shopId,observedAt,priceCents,productType,sourceType,confidence,sourceUrl,notes
price_001,ruyada-gemuese-kebab-schoeneberg,2026-05-20,700,standard_doener,user_submission,70,,Submitted without photo
```

`/data/districts.json` should contain district/Ortsteil metadata only when needed for filtering, display order, or map bounds.

Initial production data may be empty. For the data foundation stage, `shops.json` and `districts.json` may be empty arrays, and `price-records.csv` may contain only its canonical header:

```csv
id,shopId,observedAt,priceCents,productType,sourceType,confidence,sourceUrl,notes
```

Do not add fake public shops or fake public prices to make the product look populated. Verified seed data belongs in a separate data-seeding plan with source and provenance decisions. Test fixtures should stay in test files unless they are clearly separated from public production data.

## Current Data Implementation

Current data foundation modules:

- `src/lib/validation/schemas.ts`: Zod schemas, enums, and inferred TypeScript types.
- `src/lib/data/read-data-file.ts`: repository-local `/data` file reading helper.
- `src/lib/data/load-shops.ts`: JSON shop loader.
- `src/lib/data/load-districts.ts`: JSON district metadata loader.
- `src/lib/data/load-price-records.ts`: CSV price record loader.
- `src/lib/data/load-data.ts`: combined dataset loader.
- `src/lib/validation/validate-data.ts`: pure dataset validation.
- `scripts/validate-data.ts`: CLI validation entrypoint for `pnpm validate:data`.

Use `csv-parse/sync` for price CSV ingestion with explicit header validation. Header-only price CSV files are valid and should load as an empty record array.

## Local Review Tooling Pattern

For public form exports and other manually reviewed inputs, keep raw private files and generated review artifacts under ignored `dev_locals/`. Converter scripts may create draft reviewed data, but must not bypass maintainer review. One-line pipelines and browser-based local review tools are acceptable when they preserve the same publication gates: canonical reviewed headers, complete required fields, approved new-shop metadata, dry-run validation, and no production write when blockers remain.

Local review tools must not be public app routes or deployed admin surfaces. Address enrichment and geocoding helpers are review aids only: keep them opt-in, document privacy/provider constraints, cache results under ignored `dev_locals/`, and never let suggestions bypass required-field, approval, dry-run, or explicit import gates. Geocoding suggestions may help fill `district`, `borough`, `lat`, and `lng`, but they must not auto-set review-only publication decisions such as `status`, `confidence`, or `approved`.

## Required Shop Fields

- `id`: stable slug, unique.
- `name`: optional but recommended; allow unknown shops.
- `address`: required.
- `district`: Ortsteil or commonly used neighborhood label.
- `borough`: official Bezirk where known.
- `lat`, `lng`: required for map markers.
- `osmUrl`, `websiteUrl`: optional.
- `status`: `active`, `closed`, or `unknown`.

## Required Price Fields

- `id`: unique record id.
- `shopId`: must match an existing shop.
- `observedAt`: ISO date.
- `priceCents`: integer cents. Never store prices as floats.
- `productType`: enum.
- `sourceType`: enum.
- `confidence`: 0-100 integer after base scoring and age adjustment, or store base confidence and calculate adjusted confidence consistently.
- `sourceUrl`: optional. Do not publish private contact links or private uploads unintentionally.
- `notes`: optional.

## Product Types

Default ranking includes only:

- `standard_doener`

Other accepted types:

- `chicken_doener`
- `veal_doener`
- `gemuese_doener`
- `vegan_doener`
- `dueruem`
- `doener_box`

Do not mix product types in the main cheapest/most-expensive ranking unless the UI clearly labels the product type.

## Source Types and Base Confidence

- `menu_photo`: 90
- `manual_observation`: 85
- `shop_website`: 85
- `user_submission`: 65
- `delivery_platform`: 55
- `unknown`: 40

## Age Adjustment

Calculate data age from `observedAt`.

- 0-30 days: no confidence penalty.
- 31-90 days: -5.
- 91-180 days: -15.
- More than 180 days: mark `outdated`; exclude from default rankings.

Confidence labels:

- `High`: adjusted confidence >= 80 and observed within 90 days.
- `Medium`: adjusted confidence >= 60 and observed within 180 days.
- `Low`: anything else that is not outdated.
- `Outdated`: observed more than 180 days ago.

## Latest Price Rule

For current prices, group by `shopId + productType` and select the record with the newest `observedAt`. Break ties deterministically by `id`.

## Ranking Rule

Default rankings:

- Use `productType = standard_doener`.
- Use only the latest price per shop.
- Exclude records older than 180 days by default.
- Sort cheapest by `priceCents` ascending.
- Sort most expensive by `priceCents` descending.
- Show sample count, last updated date, product type, and confidence/outdated state.

## District Statistics

For each district/Ortsteil, calculate from latest non-outdated `standard_doener` prices unless the UI explicitly states otherwise:

- `averagePriceCents`
- `medianPriceCents`
- `minPriceCents`
- `maxPriceCents`
- `sampleCount`
- `lastUpdatedAt`

Always show sample count. Treat low sample counts as a caveat, not a definitive district ranking.

## Validation Requirements

Validation scripts must fail on:

- Duplicate ids.
- Price records referencing missing shops.
- Invalid dates, coordinates, status, product type, source type, confidence, or price cents.
- Missing required fields.
- Malformed or non-canonical CSV headers.
- CSV rows with inconsistent column counts.
- Impossible prices unless explicitly documented for test fixtures.

Validation should warn, not fail, on:

- Missing optional shop name.
- Missing district/borough if the address and coordinates are present.
- Stale prices.
- Potential duplicate shops by nearby coordinates or similar addresses.
- Future `observedAt` dates until the real submission/review workflow defines stricter behavior.

The CLI should print errors and warnings separately. Any validation error exits non-zero. Warning-only runs exit zero so stale or incomplete-but-usable data can remain visible during early collection.
