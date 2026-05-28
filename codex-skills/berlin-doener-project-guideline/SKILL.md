---
name: berlin-doener-project-guideline
description: Project-specific guardrails for Berlin Döner Price Map. Use when Codex works in this repository or plans, edits, reviews, tests, or documents the app, data files, map, i18n, Next.js/React components, validation scripts, project architecture, or product scope. Always use before making code, dependency, data schema, or feature changes for this project.
---

# Berlin Döner Project Guideline

## Overview

Use this skill as the project briefing and scope guard for Berlin Döner Price Map, a low-cost, dataset-first local data product for community-curated Döner prices in Berlin. The goal is a practical technical showcase with strong data quality, multilingual support, and restrained MVP scope.

## Required Preflight

Before changing code, docs, data, dependencies, scripts, or architecture:

1. Read this `SKILL.md`.
2. Read the relevant reference files:
   - `references/product-scope.md` for product behavior and allowed pages.
   - `references/architecture.md` for stack, directory shape, and dependency choices.
   - `references/data-rules.md` before changing data loading, schemas, validation, rankings, confidence, or statistics.
   - `references/implementation-guardrails.md` before adding dependencies, components, tests, or external services.
3. Inspect the current repository state. Prefer existing patterns over rewriting structure.
4. Use `pnpm` for all package and script commands. Do not use `npm`, `yarn`, or lockfiles from those tools.
5. If current technical behavior matters and official documentation exists, check official docs first, especially for Next.js, React, next-intl, Biome, React Leaflet, Leaflet, MapTiler, shadcn/ui, TanStack Table, Zod, Vitest, and Playwright.

## Project Rules

- Build an MVP around static CSV/JSON data, not a database.
- Support German, English, and Chinese UI/content. Do not hardcode user-facing strings in components once i18n is introduced.
- Keep recurring costs at zero by default. If any action can create costs now or later, warn the user, explain the cost/risk surface, and get explicit confirmation before proceeding.
- Keep the product focused: map, price list, rankings, district statistics, submission links, methodology, and project/about content.
- Do not add auth, admin dashboard, Prisma, PostgreSQL/Supabase, OCR, crawler, complex geocoding, payment, user accounts, or Google Maps API unless the user explicitly requests that expansion.
- Treat data quality as a core feature: validate data at build/CI time, show sample counts and recency, and avoid implying precision that the dataset cannot support.
- Prefer server components and pure data utilities by default. Use client components only for maps, filters, tables, charts, and other interactive UI.
- Use Biome as the project formatter/linter/import organizer. Do not introduce Prettier or ESLint unless the user explicitly changes this decision or a tool gap is documented.
- Use Vitest for pure data and utility tests, Playwright for browser smoke/e2e tests, and Zod-backed scripts for data validation.

## Workflow

When implementing a request:

1. Classify whether the request touches product scope, architecture, data rules, UI, i18n, or quality tooling.
2. Load only the reference files needed for that category.
3. State any tradeoff if the request conflicts with MVP scope or no-cost constraints.
4. Make the smallest coherent change that satisfies the request.
5. Add or update tests/validation when data logic, ranking logic, confidence, parsing, or route-level behavior changes.
6. Run the closest available checks. At minimum, prefer `pnpm check`, `pnpm typecheck`, `pnpm test:run`, `pnpm validate:data`, and `pnpm build` when those scripts exist.
7. Update project docs or methodology only when behavior, schema, or public data rules actually changed.

For substantial work that may span multiple files, sessions, or architectural choices, use the local workflow skills:

- `codex-skills/berlin-doener-plan-with-context/SKILL.md` to create a saved implementation plan.
- `codex-skills/berlin-doener-execute-plan/SKILL.md` to execute a saved plan and keep it synchronized.
- `codex-skills/berlin-doener-sync-guideline/SKILL.md` to sync confirmed learnings back into this guideline after execution.

Saved plans live under `dev_locals/plans/`, which is local working memory and ignored by git by default.

When executing a saved plan, use the agreed git workflow:

- Create or switch to a plan-specific branch before implementation when not already on an appropriate branch.
- Commit related changes after successful execution or a coherent checkpoint.
- Do not push to a remote unless the user explicitly asks to push.

## Reference Map

- Product scope: `references/product-scope.md`
- Technical architecture: `references/architecture.md`
- Data model and calculations: `references/data-rules.md`
- Engineering guardrails: `references/implementation-guardrails.md`

## Escalation Rules

If a user asks for a feature outside MVP scope, first explain the cost, complexity, and data-quality impact. Implement it only when the user confirms or when the request is explicit and narrow.
