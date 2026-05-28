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

Validation scripts should fail on:

- Duplicate ids.
- Price records referencing missing shops.
- Invalid dates, coordinates, status, product type, source type, confidence, or price cents.
- Missing required fields.
- Impossible prices unless explicitly documented for test fixtures.

Validation should warn, not necessarily fail, on:

- Missing optional shop name.
- Missing district/borough if the address and coordinates are present.
- Stale prices.
- Potential duplicate shops by nearby coordinates or similar addresses.
