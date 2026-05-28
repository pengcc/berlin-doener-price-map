# Project Instructions

Before planning or changing code, docs, data, dependencies, scripts, or architecture in this repository, read the local skill:

`codex-skills/berlin-doener-project-guideline/SKILL.md`

Then read the relevant files under:

`codex-skills/berlin-doener-project-guideline/references/`

Use `pnpm` instead of `npm` or `yarn`; pin pnpm 10.x exactly in `packageManager` until Vercel documents pnpm 11 support. Use Node.js 24 LTS via `mise`. Use Biome for formatting, linting, and import organization; use Vitest, Playwright, and Zod-backed data validation for tests/checks. Keep the Berlin Döner Price Map MVP dataset-first, multilingual (`de`, `en`, `zh`) with explicit locale prefixes, low-cost, Vercel-deployed, and scoped to the explicitly documented product features.

For substantial work, use the local workflow skills:

- `codex-skills/berlin-doener-plan-with-context/SKILL.md` to create a saved plan.
- `codex-skills/berlin-doener-execute-plan/SKILL.md` to execute and update a saved plan.
- `codex-skills/berlin-doener-sync-guideline/SKILL.md` to sync confirmed plan learnings back into the project guideline.

Saved plans live in `dev_locals/plans/`, which is local working memory and ignored by git by default.
