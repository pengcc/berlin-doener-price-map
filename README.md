# Berlin Döner Price Map

Berlin Döner Price Map is a dataset-first local data product for finding and comparing Döner prices in Berlin.

- DE: Dönerpreise in Berlin finden und vergleichen.
- EN: Find and compare Döner prices in Berlin.
- ZH: 在柏林地图上查看并比较 Döner 价格。

The project is designed as a practical technical showcase: a low-cost Next.js app, transparent static data, manual review, map visualization, rankings, district statistics, and a simple contribution workflow for non-technical users.

## Status

This repository has a runnable Next.js scaffold with locale-prefixed placeholder routes for German, English, and Chinese. Product data, map features, rankings, district statistics, and submission workflows are planned but not implemented yet.

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
- `/submit` with Tally/Google Form, GitHub Issue, and email contribution paths.
- `/methodology` explaining sources, manual review, freshness, confidence, ranking rules, and limitations.

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
pnpm check
pnpm check:fix
pnpm typecheck
pnpm build
```

Deferred until later phases:

```bash
pnpm test:run
pnpm test:e2e
pnpm validate:data
```

Initial localized routes:

```txt
/de
/en
/zh
```

## Roadmap

1. Done: project scaffold with Next.js, TypeScript, Tailwind v4, Biome, pnpm, mise, `next-intl`, and base localized routes.
2. Data foundation: schemas, sample data files, CSV loading, Zod validation, data validation script.
3. Core calculations: latest prices, ranking rules, confidence/freshness labels, district statistics.
4. First product pages without map: homepage, prices, ranking, districts, methodology.
5. Map MVP: React Leaflet map, MapTiler configuration, price markers, popups, filters.
6. Contribution flow: submit page, external form links, GitHub issue template, review workflow docs.
7. Quality and deployment: Vitest coverage, basic Playwright smoke tests, GitHub Actions, Vercel deployment.

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
