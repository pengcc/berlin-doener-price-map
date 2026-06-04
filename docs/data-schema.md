# Data Schema

The MVP uses static files under `/data`. These files are public application data and should contain only reviewed information that is safe to publish.

Initial production data is intentionally empty/header-only until verified seed data is added. Use test fixtures for examples in automated tests instead of adding fake public prices.

Generated presentation data is kept separately under `data/demo/`. It is unverified mock data and is loaded only through explicit demo routes or a local development default.

## Files

```txt
data/
  shops.json
  price-records.csv
  districts.json
  demo/
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

Default ranking logic uses only latest non-outdated `standard_doener` prices.

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

For generated demo data, run:

```bash
pnpm generate:demo-data
pnpm validate:demo-data
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

## Read Models

Pure read-model utilities live under `src/lib/data/` and `src/lib/price/`. They are intended for future server-rendered pages, maps, tables, and rankings.

Latest price selection:

- Group price records by `shopId + productType`.
- Select the newest `observedAt`.
- If records have the same date, the lexicographically greatest `id` wins.
- Records with missing shop references are skipped by read models; validation still reports them as errors.

Confidence and freshness:

- Treat stored `confidence` as base confidence.
- Apply age penalties when building read models:
  - 0-30 days: no penalty.
  - 31-90 days: minus 5.
  - 91+ days: minus 15.
- Mark prices older than 180 days as `outdated`.
- Confidence labels are `high`, `medium`, `low`, and `outdated`.

Default ranking read models:

- Use `standard_doener`.
- Use only the latest price per shop.
- Exclude outdated prices unless explicitly requested.
- Provide cheapest, most expensive, recently updated, and best-confidence lists.
- Include sample count, product type, last update, and confidence state.

District statistics:

- Use latest non-outdated `standard_doener` prices by default.
- Group by shop `district`.
- Calculate average, median, min, max, sample count, and last update.
- Average and median cents are rounded to the nearest cent.

## Demo Data Mode

Demo data is for local presentations and screenshots while the verified production dataset is still empty. It must remain visibly labeled in the UI and structurally separate from production records.

Use:

```bash
pnpm dev
```

Then switch in the page header or open an explicit demo route:

```txt
/de/demo/prices
/de/prices
```

`BERLIN_DOENER_DATA_MODE=demo` is still supported as a local default for code paths that do not pass an explicit mode.

Current demo data rules:

- Generated shops and prices live under `data/demo/`.
- Production `/data` remains empty/header-only until verified records are added.
- User-facing pages can switch between real and demo data through static routes.
- Generated prices use only 600, 650, 700, 750, 800, 850, and 900 cents.
- Generated records use `sourceType = unknown`, `confidence = 40`, and notes that say they are unverified generated demo records.
- Demo records must not be represented as real observed shop pricing.

## Reviewed Data Intake

Public submit pages link to structured review channels for real price observations, but they do not write directly to production data. Submitted rows become publication candidates only after manual review.

## First Seed Source and Provenance Policy

The first production seed must prioritize trust over coverage. Publish a smaller verified batch if necessary rather than weakening the source rules.

Accepted first-seed sources:

- `manual_observation`: A maintainer or reviewed contributor directly observed the in-store menu/counter price within the last 30 days. Default confidence: 85.
- `menu_photo`: A dated reviewed menu photo or equivalent evidence from the last 30 days, with clear shop/address match. Default confidence: 90.
- `shop_website`: An official shop-owned website or menu page that appears current and matches the reviewed shop. Default confidence: 85.
- `user_submission`: Allowed only after maintainer review confirms direct context, date, and shop identity. Default confidence: 65.

Excluded from the first seed:

- `delivery_platform`
- `unknown`
- third-party directory pages
- hearsay
- undated screenshots
- old photos
- private upload links
- raw private evidence
- uncertain shop identities or addresses

Production provenance must stay public-safe and concise. Use `sourceUrl` only for stable official/public pages. Leave it empty for manual observations and private evidence. Use short notes such as `Reviewed in-store observation; standard Doener price.` Do not commit reviewer identity, private contact details, private image links, raw evidence files, or private notes.

The maintainer import CSV uses this canonical header:

```csv
shopId,priceRecordId,shopName,address,district,borough,lat,lng,status,observedAt,priceCents,productType,sourceType,confidence,sourceUrl,notes
```

Contributor fields such as address, date, price, product, and source type are not enough for publication by themselves. Before import, maintainers must assign stable ids, verify coordinates, normalize the shop metadata, choose confidence, and remove any private or unsafe notes.
For public Google Form setup, raw CSV staging, field mapping, and manual normalization instructions, see `docs/public-form-data-operations.md`.

Run a dry import before writing:

```bash
pnpm import:reviewed-data -- reviewed-data.csv
```

Then write approved rows:

```bash
pnpm import:reviewed-data -- reviewed-data.csv --write
```

After writing, run `pnpm validate:data` and the normal project checks before publishing.
