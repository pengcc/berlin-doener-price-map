# Data Schema

The MVP uses static files under `/data`. These files are public application data and should contain only reviewed information that is safe to publish.

Initial production data is intentionally empty/header-only until verified seed data is added. Use test fixtures for examples in automated tests instead of adding fake public prices.

## Files

```txt
data/
  shops.json
  price-records.csv
  districts.json
```

## shops.json

Top-level shape: an array of shop records.

Required fields:

- `id`: stable lowercase dash-separated slug.
- `address`: public street address.
- `district`: Ortsteil or commonly used neighborhood label.
- `borough`: official Bezirk where known.
- `lat`: latitude within the Berlin validation range.
- `lng`: longitude within the Berlin validation range.
- `status`: `active`, `closed`, or `unknown`.

Optional fields:

- `name`
- `osmUrl`
- `websiteUrl`

## price-records.csv

Canonical header:

```csv
id,shopId,observedAt,priceCents,productType,sourceType,confidence,sourceUrl,notes
```

Fields:

- `id`: stable lowercase dash-separated record id.
- `shopId`: must match a shop id in `shops.json`.
- `observedAt`: `YYYY-MM-DD`.
- `priceCents`: integer cents, not a floating-point euro value.
- `productType`: one of the accepted product type enums.
- `sourceType`: one of the accepted source type enums.
- `confidence`: integer from `0` to `100`.
- `sourceUrl`: optional public URL.
- `notes`: optional public note.

Default ranking logic will later use only `standard_doener` prices.

## districts.json

Top-level shape: an array of district metadata records.

Fields:

- `id`: stable lowercase dash-separated slug.
- `name`: display name.
- `type`: `district` or `borough`.
- `borough`: optional parent borough when the record is an Ortsteil/neighborhood.

This file can remain empty until district filters or statistics need display metadata.

## Validation

Run:

```bash
pnpm validate:data
```

Validation fails on:

- Duplicate ids.
- Price records that reference unknown shops.
- Invalid dates, coordinates, enum values, confidence, or price cents.
- Missing required fields.
- Invalid CSV headers or row column counts.

Validation warns but exits successfully on:

- Missing optional shop names.
- Prices older than 180 days.
- Future observed dates, until the submission workflow defines a stricter rule.
