# Public Form Data Operations

This guide explains how to configure a real public Google Form, download its CSV responses, review the data locally, and import only publication-ready records into Berlin Döner Price Map.

Public form responses are raw review input. They are not production data and must not be committed directly.

## Public Form Setup

Create the form manually in Google Forms, Tally, or a similar no-cost form tool. Use the public respondent URL for app configuration:

```bash
DOENER_PRICE_FORM_URL=https://...
```

Do not commit form admin/edit URLs, private inbox addresses, credentials, or submitter contact details. Keep GitHub issue forms enabled as the fallback contribution path.

Recommended intro text for the form:

```txt
Submitted prices are manually reviewed before publication. This form is for learning, practice, and feature demonstration. Data may be incomplete or out of date, and published prices remain reference information only. Final pricing is determined by the store.
```

## Recommended Google Form Fields

Use public-friendly fields. Do not ask submitters for internal IDs, coordinates, confidence scores, or publication-ready provenance text.

| Field label | Google Forms type | Required | Expected input | Reviewed-data use |
| --- | --- | --- | --- | --- |
| Shop name | Short answer | No | `Douran Döner` | Helps identify or create `shopName`; maintainer verifies. |
| Shop address | Short answer | Yes | `Example Straße 1, 10115 Berlin` | Required basis for `address`, district, borough, and coordinates. |
| District or neighborhood | Dropdown | No | `Mitte`, `Wedding`, `Kreuzberg`, or `Unsure / not listed` | Reduces spelling variants and makes CSV review easier; maintainer still verifies against the address. |
| Observation date | Date | Yes | Date when the price was seen | Normalize to `observedAt` as `YYYY-MM-DD`. |
| Observed price in EUR | Short answer | Yes | `7`, `7.00`, or `7,00` | Convert to integer `priceCents`, for example `700`. |
| Product type | Dropdown | Yes | See product choices below | Map to internal `productType`. |
| Evidence/source type | Dropdown | Yes | See source choices below | Map to internal `sourceType` after review. |
| Public source URL | Short answer | No | Official menu/page URL if public | Use only stable public URLs for `sourceUrl`. |
| Notes | Paragraph | No | Extra context | Review-only by default; publish only public-safe summaries. |

Optional contact details are not recommended for the public form. Add them only if there is a clear reviewed-data need, and never publish them.

Use a dropdown for district or neighborhood because free text quickly creates duplicates such as `Kreuzberg`, `Berlin Kreuzberg`, and `Xberg`. Keep an `Unsure / not listed` option so users are not blocked when they only know the address.

## Product Type Choices

Use human-readable public labels in the form, then normalize them before import:

| Form choice | Internal value |
| --- | --- |
| Standard Döner | `standard_doener` |
| Chicken Döner | `chicken_doener` |
| Veal Döner | `veal_doener` |
| Gemüse Döner | `gemuese_doener` |
| Vegan Döner | `vegan_doener` |
| Dürüm | `dueruem` |
| Döner Box | `doener_box` |

Default rankings use only `standard_doener`, so prefer collecting that first.

## Source Type Choices

Use public labels that describe the evidence, then choose the final internal value during review:

| Form choice | Internal value | Default confidence |
| --- | --- | --- |
| In-store observation | `manual_observation` or reviewed `user_submission` | `85` or `65` |
| Menu photo | `menu_photo` | `90` |
| Official shop website | `shop_website` | `85` |
| Delivery platform | `delivery_platform` | `55` |
| Other or unsure | `unknown` | `40` |

For the first real seed, keep the stricter source policy from `docs/contribution-review-workflow.md`: prefer recent direct observations, dated menu evidence, and official shop websites; exclude delivery platforms, hearsay, private links, and uncertain shop identities.

## CSV Staging Workflow

Google Forms exports should stay local and ignored by git.

1. Download the form responses as CSV.
2. Place raw exports under:

```txt
dev_locals/data/form-submission/
```

3. If the CSV is hard to review directly, start the local browser review tool:

```bash
pnpm review:form-export
```

This starts a local-only server on `127.0.0.1`, prints a one-time URL token, and opens no public app route. Use it to inspect raw form rows, edit local review overrides, save `dev_locals/data/review-overrides/form-export-overrides.csv`, run the dry-run gate, and confirm import only after the page shows that production write is ready.

You can pass a specific raw export when needed:

```bash
pnpm review:form-export -- dev_locals/data/form-submission/2026-06-04-google-form-responses.csv
```

