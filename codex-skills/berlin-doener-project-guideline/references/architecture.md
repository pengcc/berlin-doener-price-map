# Architecture

## Stack Decision

Target stack:

- Next.js App Router with TypeScript. Use the current stable Next.js version from official docs/package metadata when scaffolding; the project plan targets Next.js 16.
- Node.js 24 LTS for local development, CI, and deployment. Next.js 16 requires at least Node.js 20.9, but Node 24 is the preferred supported line for this project.
- `mise` for local runtime management. Prefer a committed `.mise.toml` with Node pinned to the 24 LTS line.
- `pnpm` as the only package manager. Pin pnpm 10.x exactly in `packageManager`; Vercel's documented support currently covers pnpm 6-10, so do not use pnpm 11 until Vercel support is confirmed.
- React Server Components by default.
- Tailwind CSS v4 plus selectively added shadcn/ui components, unless current shadcn/ui setup guidance requires a different compatible path.
- `next-intl` for German, English, and Chinese support.
- Static data files in `/data`: `shops.json`, `price-records.csv`, `districts.json`.
- Zod for runtime validation and TypeScript inference at data boundaries.
- Biome for formatting, linting, and import organization.
- React Leaflet for MVP maps.
- MapTiler as the production map tile provider, configured by environment variable.
- TanStack Table for price list sorting/filtering when table complexity justifies it.
- Recharts for district charts when the statistics page needs charts; tables are acceptable first.
- Vitest for pure data utility tests.
- Playwright for smoke tests of critical pages/map when the app is runnable.
- Vercel for deployment.
- No Vercel Analytics by default; add analytics only if the user explicitly accepts the privacy and product tradeoff.
- GitHub Actions for lightweight data validation and quality checks once the project is on GitHub.

Use `pnpm` only. Do not add `package-lock.json`, `npm-shrinkwrap.json`, or `yarn.lock`.

Version policy:

- Initialize Next.js/React with the current stable `latest` packages, then let `pnpm-lock.yaml` pin exact dependency versions.
- Pin manually installed tools that strongly affect formatting or CI behavior when official docs recommend exact installs, such as Biome.
- Keep framework dependency bumps intentional and review release notes before major upgrades.

## Runtime and Tool Versions

Recommended runtime setup:

```toml
# .mise.toml
[tools]
node = "24"
```

Recommended `package.json` fields once the app is initialized:

```json
{
  "engines": {
    "node": ">=24 <25"
  },
  "packageManager": "pnpm@10.34.1"
}
```

Pin exact tool package versions through `pnpm-lock.yaml`. For Biome specifically, install it as an exact dev dependency:

```txt
pnpm add -D -E @biomejs/biome
```

Use `mise install` for local runtime setup. If exact runtime reproducibility becomes important, add and maintain `mise.lock`; otherwise `node = "24"` is acceptable for a personal low-cost project.

Use Corepack locally if available so the `packageManager` field selects the pinned pnpm version. On Vercel, use default package-manager detection unless a project-specific issue requires enabling Corepack through Vercel settings.

## Quality Tooling

Biome is the formatter, linter, and import organizer. Use scripts like:

```json
{
  "scripts": {
    "check": "biome check .",
    "check:fix": "biome check --write .",
    "format": "biome format --write .",
    "format:check": "biome format .",
    "lint": "biome lint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:run": "vitest run",
    "test:e2e": "playwright test",
    "validate:data": "tsx scripts/validate-data.ts"
  }
}
```

Use `biome ci .` in CI when the command is available in the installed Biome version. Use `biome check .` locally to combine formatting diagnostics, linting, and import organization.

Testing policy:

- Vitest covers pure TypeScript utilities: parsing, joining, latest-price selection, ranking, median/average, confidence, formatting, and validation helpers.
- Playwright covers browser behavior: route smoke tests, locale routes, table filtering/sorting, map rendering, marker popups, and critical responsive checks.
- Zod-backed data validation scripts cover CSV/JSON schema, referential integrity, duplicate ids, enum values, coordinates, and stale/outdated handling.

## Suggested Directory Shape

If the repository is still empty, prefer:

