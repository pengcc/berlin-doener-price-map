# Implementation Guardrails

## Cost and External Services

The project has no meaningful revenue, so the target recurring cost is zero. Near-zero/free-tier services are acceptable only when they do not create surprise billing risk and are explicitly justified.

- Prefer static hosting and static files.
- Do not introduce paid APIs, paid services, billing-enabled accounts, usage-based services, or features with possible overage charges by default.
- If any action can create costs now or later, warn the user first, explain the cost/risk surface, and get explicit confirmation before proceeding.
- Environment-gate map tile providers and form links.
- Keep optional service setup documented but not required for local development.
- Do not commit API keys, form admin URLs, private submission data, or personal contact details from submitters.
- Do not enable Vercel Analytics by default. Add it only after an explicit decision about privacy, user disclosure, and value.

## Official Documentation Policy

When implementation depends on library behavior, consult official docs first. This matters especially for:

- Next.js App Router, Server Components, metadata, caching, and routing.
- `next-intl` App Router setup and locale routing.
- React and React DOM behavior.
- Biome installation, configuration, CLI commands, and CI behavior.
- React Leaflet and Leaflet browser-only integration.
- MapTiler or chosen tile-provider attribution and API-key rules.
- OpenStreetMap tile usage policy if using OSM Foundation tiles even temporarily.
- shadcn/ui component installation and Tailwind compatibility.
- TanStack Table sorting/filtering state.
- Zod schema and parsing behavior.
- Vitest and Playwright setup.

## Frontend Constraints

- Build the actual tool first, not a marketing landing page.
- Keep information dense and scannable.
- Use responsive constraints so map, tables, filters, cards, and badges do not overlap on mobile.
- Use accessible labels for filters, marker popups, table controls, and icon buttons.
- Use locale-aware formatting for euros and dates.
- Do not use decorative UI that obscures data or makes the product feel less practical.

## React and Next.js Constraints

- Use Server Components by default for pages and static data rendering.
- Use Client Components for Leaflet maps, interactive filters, TanStack tables, charts, and components needing browser APIs.
- Keep data parsing and calculation outside React components.
- Avoid fetching local static data from client components when it can be prepared on the server.
- Do not add global state management unless a real shared-state problem appears.

## Data and Privacy Constraints

- Keep submitted contact information out of public data files.
- Keep source URLs public only when they are intended to be public.
- Treat delivery platform prices as lower confidence because they may differ from in-store prices.
- Avoid scraping or republishing third-party content without checking terms.
- Make uncertainty visible through confidence labels, outdated states, and methodology text.

## Code Quality

- Keep TypeScript strict and avoid `any` unless there is a narrow, documented reason.
- Use Biome for formatting, linting, and import organization. Do not add Prettier, ESLint, or Tailwind Prettier plugins unless the user explicitly changes the tooling decision.
- Prefer `pnpm check` / `pnpm check:fix` as the main local quality command once scripts exist.
- Use Zod at file and input boundaries; infer TypeScript types from schemas where practical.
- Keep pure calculation functions deterministic and covered by unit tests.
- Prefer small modules with direct names over premature abstractions.
- Add shadcn/ui components selectively; do not generate a large component set before it is needed.
- Keep comments sparse and useful.

## Planning Discipline

Use a saved local plan for substantial implementation work. The local workflow is:

1. `berlin-doener-plan-with-context` creates `dev_locals/plans/YYYY-MM-DD-feature-slug.md` and updates `dev_locals/plans/_index.md`.
2. `berlin-doener-execute-plan` implements the plan and updates status, deviations, bugs, and validation results in the plan.
3. `berlin-doener-sync-guideline` promotes confirmed recurring lessons from the completed plan into the project guideline.

Do not require a saved plan for trivial edits, documentation cleanup, or one-file changes unless the user asks. Keep `dev_locals/` ignored by git unless the user explicitly chooses to version plans.

## Work Time Tracking

Track project work time in `dev_locals/work-log.md`. Keep actual time entries out of the project guideline because they are local project-management history, not reusable engineering rules.

Use approximate wall-clock time rounded to minutes. Record date, start/end time, duration, timezone, and a short activity summary. Append new sessions as work happens, and keep a running total when practical.

For substantial tasks and saved-plan execution, automatically track a work session:

- Start when execution begins.
- Close when the task completes, pauses, is interrupted, or switches to another task.
- If the session is interrupted and resumed later, record an approximate entry and mark it `estimated` when needed.
- If the user says not to count a discussion or task, exclude it from the work log.

## Git Workflow for Saved Plans

For saved plan execution, the agreed default is:

- Create or switch to a plan-specific branch before implementation when not already on an appropriate branch.
- Commit related changes after successful execution or a coherent checkpoint, unless the user asks not to commit.
- Do not push to a remote unless the user explicitly asks to push.
- Do not revert unrelated user changes. Work around them or pause only if they make the plan impossible.

Read `references/permission-policy.md` before requesting escalated commands or saved command prefix approvals. Treat that file as the project source of truth for safe prefixes, always-ask actions, and forbidden actions.

## Verification Checklist

Before finishing changes, run the closest available checks:

- `pnpm check` for Biome formatting/linting/import diagnostics, or `pnpm lint` if the current scripts only expose linting
- `pnpm typecheck`
- `pnpm test:run` or `pnpm test`
- `pnpm validate:data` or the current data validation command
- `pnpm exec playwright test` for route/map smoke tests when Playwright exists and the app is runnable

If a check does not exist yet, say so clearly and add it only when it fits the task.

## Version Decisions

Current baseline decisions:

- Node.js: 24 LTS, managed by `mise`.
- Package manager: pnpm only, pinned exactly in `packageManager` to pnpm 10.x until Vercel documents pnpm 11 support.
- Formatter/linter/import organizer: Biome.
- Unit/data tests: Vitest.
- Browser/e2e tests: Playwright.
- Runtime data validation: Zod.
- Type checking: TypeScript via `tsc --noEmit`.
- Next.js/React versions: initialize from current stable `latest`, then rely on `pnpm-lock.yaml` for exact reproducibility.
- Tailwind CSS: v4 unless official compatibility guidance requires otherwise.
- i18n routing: explicit locale prefixes for German, English, and Chinese.
- Deployment: Vercel.
- Map tile provider: MapTiler for production; OSM Foundation tiles only as a local/light development fallback.
- Vercel Analytics: off by default.
- CSV parsing: use `csv-parse`, not ad hoc string splitting.
- Commit hooks: omit for MVP; rely on explicit commands and CI.
- License: MIT for code if open sourced; document dataset provenance and reuse rules separately.

## CI Policy

Use lightweight GitHub Actions once the project is pushed to GitHub. CI should run before merge or on pushes to main:

- `pnpm install --frozen-lockfile`
- `pnpm check`
- `pnpm typecheck`
- `pnpm test:run`
- `pnpm validate:data`
- `pnpm build`

Add Playwright smoke tests to CI after the first stable UI/map implementation. Do not block early project setup on full e2e coverage.

## Good Future Skills to Combine

Useful optional skills for future Codex work:

- A Next.js App Router best-practices skill focused on Server Components, routing, metadata, caching, and i18n.
- A React UI quality skill focused on accessibility, responsive states, forms, tables, and map-heavy layouts.
- A Biome quality-tooling skill focused on project scripts, config, CI, and style-policy enforcement.
- A data-validation skill focused on Zod schemas, CSV/JSON ingestion, deterministic tests, and CI checks.
- A Playwright smoke-testing skill for local frontend verification.
- A GitHub PR/CI skill for reviewing changes, fixing checks, and publishing small PRs.