The review tool includes a geocoding assist for maintainer review. It is not automatic production data. Suggestions can fill only `district`, `borough`, `lat`, and `lng`; they do not set `status`, `confidence`, or `approved`.

Use the geocoding controls this way:

1. Try `Official Berlin lookup` first. It sends the row address to Berlin's official no-key WFS for `Adressen Berlin`, which returns address coordinates plus `bez_name` and `ort_name`.
2. Use `Official lookup missing geo fields` when several rows are missing only district/borough/coordinates. This batch action uses only the official Berlin source.
3. Use `OSM/Nominatim fallback` only row by row when the official source cannot find a useful candidate. This sends the address to Nominatim/OpenStreetMap, uses a project-identifying User-Agent, is cached locally, and is rate-limited.
4. Click `Apply suggestion` only after checking the result. Then finish the remaining review fields manually and save overrides.

Address mistakes should still be fixed in the raw export before review; the address field in the tool is the local matching key for overrides.

Geocoding cache files are stored under:

```txt
dev_locals/data/geocode-cache/
```

Do not commit geocoding caches. They may contain raw submitted addresses and provider results.

4. Process the export with the one-line local pipeline when you prefer CLI review:

```bash
pnpm process:form-export
```

This command picks the newest `.csv` under `dev_locals/data/form-submission/`, creates a reviewed draft under `dev_locals/data/reviewed-imports/`, checks local review overrides, runs the reviewed import dry run, and updates production data only when every required publication field is complete.

If your local Node or pnpm version is uncertain, use:

```bash
mise exec -- corepack pnpm process:form-export
```

You can pass a specific raw export when needed:

```bash
pnpm process:form-export -- dev_locals/data/form-submission/2026-06-04-google-form-responses.csv
```

Use `--dry-run` to prevent production writes even when all checks pass, and `--force` to overwrite an existing generated reviewed draft.

The generated draft filename is based on the raw export filename, for example:

```txt
dev_locals/data/reviewed-imports/2026-06-04-google-form-responses.reviewed-draft.csv
```

The CLI pipeline only fills fields that can be safely derived from the public form, existing production shop data, or approved local overrides. It does not contact geocoding providers or guess publication fields.

Create the local folders if they do not exist:

```bash
mkdir -p dev_locals/data/form-submission dev_locals/data/reviewed-imports dev_locals/data/review-overrides dev_locals/data/geocode-cache
```

Optional local review overrides live at:

```txt
dev_locals/data/review-overrides/form-export-overrides.csv
```

Use this header:

```csv
address,shopId,shopName,district,borough,lat,lng,status,confidence,sourceUrl,notes,approved
```

Rows match raw submissions by normalized `address`. Use `approved=yes` only after you have reviewed the address, coordinates, status, confidence, source URL, and public-safe notes. Without `approved=yes`, the pipeline may write a draft CSV, but it will not update production data for new shops.

If the form header changes or you need to work manually, create a new CSV in a spreadsheet editor or text editor and start with this header:

```csv
shopId,priceRecordId,shopName,address,district,borough,lat,lng,status,observedAt,priceCents,productType,sourceType,confidence,sourceUrl,notes
```

5. Keep raw response and reviewed import filenames dated, for example:

```txt
dev_locals/data/form-submission/2026-06-04-google-form-responses.csv
dev_locals/data/reviewed-imports/2026-06-04-reviewed-data.csv
```

Do not commit raw form exports, generated reviewed drafts, local overrides, or private review notes. `dev_locals/` is ignored by git for this purpose.

## Reviewed Import CSV

The import script and one-line pipeline accept only publication-ready reviewed CSV with this exact header:

```csv
shopId,priceRecordId,shopName,address,district,borough,lat,lng,status,observedAt,priceCents,productType,sourceType,confidence,sourceUrl,notes
```

