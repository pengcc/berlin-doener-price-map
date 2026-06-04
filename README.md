# Berlin Döner Price Map

Berlin Döner Price Map is a dataset-first local data product for finding and comparing Döner prices in Berlin.

- DE: Dönerpreise in Berlin finden und vergleichen.
- EN: Find and compare Döner prices in Berlin.
- ZH: 在柏林地图上查看并比较 Döner 价格。

The project is designed as a practical technical showcase: a low-cost Next.js app, transparent static data, manual review, map visualization, rankings, district statistics, and a simple contribution workflow for non-technical users.

## Status

This repository has a runnable Next.js app with locale-prefixed routes for German, English, and Chinese. Static data files, validation, tests, pure read-model utilities, first product pages, opt-in demo data, the Map MVP, a manually reviewed contribution flow, and launch-readiness smoke checks are implemented.

Current local project guidance lives in:

- [AGENTS.md](./AGENTS.md)
- [codex-skills/berlin-doener-project-guideline/SKILL.md](./codex-skills/berlin-doener-project-guideline/SKILL.md)

Any future Codex work in this repository should read the local skill before changing code, data, dependencies, or architecture.

## MVP Scope

The MVP will provide:

- Homepage with project summary, sample count, average price, cheapest/most expensive preview, and submit CTA.
- `/map` with Berlin shop markers, price labels, popups, and filters.
- `/prices` with searchable, sortable, filterable price table.
- `/ranking` for cheapest, most expensive, recently updated, and high-confidence prices.
- `/districts` with average, median, min, max, sample count, and last update per district.
- `/submit` with GitHub issue forms, optional public form, and optional correction contact paths.
- `/methodology` explaining sources, manual review, freshness, confidence, ranking rules, and limitations.
- `/imprint` with provider placeholders and data disclaimers that must be completed before public deployment.

Out of scope for MVP:

- Database, Prisma, Supabase/PostgreSQL, auth, user accounts, or admin dashboard.
- OCR, crawlers, automated scraping, or real-time unreviewed public submissions.
- Google Maps API.
- Vercel Analytics by default.

## Tech Decisions

- Framework: Next.js App Router with TypeScript.
- Runtime: Node.js 24 LTS, managed by `mise`.
- Package manager: `pnpm`, pinned to the 10.x line in `packageManager`.
- Styling: Tailwind CSS v4 plus selective shadcn/ui components.
- Formatting/linting/import organization: Biome.
- i18n: `next-intl` with explicit locale prefixes for `de`, `en`, and `zh`.
- Data: static CSV/JSON files under `/data`.
- CSV parsing: `csv-parse`.
- Validation: Zod.
- Map: React Leaflet with MapTiler for production tiles.
- Tables: TanStack Table when table complexity justifies it.
- Charts: Recharts when district visualizations are needed.
- Tests: Vitest for pure utilities, Playwright for browser smoke/e2e tests.
- Deployment: Vercel.
- CI: lightweight GitHub Actions for checks, tests, data validation, and build.
- License: MIT for code if open sourced; dataset provenance/reuse rules should be documented separately.

## Data Model

Planned static data files:

```txt
data/
  shops.json
  price-records.csv
  districts.json
```

Shop records contain stable shop/location data such as `id`, optional `name`, `address`, `district`, `borough`, `lat`, `lng`, optional URLs, and status.

Price records contain observed price data such as `id`, `shopId`, `observedAt`, `priceCents`, `productType`, `sourceType`, `confidence`, optional `sourceUrl`, and notes.

Key data rules:

- Store prices as integer cents, not floats.
- Default ranking uses `productType = standard_doener`.
- Use the latest price per `shopId + productType`.
- Exclude prices older than 180 days from default rankings and mark them as outdated.
- Always show sample count, last updated date, and confidence/freshness context.

## Development Commands

Available scaffold commands:

```bash
pnpm dev
pnpm generate:demo-data
pnpm check
pnpm check:fix
pnpm typecheck
pnpm test
pnpm test:run
pnpm test:e2e
pnpm import:reviewed-data
pnpm validate:data
pnpm validate:demo-data
pnpm build
```

The initial public data files are intentionally empty/header-only until verified seed data is added. Generated presentation data lives under `data/demo/` and can be selected in the UI or through static demo routes such as `/de/demo/prices`; real data remains at routes such as `/de/prices`. See [docs/data-schema.md](./docs/data-schema.md).

Initial localized routes:

```txt
/de
/en
/zh
/de/map
/de/prices
/de/ranking
/de/districts
/de/methodology
/de/submit
/de/imprint
/de/demo/map
```

## Local LAN Development

Next.js development resources such as `/_next/webpack-hmr` are protected from unexpected cross-origin access. This can appear during LAN testing when opening the dev server through a local IP address. Configure only the local origins you need:

```bash
NEXT_ALLOWED_DEV_ORIGINS=192.168.178.113
```

This setting is for local development only. It is not expected to be needed on Vercel preview or production deployments.

## Map Tile Configuration

The map uses React Leaflet. Production tiles require a public MapTiler key:

```bash
NEXT_PUBLIC_MAPTILER_API_KEY=...
```

