---
name: berlin-doener-sync-guideline
description: Synchronize confirmed lessons from completed Berlin Döner implementation plans into the project guideline. Use after executing a saved plan when its Project Guideline Updates Required section contains accepted decisions, stale constraints, or new recurring rules. Updates codex-skills/berlin-doener-project-guideline deliberately and keeps plan history intact.
---

# Berlin Döner Sync Guideline

## Overview

Use this skill after implementation, not during planning or normal execution. It turns confirmed recurring decisions from a completed plan into durable project guidance.

Do not copy every execution detail into the guideline. Only sync rules that should affect future work.

## Required Context

Before syncing:

1. Read `codex-skills/berlin-doener-project-guideline/SKILL.md`.
2. Read relevant current guideline references.
3. Read the target plan under `dev_locals/plans/`.
4. Review the plan's `Project Guideline Updates Required`, execution log, and final validation notes.
5. Inspect actual repository changes if needed to verify the guidance is accurate.

If the user does not specify a plan, use the newest completed plan in `dev_locals/plans/_index.md` only when it is unambiguous. Otherwise ask for the target plan path.

## Sync Criteria

Sync an item only when it is:

- Confirmed by implementation or explicit user decision.
- Likely to recur in future project work.
- More appropriate as a durable rule than as one-off plan history.
- Consistent with the MVP scope and low-cost constraints.

Do not sync:

- Temporary debugging notes.
- One-off file paths that are not architectural.
- Failed experiments that should not guide future work.
- Broad abstractions not proven by actual implementation.

## Update Targets

Update the most specific target:

- Product or page behavior: `codex-skills/berlin-doener-project-guideline/references/product-scope.md`
- Stack, structure, dependencies, tools, CI, deployment: `codex-skills/berlin-doener-project-guideline/references/architecture.md`
- Data model, ranking, confidence, validation: `codex-skills/berlin-doener-project-guideline/references/data-rules.md`
- Code quality, testing, privacy, workflow discipline: `codex-skills/berlin-doener-project-guideline/references/implementation-guardrails.md`
- Trigger or preflight behavior: `codex-skills/berlin-doener-project-guideline/SKILL.md`

Avoid duplicating the same rule in multiple places unless it is truly a top-level rule and a detailed reference rule.

## Plan Backlink

After updating the guideline:

1. Update the plan's `Project Guideline Updates Required` section to mark synced items.
2. Add a short entry to the plan execution log with files updated.
3. Leave unsynced items in the plan with a reason.

## Validation

After sync:

- Check the edited guideline files for contradictions and duplicate rules.
- Confirm all referenced paths still exist.
- If a skill validator is available, run it when the environment supports it.

## Output

Return:

- Plan path reviewed.
- Guideline files updated.
- Items synced and items intentionally left unsynced.
- Any remaining open questions.
