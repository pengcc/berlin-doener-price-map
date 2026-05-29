# Permission Policy

This policy describes what Codex may request as reusable command approvals for this repository and what must always require explicit user confirmation.

It does not override the Codex tool approval system. If a tool still asks for approval, wait for the user. If the user is away and approval is required, pause.

## Scope

- Applies only to `/Users/pengc/Projects/Berlin-Doener-Price-Map`.
- Prefer reading and writing files inside this repository only.
- Do not write outside this repository unless the user explicitly approves the specific action.
- `dev_locals/` is local working memory and ignored by git by default.

## Safe Prefix Rules to Request When Needed

These prefixes are reasonable to request as saved approvals because they support ordinary local development and are scoped by command shape. Still use judgment and do not run them for unrelated projects.

- `["git", "switch"]`
- `["git", "status"]`
- `["git", "branch", "--show-current"]`
- `["git", "add"]`
- `["git", "commit"]`
- `["mise", "install"]`
- `["mise", "exec", "--", "corepack"]`
- `["mise", "exec", "--", "corepack", "pnpm", "install"]`
- `["mise", "exec", "--", "corepack", "pnpm", "check"]`
- `["mise", "exec", "--", "corepack", "pnpm", "typecheck"]`
- `["mise", "exec", "--", "corepack", "pnpm", "build"]`
- `["mise", "exec", "--", "corepack", "pnpm", "dev"]`

For broad prefixes such as `["mise", "exec", "--", "corepack"]`, use them only for project-approved pnpm/Corepack workflows. Do not use broad saved approval to bypass package, network, or cost review.

## Ask Every Time

Always ask for explicit confirmation before:

- `git push`
- Creating, publishing, merging, or closing GitHub pull requests.
- Rebasing, merging, or force-updating protected/shared branches.
- Installing a new dependency that is not already in the current plan or project guideline.
- Running commands that write outside the repository.
- Changing global machine config.
- Enabling analytics, hosted services, APIs, billing, dashboards, or accounts.
- Any action that can create costs now or later.
- Any action involving secrets, credentials, tokens, API keys, or private account settings.

## Forbidden Unless Explicitly Requested

Do not do these by default:

- Delete branches.
- Run `git reset --hard`.
- Run `git clean`.
- Run destructive delete commands such as `rm -rf`.
- Delete, archive, transfer, or change permissions of a GitHub repository.
- Delete GitHub issues, releases, tags, packages, environments, or secrets.
- Enable paid services, usage-based services, billing-backed APIs, or overage-prone features.
- Commit secrets, private keys, private form/admin URLs, or private user submission data.
- Modify files outside this project.

If the user explicitly requests one of these actions, restate the impact and ask for confirmation before using tools.

## Mobile Approval Reality

The user may reply from mobile. Text confirmation is enough for conversational decisions, but tool approval prompts may still require the Codex UI. If a required approval is not available, pause and report the blocked command.

## Saved Plan Execution

When executing saved plans:

- Read this policy before requesting escalated commands.
- Create or switch to a plan-specific branch when appropriate.
- Commit coherent checkpoints if the plan succeeds or reaches a useful pause point.
- Do not push unless explicitly asked.
- Record permission-related blockers in the plan execution log.