```txt
src/
  app/
    [locale]/
      page.tsx
      map/page.tsx
      prices/page.tsx
      ranking/page.tsx
      districts/page.tsx
      submit/page.tsx
      methodology/page.tsx
  components/
    map/
    prices/
    ranking/
    districts/
    ui/
  i18n/
  lib/
    data/
    map/
    price/
    validation/
data/
  shops.json
  price-records.csv
  districts.json
docs/
  project-guideline.md
  data-schema.md
  data-methodology.md
  roadmap.md
scripts/
  validate-data.ts
  check-duplicates.ts
  generate-summary.ts
messages/
  de.json
  en.json
  zh.json
```

If the project already uses root-level `app/`, follow that existing structure rather than moving files just to match this reference.

## Map Architecture

React Leaflet is suitable for the MVP because it is quick to build and enough for price markers and filters. Leaflet touches browser APIs, so map components must be client-only. In Next.js App Router, isolate the map behind a client component and use dynamic import with server-side rendering disabled if Leaflet causes `window` or hydration issues.

Do not rely on `tile.openstreetmap.org` as the production tile CDN. OSM data is open, but OSM Foundation tile servers have usage limits and no SLA. Keep the tile URL and attribution configurable through environment variables.

Preferred MVP tile strategy:

- Development fallback: OSM Foundation raster tiles are acceptable for local development and very light manual testing when attribution, referrer, caching, and usage policy are respected.
- Production default: MapTiler free non-commercial plan because it supports vector and XYZ raster tiles, has clear request/session quotas, and pauses rather than creating surprise overage on the free plan.
- Alternative only if MapTiler is unsuitable later: Stadia Maps free plan is usable for non-commercial standard basemaps, with credit limits and no additional usage beyond the free quota.
- Avoid as default: CARTO basemaps now point commercial usage toward Enterprise licensing and grants; do not assume public no-key basemap usage is an appropriate production default.

If the selected provider requires an API key, document it as a public client-side map key, restrict it where the provider allows, and do not commit private dashboard/admin credentials.

## i18n Architecture

Required locales: `de`, `en`, `zh`.

Prefer `next-intl` with message JSON files and locale-based routing. All public routes should use explicit locale prefixes such as `/de/...`, `/en/...`, and `/zh/...`. German is the default content language, but default locale routing should still be documented and consistent.

Use stable message keys and keep user-facing labels, buttons, page headings, empty states, badges, and disclaimers in messages. Format currency, dates, and numbers through locale-aware utilities.

German should usually be the primary product language for Berlin users, with English and Chinese fully usable.

## Data Loading Architecture

Data should be loaded from static files at build/server time. Keep parsing, joining, latest-price selection, ranking, statistics, and confidence logic in pure functions under `lib/` so they can be tested without rendering React.

Use `csv-parse` for CSV ingestion in Node/TypeScript scripts and server-side data loading. Do not hand-write CSV parsing with string splitting.

Current data foundation modules:

- `src/lib/data/read-data-file.ts`
- `src/lib/data/load-shops.ts`
- `src/lib/data/load-price-records.ts`
- `src/lib/data/load-districts.ts`
- `src/lib/data/load-data.ts`
- `src/lib/validation/schemas.ts`
- `src/lib/validation/validate-data.ts`
- `scripts/validate-data.ts`
- `vitest.config.ts`

Future data modules should follow the same pure-utility style:

- `src/lib/data/get-latest-prices.ts`
- `src/lib/data/calculate-district-stats.ts`
- `src/lib/price/confidence.ts`
- `src/lib/price/format-price.ts`

Use `vitest.config.ts` with the Node test environment for pure data and validation utilities. Browser behavior belongs in Playwright once UI routes exist.

## Dependency Policy

Add dependencies only when they remove real implementation risk or match the planned stack. Prefer official docs and current package guidance before installing. Avoid adding services that require billing, secret management, hosted databases, or proprietary APIs for MVP.

Do not add commit hooks such as lefthook, Husky, or lint-staged during the MVP unless the user asks. Prefer explicit `pnpm check` and CI.

## Licensing

If the project is published as open source, use MIT for code unless the user chooses a different license. Document data provenance and reuse separately because the dataset may combine user submissions, manual observations, and referenced public sources with different expectations.

## CI Architecture

The GitHub Actions workflow check name `Quality` is part of the repository merge gate. Preserve that check name when editing `.github/workflows/ci.yml`, because branch protection depends on it.

The current `Quality` workflow should run:

- `pnpm check`
- `pnpm typecheck`
- `pnpm test:run`
- `pnpm validate:data`
- `pnpm build`

Add Playwright smoke checks later, after the first stable browser-facing routes and map implementation exist.
