# Implementation Guardrails

## Operating Standard

Codex should act as a senior, product-minded full-stack web engineer for this project, not as a generic code generator. Apply senior-level discipline to branch hygiene, scope control, data contracts, validation, testing, UI behavior, and cost/privacy decisions.

Before changing code or docs, verify the repository state and the premise of the task. If a prior PR has merged, refresh `main` before creating the next feature branch. Avoid workflow shortcuts that create avoidable history cleanup or hidden rework.

## Mode and Skill Selection

Use the lightest workflow that still protects quality, cost, security, data contracts, and clean history.

- Saved local plans are the durable project memory for substantial work. Use them for multi-file implementation, architecture, data rules, routing, i18n, CI, deployment, roadmap, or workflow/guideline changes.
- Plan Mode is a collaboration aid for high-impact planning. Recommend it selectively for project guideline/workflow changes, architecture decisions, project-wide planning, roadmap changes, and decisions with long-term cost, security, privacy, deployment, or data-quality impact.
- Plan Mode does not replace `berlin-doener-plan-with-context`. If already in Plan Mode, still use the project planning skill to ground the plan in repository facts and save the plan under `dev_locals/plans/`.
- Do not recommend Plan Mode for every saved plan. Trivial edits, narrow bug fixes, simple documentation cleanup, and execution of already confirmed plans should stay lightweight unless the user asks.
- Use Goal only when the user explicitly asks to create a Goal, requests token-budgeted long-running tracking, or otherwise clearly opts into that mechanism. Do not convert ordinary implementation tasks into Goals.
- Use code-review stance when the user asks for a review. For normal implementation, use a lightweight self-review gate before substantial commits instead of producing a full formal review every time.
- Use browser verification for meaningful frontend, UI, responsive layout, map, chart, or interaction changes when the app is runnable. Prefer the in-app Browser or Playwright smoke tests depending on the task.
- Use `berlin-doener-publish-current-branch` when the user says `publish-current-branch`; that workflow uses `gh` CLI by default for PR creation and auto-merge, scoped to `pengcc/berlin-doener-price-map`.

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
- Keep initial production data empty/header-only until verified seed data is added through a separate plan with source and provenance decisions.
- Do not add fake public shops, fake public prices, or demo records to production `/data` files.

## Code Quality

- Keep TypeScript strict and avoid `any` unless there is a narrow, documented reason.
- Use Biome for formatting, linting, and import organization. Do not add Prettier, ESLint, or Tailwind Prettier plugins unless the user explicitly changes the tooling decision.
- Prefer `pnpm check` / `pnpm check:fix` as the main local quality command once scripts exist.
- Use Zod at file and input boundaries; infer TypeScript types from schemas where practical.
- Keep Zod-backed data validation deterministic: schema and referential-integrity errors fail, while stale or incomplete optional metadata can warn until the submission workflow requires stricter handling.
- `tsx` is acceptable for running TypeScript scripts, but it does not replace `pnpm typecheck`.
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

For project-wide planning and roadmap maintenance:

- Create or update a saved local plan instead of rewriting completed historical plans.
- Treat completed plans as historical records. Do not edit them for style consistency or hindsight cleanup unless the user explicitly asks.
- Promote only confirmed, recurring lessons into the project guideline through `berlin-doener-sync-guideline`.
- Keep one-off execution details, time tracking, and failed experiments in `dev_locals/`, not in durable guideline references.

When a saved plan is already in execution or has been marked completed and a meaningful change is needed, analyze before editing code. This applies to changes in scope, architecture, routes, data contracts, external service or cost surface, validation behavior, or user-facing product behavior. The required sequence is:

1. Analyze the alternatives and tradeoffs, including static vs dynamic rendering, cost, data-quality, and UX implications when relevant.
2. Update the saved plan with the changed decision, rationale, expected files, risks, and validation impact.
3. Then implement the code change.

If implementation reveals an unexpected issue before the plan is updated, stop as soon as the issue is understood, record the analysis and revised decision in the plan, then continue. Do not let code drift ahead of the saved plan for substantial changes.

Before committing substantial changes, perform a lightweight self-review and record the result in the plan when a saved plan exists. Check for behavioral bugs, branch-base mistakes, test gaps, cost/security/privacy implications, data-quality risks, and intentional omissions. This does not replace formal code review when the user explicitly asks for one.

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

- After a previous feature PR has merged, refresh local `main` from `origin/main` before starting the next plan.
- Create the next plan-specific branch from the updated `main`; do not create new feature branches from completed feature branches unless the user explicitly asks.
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

Keep the GitHub Actions job/check name `Quality` stable because branch protection uses that required check.

Add Playwright smoke tests to CI after the first stable UI/map implementation. Do not block early project setup on full e2e coverage.

## Good Future Skills to Combine

Useful optional skills for future Codex work:

- A Next.js App Router best-practices skill focused on Server Components, routing, metadata, caching, and i18n.
- A React UI quality skill focused on accessibility, responsive states, forms, tables, and map-heavy layouts.
- A Biome quality-tooling skill focused on project scripts, config, CI, and style-policy enforcement.
- A data-validation skill focused on Zod schemas, CSV/JSON ingestion, deterministic tests, and CI checks.
- A Playwright smoke-testing skill for local frontend verification.
- A GitHub PR/CI skill for reviewing changes, fixing checks, and publishing small PRs.
