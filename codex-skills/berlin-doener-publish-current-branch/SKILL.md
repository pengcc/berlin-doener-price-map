---
name: berlin-doener-publish-current-branch
description: Publish the current Berlin Döner Price Map feature branch by pushing it, creating a pull request to main, and enabling auto-merge only when CI protection can make that safe. Use when the user says "publish-current-branch" or asks to publish the current branch for this project.
---

# Berlin Döner Publish Current Branch

## Trigger

Use this skill when the user says:

```txt
publish-current-branch
```

This phrase means:

```txt
Push current branch, create a PR to main, enable auto-merge after CI passes when safely enforceable, and do not delete the branch.
```

## Required Context

Before doing anything:

1. Read `codex-skills/berlin-doener-project-guideline/SKILL.md`.
2. Read `codex-skills/berlin-doener-project-guideline/references/permission-policy.md`.
3. Check the current branch and working tree.

## Safety Rules

- Do not run this from `main`.
- Do not publish if the working tree is dirty, unless the user explicitly asks to include the dirty changes and they are committed first.
- Do not delete local or remote branches.
- Do not enable Vercel Preview Deployments.
- Do not enable paid services, analytics, billing-backed APIs, larger GitHub runners, or secrets.
- Use standard GitHub-hosted Linux runners only.
- If a tool approval prompt appears, wait for the user.

## Required Local Checks

Before pushing, run the available checks:

```txt
mise exec -- corepack pnpm check
mise exec -- corepack pnpm typecheck
mise exec -- corepack pnpm build
```

When later scripts exist, also run:

```txt
mise exec -- corepack pnpm test:run
mise exec -- corepack pnpm validate:data
```

If any check fails, stop and report the failure. Do not push.

## Publish Workflow

1. Confirm the current branch is not `main`.
2. Confirm the working tree is clean.
3. Confirm `.github/workflows/ci.yml` exists.
4. Run required local checks.
5. Push the branch with upstream tracking:

   ```txt
   git push -u origin <current-branch>
   ```

6. Create a pull request to `main`.
7. Do not delete the branch.

## Auto-Merge Discipline

Enable auto-merge only when one of these is true:

- GitHub branch protection or rulesets require the CI check for `main`.
- The PR's latest CI check has already completed successfully and the user explicitly confirms merging now.

If CI exists but is not required by GitHub, do not assume `auto-merge` will wait for CI. Create the PR, report that required checks are not enforced, and ask whether to configure branch protection or wait for CI manually.

Prefer squash merge for small plan branches unless the user asks for a different merge method.

## Output

Report:

- Branch pushed.
- PR URL.
- Whether auto-merge was enabled, skipped, or blocked.
- Which checks passed.
- Any manual follow-up required.
