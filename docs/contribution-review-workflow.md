# Contribution Review Workflow

Berlin Döner Price Map accepts public price observations and corrections only as review inputs. Submitted data is not public until it has been checked and committed to the static data files.

## Intake Channels

- GitHub price observation issue form: use for shop, address, product, date, price, and source context.
- GitHub data correction issue form: use for wrong prices, shop status, address, duplicate, or metadata corrections.
- Optional public form: configured with `DOENER_PRICE_FORM_URL` when a non-technical submission form exists.
- Optional correction contact: configured with `DOENER_CORRECTION_URL` or `DOENER_CORRECTION_EMAIL`; URL takes precedence over email.

Do not commit private form administration URLs, private inbox addresses, service credentials, API keys, or private submitter details.

## Triage

1. Confirm the submission contains enough context: shop or address, product type, observed date, price, and source context.
2. Reject or request clarification for entries that are anonymous hearsay, lack a usable date, or cannot identify a Berlin shop.
3. Normalize prices to integer cents and product types to the documented enum values.
4. Check whether the shop already exists in `data/shops.json`; avoid creating duplicates.
5. Verify address, district, borough, and coordinates before adding or changing shop records.
6. Assign confidence using the source and evidence quality rules in `docs/data-schema.md`.
7. Record only public-safe source context in `data/price-records.csv`; never store private contact information.

## Data Edits

Use the static data files as the publication boundary:

- `data/shops.json` for shop identity, address, district, borough, coordinates, URLs, and status.
- `data/price-records.csv` for reviewed observations.
- `data/districts.json` only when district metadata needs a reviewed correction.

Prefer adding a new price observation over editing historical price records. Correct existing records only when the prior value was clearly wrong.

## Validation

Run the closest relevant checks before publishing reviewed data:

```bash
mise exec -- corepack pnpm validate:data
mise exec -- corepack pnpm validate:demo-data
mise exec -- corepack pnpm check
mise exec -- corepack pnpm typecheck
mise exec -- corepack pnpm test:run
mise exec -- corepack pnpm build
```

Close or update the source issue only after the reviewed data change has passed validation and is merged.
