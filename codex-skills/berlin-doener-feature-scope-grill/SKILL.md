---
name: berlin-doener-feature-scope-grill
description: Clarify ambiguous or high-risk Berlin Döner Price Map feature requests before planning. Use before creating a saved plan when scope, product behavior, data rules, privacy, cost, external services, deployment, or user submissions are not clear enough.
---

# Berlin Döner Feature Scope Grill

## Purpose

Use this skill before planning when the requested feature is too broad, ambiguous, or risky to plan safely.

This skill is for clarification only. Do not write code, install dependencies, change docs, or create implementation plans while using it.

## Trigger Conditions

Use this skill before `berlin-doener-plan-with-context` when:

- The requirement has multiple plausible product interpretations.
- The feature affects cost, privacy, data model, external services, auth, deployment, user submissions, or public data provenance.
- The user asks for a broad page, app area, workflow, or architecture change rather than a narrow implementation.
- A plan would otherwise need many assumptions.
- The choice is hard to reverse or has high-friction consequences.

Do not use this skill when:

- The task is mechanical or narrow.
- The user already gave precise scope and constraints.
- Existing project guidelines already settle the decision.
- The answer can be found by reading the repository or project guidelines.

## Process

1. Read `codex-skills/berlin-doener-project-guideline/SKILL.md`.
2. Read only the relevant reference files under `codex-skills/berlin-doener-project-guideline/references/`.
3. Inspect the repository if the answer may already be in code, docs, data, or plans.
4. Ask one question at a time.
5. For each question:
   - Explain why it matters in one concise sentence.
   - Provide the recommended answer.
   - Offer 2-4 concrete options when useful.
6. Stop when enough information exists to create a saved implementation plan.

## Output

When clarification is complete, summarize:

- Confirmed scope.
- Explicit non-goals.
- Data/privacy/cost constraints.
- Architecture implications.
- Testing and validation implications.
- Remaining open decisions, if any.
- Recommended next step, usually `berlin-doener-plan-with-context`.

## Examples That Should Trigger This Skill

- Designing `/submit` and deciding between Tally, Google Form, email, GitHub Issues, or a custom form.
- Adding verified seed data and deciding accepted sources, provenance, confidence, and reuse rules.
- Configuring MapTiler or another map provider for production.
- Connecting Vercel deployment, domains, environment variables, analytics, or preview deployments.
- Designing methodology, public disclaimers, or data confidence presentation.
- Considering any database, auth, admin, OCR, crawler, or user account expansion.