Field rules:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `shopId` | Text slug | Yes | Stable lowercase dash-separated shop id, for example `douran-doener-kreuzberg`. |
| `priceRecordId` | Text slug | Yes | Unique price record id, for example `price-douran-doener-kreuzberg-2026-06-03-standard-doener`. |
| `shopName` | Text | No | Public shop name when known. |
| `address` | Text | Yes | Verified Berlin shop address. |
| `district` | Text | Yes | Ortsteil or commonly used neighborhood label. |
| `borough` | Text | Yes | Official Bezirk. |
| `lat` | Number | Yes | Verified latitude in Berlin bounds. |
| `lng` | Number | Yes | Verified longitude in Berlin bounds. |
| `status` | Enum text | Yes | `active`, `closed`, or `unknown`. |
| `observedAt` | ISO date text | Yes | `YYYY-MM-DD`. |
| `priceCents` | Integer text/number | Yes | Store cents, not EUR floats. `7.00` EUR becomes `700`. |
| `productType` | Enum text | Yes | One of the internal product values above. |
| `sourceType` | Enum text | Yes | One of the internal source values above. |
| `confidence` | Integer text/number | Yes | `0` to `100`; usually source default adjusted by review quality. |
| `sourceUrl` | URL text | No | Only stable public URLs. Leave empty for manual observation or private evidence. |
| `notes` | Text | No | Concise public-safe provenance only. |

The script appends new price records and creates new shops when needed. It rejects duplicate price record ids and conflicting metadata for existing shops.

## Normalize A Raw Response

Use this checklist for each raw form row:

1. Confirm the row identifies a real Berlin shop through address or strong context.
2. Verify address, district, borough, latitude, longitude, and shop status.
3. Check whether the shop already exists in `data/shops.json`.
4. Create or reuse a stable `shopId`.
5. Create a unique `priceRecordId`.
6. Convert the date to `YYYY-MM-DD`.
7. Convert the price to integer cents.
8. Map product and source choices to internal enum values.
9. Choose `confidence` from source type and evidence quality.
10. Remove private details from `sourceUrl` and `notes`.

Example reviewed row:

```csv
shopId,priceRecordId,shopName,address,district,borough,lat,lng,status,observedAt,priceCents,productType,sourceType,confidence,sourceUrl,notes
douran-doener-kreuzberg,price-douran-doener-kreuzberg-2026-06-03-standard-doener,Douran Döner,Example Straße 1 10999 Berlin,Kreuzberg,Friedrichshain-Kreuzberg,52.5001,13.4201,active,2026-06-03,700,standard_doener,user_submission,65,,Reviewed public form submission; standard Doener price.
```

## Import Reviewed Data

Dry-run first:

```bash
mise exec -- corepack pnpm import:reviewed-data -- dev_locals/data/reviewed-imports/2026-06-04-reviewed-data.csv
```

Write only after the dry run passes:

```bash
mise exec -- corepack pnpm import:reviewed-data -- dev_locals/data/reviewed-imports/2026-06-04-reviewed-data.csv --write
```

The script also supports the shorter local form:

```bash
mise exec -- corepack pnpm import:reviewed-data dev_locals/data/reviewed-imports/2026-06-04-reviewed-data.csv
```

After writing, run:

```bash
mise exec -- corepack pnpm validate:data
mise exec -- corepack pnpm check
mise exec -- corepack pnpm typecheck
mise exec -- corepack pnpm test:run
mise exec -- corepack pnpm build
```

## Lessons From The Provided CSV

The sample file `Berlin Döner Price Collection (Antworten) - Formularantworten 1.csv` is useful as a raw response export, but it cannot be imported directly.

Observed headers:

```csv
Zeitstempel,Shop name,Observed at,"Price(cents, i.g 700)",Product Type,Source Type,confidence,sourceUrl,notes
```

Problems to fix during review:

- The header does not match the canonical reviewed import header.
- `Zeitstempel` is a Google Forms submission timestamp. Keep it for local audit if useful, but do not publish it.
- `Shop name` alone is not enough; the reviewed CSV also needs a verified address, district, borough, latitude, longitude, and status.
- `Observed at` uses `DD.MM.YYYY`; convert it to `YYYY-MM-DD`.
- `Price(cents, i.g 700)` is already cents, but public forms should usually ask for EUR and the maintainer should normalize to cents.
- `Product Type = Standard` must become `standard_doener`.
- `Source Type = On site` must be reviewed and mapped to `manual_observation` or `user_submission`.
- `confidence` is blank, but the reviewed import requires an integer from `0` to `100`.
- `sourceUrl` and `notes` are optional, but any published values must be public-safe.
- `shopId` and `priceRecordId` must be added by the maintainer.

Expected failure before normalization:

```txt
Reviewed data CSV header must be: shopId,priceRecordId,shopName,address,district,borough,lat,lng,status,observedAt,priceCents,productType,sourceType,confidence,sourceUrl,notes
```

This failure is correct. It protects production data from raw, incomplete, or private form responses.

## Future Idea

If submissions are too hard to verify later, consider adding an optional source-context field. Keep it optional unless review quality clearly requires more evidence detail.
