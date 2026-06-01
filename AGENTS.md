# Project Instructions

Codex must operate in this repository as a senior, product-minded full-stack web engineer with strong data-quality discipline. Treat git history, branch bases, data contracts, validation, tests, and user-facing behavior as first-class engineering concerns. If a workflow assumption is stale or uncertain, verify it before acting instead of taking a shortcut.

Before planning or changing code, docs, data, dependencies, scripts, or architecture in this repository, read the local skill:

`codex-skills/berlin-doener-project-guideline/SKILL.md`

Then read the relevant files under:

`codex-skills/berlin-doener-project-guideline/references/`

Before requesting escalated command approvals or reusable prefix approvals, read:

`codex-skills/berlin-doener-project-guideline/references/permission-policy.md`

Use `pnpm` instead of `npm` or `yarn`; pin pnpm 10.x exactly in `packageManager` until Vercel documents pnpm 11 support. Use Node.js 24 LTS via `mise`. Use Biome for formatting, linting, and import organization; use Vitest, Playwright, and Zod-backed data validation for tests/checks. Keep the Berlin Döner Price Map MVP dataset-first, multilingual (`de`, `en`, `zh`) with explicit locale prefixes, zero-cost by default, Vercel-deployed, and scoped to the explicitly documented product features. If any action can create costs now or later, warn the user and get explicit confirmation before proceeding.

For substantial work, use the local workflow skills:

- `codex-skills/berlin-doener-plan-with-context/SKILL.md` to create a saved plan.
- `codex-skills/berlin-doener-execute-plan/SKILL.md` to execute and update a saved plan.
- `codex-skills/berlin-doener-sync-guideline/SKILL.md` to sync confirmed plan learnings back into the project guideline.

When the user says `publish-current-branch`, use:

- `codex-skills/berlin-doener-publish-current-branch/SKILL.md` to push the current branch, create a PR to `main`, and enable auto-merge only when CI protection makes that safe. Do not delete the branch.
- For that workflow, use `gh` CLI by default for PR creation and auto-merge, always scoped to `pengcc/berlin-doener-price-map`; do not try the GitHub connector first for PR creation.
- After the PR is verified merged, switch back to `main` and refresh it from `origin/main` before starting any next-stage Plan Mode discussion, saved plan, or implementation work. If auto-merge is still pending, wait for the merge and refreshed `main` before next-stage planning.

Saved plans live in `dev_locals/plans/`, which is local working memory and ignored by git by default.

When executing saved plans, refresh `main` from `origin/main` after a previous PR has merged, then create the next plan-specific branch from the updated `main`. New next-stage planning should also start from refreshed `main`, not from the completed feature branch. Do not create new feature branches from completed feature branches unless the user explicitly asks. Commit related changes after a coherent checkpoint, and do not push unless the user explicitly asks.

Use coherent checkpoint commits to reduce interruption risk: commit after a meaningful, reviewable unit of work has passed the closest relevant checks, not after arbitrary tiny edits. Good checkpoints include completed plan steps, dependency/setup changes plus compiling code, focused tests passing, before risky or long-running verification, before publish, or before likely Usage-limit interruption.

For high-impact planning or review work, recommend reasoning/speed settings when useful: xhigh for foundation, architecture, roadmap, workflow/guideline, and long-term cost/security/privacy/data-quality decisions; high for complex execution, difficult debugging, and formal code review; medium for normal feature work; low/minimal for simple status checks or mechanical commands. Use standard speed for planning, architecture, review, and risk analysis; fast mode is acceptable for executing a decision-complete plan. If the user does not adjust settings, continue with the current setting and record the assumption when it matters.

After completing a task, end the final response with a clearly labeled recommended next step or next work section. Put that recommendation last so it is easy to find, unless a stricter system, mode, or tool output format requires otherwise.
