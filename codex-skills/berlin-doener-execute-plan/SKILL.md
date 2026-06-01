---
name: berlin-doener-execute-plan
description: Execute a saved Berlin Döner Price Map implementation plan with strict scope control and progress tracking. Use when the user asks to implement, continue, resume, run, or execute a plan saved under dev_locals/plans. Updates the plan with step status, deviations, bugs, test results, and execution history while keeping project guidelines unchanged.
---

# Berlin Döner Execute Plan

## Overview

Use this skill to turn a saved implementation plan into working code. The plan is the execution source of truth.

Do not silently redesign architecture, invent new scope, or skip plan updates when reality changes.

Execute plans with senior engineering discipline: verify branch base and working tree state before implementation, keep history clean, record deviations immediately, and treat validation/test gaps as real project risk rather than bookkeeping.

## Required Context

Before executing:

1. Read `codex-skills/berlin-doener-project-guideline/SKILL.md`.
2. Read the relevant files under `codex-skills/berlin-doener-project-guideline/references/`.
3. Read `codex-skills/berlin-doener-project-guideline/references/permission-policy.md` before requesting escalated commands or saved command approvals.
4. Load the target plan from `dev_locals/plans/`.
5. Inspect files affected by the current step before editing.

If the user does not specify a plan, use the newest plan in `dev_locals/plans/_index.md` only when it is unambiguous. Otherwise ask for the target plan path.

## Execution Process

For each implementation step:

1. Mark the step `In Progress` in the plan before starting.
2. Execute only the work described by that step.
3. If the step changes, mark it `Modified` and record the reason and impact.
4. If blocked, mark it `Blocked`, record the blocker, and identify what input or state change is needed.
5. If completed, mark it `Completed` and record important files changed.
6. Update risks, mitigations, and the execution log when new issues appear.
7. Run the validation listed in the plan as soon as it is meaningful.
8. Record test failures and fixes in the plan. Do not hide failing checks.

Use the project guideline's normal coding rules: `pnpm`, Biome, TypeScript strictness, static data first, no database for MVP, no unapproved external service expansion.

## Lightweight Self-Review Gate

Before committing substantial changes, perform a short self-review and record the result in the plan. Keep it concise and focused on engineering risk:

- Behavioral bugs or regressions checked.
- Branch-base and scope alignment checked.
- Test, validation, and browser-verification gaps.
- Cost, security, privacy, and data-quality implications.
- Intentional omissions or deferred follow-ups.

This is not required for trivial edits. If the user explicitly asks for a review, switch to a formal code-review stance with findings first.

## Reasoning And Speed Recommendations

Codex may recommend reasoning/speed settings, but these are user-controlled runtime choices. Do not block execution if the user keeps the current setting.

- Recommend xhigh reasoning for foundation, architecture, roadmap, workflow/guideline, and long-term cost/security/privacy/data-quality decisions.
- Recommend high reasoning for complex execution, cross-module implementation, difficult debugging, and formal code review.
- Use medium as the normal default for ordinary feature work, docs sync, and small refactors.
- Use low or minimal only for simple status checks, mechanical commands, or tiny edits.
- Recommend standard speed for planning, architecture, review, and risk analysis; fast mode is acceptable for executing an already decision-complete plan.
- If the user does not adjust settings, continue and record the assumption in the saved plan when it matters.

## Checkpoint Commit Discipline

Commit coherent checkpoints to reduce interruption and Usage-limit recovery risk:

- Commit after a completed plan step or tightly related group of steps, once the closest relevant checks pass.
- Commit dependency/setup changes only when paired with compiling code or documented validation.
- Prefer a checkpoint before long-running browser verification, publishing, branch reshaping, or likely Usage-limit interruption.
- Do not commit arbitrary tiny edits or broken half-applied work unless the user explicitly asks for a work-in-progress checkpoint.
- Keep unrelated product and workflow changes in separate commits and, when practical, separate branches.

## Git Workflow

Use this default workflow for saved plan execution:

1. Check the current branch and working tree.
2. If a previous feature PR has merged, refresh local `main` from `origin/main` and base the next plan-specific branch on that updated `main`. Do this before next-stage planning or execution, even if the planning conversation was started from a completed feature branch.
3. Create or switch to a plan-specific branch when not already on an appropriate branch; do not branch from a completed feature branch unless the user explicitly asks.
4. Execute the plan and update the plan file as reality changes.
5. Commit related changes after successful execution or a coherent checkpoint, unless the user asks not to commit. Prefer a checkpoint before long-running verification, publishing, branch reshaping, or likely Usage-limit interruption.
6. Do not push to a remote unless the user explicitly asks to push.

If the working tree contains unrelated user changes, do not revert them. Work around them where possible and mention them in the plan or final summary if they affect execution.

## Plan Synchronization

The plan must reflect reality after each meaningful work chunk.

Update the plan's:

- Step statuses.
- Execution log.
- Testing and validation results.
- Risks and mitigations.
- Open questions.
- Project Guideline Updates Required when execution reveals missing or stale guidance.

Do not modify `codex-skills/berlin-doener-project-guideline/` while using this skill unless the user's task explicitly is to update guidelines. Record needed guideline changes in the plan instead.

## Validation

Run the closest available checks from the plan and current project scripts. Prefer:

- `pnpm check`
- `pnpm typecheck`
- `pnpm test:run`
- `pnpm validate:data`
- `pnpm build`
- Playwright smoke tests when relevant and available

If a command is missing because the project stage has not reached it, record that fact in the plan instead of pretending it ran.

## Output

Return:

- The plan path.
- Steps completed or blocked.
- Checks run and results.
- Any guideline updates that should later be handled by `berlin-doener-sync-guideline`.
- A final `Recommended next step` section placed last, unless a stricter output format takes precedence.
