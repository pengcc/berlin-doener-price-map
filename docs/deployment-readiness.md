# Deployment Readiness

Berlin Döner Price Map is designed for a low-cost Vercel deployment with static data files, manual review, and no analytics by default. This document is a readiness checklist only; it does not mean the project has been linked to a Vercel account or deployed.

## Vercel Project Settings

- Framework preset: Next.js.
- Node.js: use Node 24, matching `.mise.toml`, `package.json` engines, and CI.
- Package manager: pnpm 10 from the `packageManager` field.
- Install command: Vercel default pnpm install is acceptable; use frozen lockfile behavior if a project setting is needed later.
- Build command: `pnpm build`.
- Output directory: Vercel default for Next.js.
- Analytics: keep disabled unless a later explicit privacy/product decision enables it.

## Environment Variables

Required for production map tiles:

```txt
NEXT_PUBLIC_MAPTILER_API_KEY
```

Optional public contribution channels:

```txt
DOENER_PRICE_FORM_URL
DOENER_CORRECTION_EMAIL
DOENER_CORRECTION_URL
```

Do not add private form admin URLs, private inboxes, service credentials, billing-backed API keys, or secrets to the public app. `NEXT_PUBLIC_MAPTILER_API_KEY` is a public browser key; restrict it in the provider dashboard when possible.

## Pre-Deploy Checks

Run these locally before connecting or deploying:

```bash
mise exec -- corepack pnpm check
mise exec -- corepack pnpm typecheck
mise exec -- corepack pnpm test:run
mise exec -- corepack pnpm validate:data
mise exec -- corepack pnpm validate:demo-data
mise exec -- corepack pnpm build
mise exec -- corepack pnpm test:e2e
```

The production build should keep public routes statically prerendered and should not emit the previous whole-project output tracing warning.

## Post-Deploy Smoke Checks

After a deployment exists, manually verify:

- `/de`, `/en`, and `/zh` load with localized homepage headings.
- `/de/demo/prices` shows the unverified demo-data banner and demo rows.
- `/de/submit` links to the structured GitHub issue forms.
- `/de/map` uses MapTiler tiles when `NEXT_PUBLIC_MAPTILER_API_KEY` is set.
- If the key is missing, `/de/map` shows the no-key notice and does not load fallback OSM tiles in production.
- Mobile widths around 390 px have no horizontal overflow on homepage, demo prices, demo submit, and map.

## Rollback

Use Vercel's deployment history to promote the last known-good deployment if a release breaks. If bad data caused the issue, revert the data commit, run validation, and publish a normal fix PR rather than editing production data outside git.
