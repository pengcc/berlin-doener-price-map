---
name: berlin-doener-plan-with-context
description: Create a project-grounded implementation plan for Berlin Döner Price Map without writing production code. Use when the user asks for a plan, roadmap, implementation strategy, next steps, or when work is substantial enough to affect architecture, dependencies, i18n, data rules, map behavior, tests, CI, deployment, or multiple files. Saves plans under dev_locals/plans and updates the local plan index.
---

# Berlin Döner Plan With Context

## Overview

Use this skill for planning only. It creates an actionable implementation plan grounded in the current repository, the Berlin Döner project guideline, and the real project state.

Do not write production code, install dependencies, or modify implementation files while using this skill. It may create or update plan files under `dev_locals/plans/`.

## Required Context

Before planning:

1. Read `codex-skills/berlin-doener-project-guideline/SKILL.md`.
2. Read the relevant files under `codex-skills/berlin-doener-project-guideline/references/`.
3. Inspect the current repository state and existing files affected by the request.
4. Check official documentation first when the plan depends on current behavior of Next.js, React, Biome, pnpm, next-intl, MapTiler, React Leaflet, shadcn/ui, Zod, Vitest, or Playwright.

## Plan Mode Recommendation Gate

Plan Mode is a collaboration aid for high-impact analysis and confirmation. This skill remains the project planning workflow that grounds the plan in repository facts and saves durable local project memory under `dev_locals/plans/`.

Before creating or revising a saved plan, recommend switching to Plan Mode when the request is project-level or hard to reverse, including:

- New-project foundation setup or reusable foundation prompt changes.
- Project guideline or workflow changes.
- Architecture decisions.
- Project-wide planning, roadmap changes, or multi-stage technical debt planning.
- Decisions with long-term cost, security, privacy, data-quality, deployment, or public-provenance impact.

Do not recommend Plan Mode for every saved plan. Trivial edits, narrow bug fixes, and execution of an already confirmed plan should continue without extra ceremony unless the user asks.

If already in Plan Mode, still use this skill's context rules and plan format. Plan Mode improves the discussion, but it does not replace the saved plan file.

If not in Plan Mode and the user chooses to continue, perform the same analysis conservatively: inspect the repository, state material tradeoffs, create or update the saved plan, and wait for confirmation before implementing substantial or durable project guidance changes.

For new-project foundation planning, introduce collaboration-mode choices early: Plan Mode threshold, saved-plan memory, explicit Goal usage, code review vs lightweight self-review, browser verification expectations, and publish workflow defaults.

## Scope Clarification Gate

Before creating a saved plan, decide whether the request is clear enough.

Use `codex-skills/berlin-doener-feature-scope-grill/SKILL.md` first when:

- The requirement has multiple plausible product interpretations.
- The feature affects cost, privacy, data model, external services, auth, deployment, user submissions, or public data provenance.
- The user asks for a broad page, app area, workflow, or architecture change rather than a narrow implementation.
- A plan would otherwise need many assumptions.
- The choice is hard to reverse or has high-friction consequences.

Do not grill when:

- The task is mechanical or narrow.
- The user already gave precise scope and constraints.
- Existing project guidelines already settle the decision.
- The answer can be found by reading the repository or project guidelines.

## When to Persist a Plan

Persist a plan for:

- App scaffolding or dependency setup.
- i18n, routing, data schema, validation, ranking, map, table, CI, deployment, or test infrastructure work.
- Project-wide planning, roadmap changes, workflow/guideline changes, or architecture decisions.
- Any task likely to span multiple files or sessions.
- Any task with meaningful risk, sequencing, or rollback concerns.

For trivial edits, answer directly unless the user explicitly asks for a saved plan.

## Persistence

Save plans under:

```txt
dev_locals/plans/
```

Use filename format:

```txt
YYYY-MM-DD-feature-slug.md
```

If the filename already exists, append `-2`, `-3`, etc.

Update:

```txt
dev_locals/plans/_index.md
```

Put the newest plan first. Include title, status, date, and relative path.

`dev_locals/` is local working memory and should stay ignored by git unless the user explicitly asks to version plans.

## Required Plan Format

Every plan must include:

- Title
- Status: `Draft`
- Created date
- Last updated date
- Context sources reviewed
- Overview
- Requirements
- Assumptions and constraints
- Affected files and architecture areas
- Detailed implementation steps with `Pending` status
- Testing and validation strategy
- Risks and mitigations
- Success criteria
- Project Guideline Updates Required
- Open questions
- Execution log placeholder

## Guideline Update Discipline

The plan must include a section titled `Project Guideline Updates Required`.

Use that section to record:

- Existing guideline text that may become outdated.
- New rules implied by the task.
- Decisions that should be synchronized after execution.

Do not update the project guideline while using this skill.

## Output

Return the created plan path and a concise summary of the plan. Mention unresolved questions only if they block execution.