When that key exists, the app loads MapTiler `streets-v4` raster tiles. Without a key, local development can use OpenStreetMap tiles for light manual verification, but production shows a no-key notice instead of loading external fallback tiles.

## Contribution Configuration

The public submit page links to structured GitHub issue forms for price observations and data corrections. Public submissions remain review inputs only and do not publish data directly or write to a backend.

An optional public form can be added by creating a Tally, Google Form, or similar no-cost form manually and configuring only its public URL. The form should collect public-friendly review inputs, while internal ids, coordinates, confidence, and publication-safe notes are added later by a maintainer. See [docs/public-form-data-operations.md](./docs/public-form-data-operations.md) for the recommended form fields, CSV staging workflow, reviewed CSV format, and import commands.

After creating the form:

1. Copy the public respondent URL, not the admin/edit URL.
2. Set `DOENER_PRICE_FORM_URL` in the local or Vercel environment.
3. Rebuild/redeploy so `/submit` shows the public form card.
4. Keep GitHub issue forms enabled as the always-available fallback.

```bash
DOENER_PRICE_FORM_URL=...
DOENER_CORRECTION_EMAIL=...
DOENER_CORRECTION_URL=...
```

`DOENER_CORRECTION_URL` takes precedence over `DOENER_CORRECTION_EMAIL` when both are set. Public submissions remain review inputs only; see [docs/contribution-review-workflow.md](./docs/contribution-review-workflow.md).

If a maintainer bulk-entry tool becomes useful later, re-plan it as a shadcn/ui form-card workflow rather than a wide table, and keep it separate from the normal public submit experience.

Maintainers can import reviewed, publication-ready CSV rows with:

```bash
pnpm process:form-export
pnpm import:reviewed-data -- reviewed-data.csv
pnpm import:reviewed-data -- reviewed-data.csv --write
```

`process:form-export` is the preferred local one-line flow for Google Forms exports. It picks the newest raw CSV under ignored `dev_locals/data/form-submission/`, writes a reviewed draft, and updates production data only when required fields are complete and the reviewed import dry run passes. If local Node or pnpm versions are uncertain, use `mise exec -- corepack pnpm process:form-export`.

The lower-level import command is a dry run by default. `--write` updates `data/shops.json` and `data/price-records.csv` after the reviewed CSV includes shop ids, price record ids, coordinates, confidence, and public-safe notes. Raw Google Forms exports, reviewed drafts, and review overrides should stay under ignored `dev_locals/data/`.

For the first real seed, publish only direct observations from the last 30 days: in-store manual observations, dated menu photos, or official shop websites. Delivery-platform prices, third-party directory pages, hearsay, undated screenshots, private links, and uncertain addresses are excluded from the first seed. Use concise public-safe provenance notes and keep detailed review evidence in ignored local files.

## Deployment Readiness

Launch readiness is documented in [docs/deployment-readiness.md](./docs/deployment-readiness.md). The project targets Vercel with Node 24, pnpm 10, static data files, MapTiler production tiles through `NEXT_PUBLIC_MAPTILER_API_KEY`, and Vercel Analytics disabled by default.

Before public deployment, configure or review the Imprint fields:

```bash
DOENER_LEGAL_OPERATOR_NAME=...
DOENER_LEGAL_OPERATOR_ADDRESS=...
DOENER_LEGAL_CONTACT_EMAIL=...
```

The `/imprint` page includes learning/demo and data-accuracy disclaimers, but final legal content and real operator details require user review.

## Roadmap

1. Done: project scaffold with Next.js, TypeScript, Tailwind v4, Biome, pnpm, mise, `next-intl`, and base localized routes.
2. Done: data foundation with schemas, empty public data files, CSV loading, Zod validation, tests, and data validation script.
3. Done: core calculations for latest prices, ranking rules, confidence/freshness labels, district statistics, and summary data.
4. Done: first product pages without map: homepage, prices, ranking, districts, methodology, submit.
5. Done: demo data seed with optional generated unverified data, clearly labeled and distinguishable from verified records.
6. Done: Map MVP with React Leaflet, MapTiler configuration, price markers, popups, filters, and local-development OSM fallback.
7. Done: Contribution flow with optional external form links, GitHub issue forms, and review workflow docs.
8. Done: Quality and deployment readiness with Vitest coverage, Chromium Playwright smoke tests, GitHub Actions, and Vercel readiness docs.

## Development Principles

- Keep the MVP dataset-first and low-cost.
- Prefer simple static data and manual review before adding infrastructure.
- Keep user-facing UI available in German, English, and Chinese.
- Use official documentation when implementation details depend on framework or library behavior.
- Do not add features outside the documented scope without an explicit decision.

## Local Planning Workflow

For substantial implementation work, use the project-local workflow skills:

- `codex-skills/berlin-doener-plan-with-context/SKILL.md`
- `codex-skills/berlin-doener-execute-plan/SKILL.md`
- `codex-skills/berlin-doener-sync-guideline/SKILL.md`

Saved implementation plans are written to `dev_locals/plans/`. This directory is local working memory and is ignored by git by default.
