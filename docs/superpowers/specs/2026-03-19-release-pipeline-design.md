# Release Pipeline Design

## Problem

Currently, dev→main syncing is a manual rebase (`git rebase dev` on main). This prevents CI-driven release workflows because:

- No PR exists to review what's being released
- No merge commit marks release boundaries
- No automated changelog generation from the merge event
- `release-it` must be run manually with no structured trigger
- dev is mutable during the release window — new commits can slip into a release unintentionally

## Solution

A release pipeline using frozen release candidate branches: a local script cuts a `release/*` branch from dev, creates a release PR to main with a changelog body, and after merging (merge commit), CI automatically runs `release-it` and backmerges main into dev.

## Source of Truth

**`main` is the production source of truth.**

- A release is **merged** when the release PR merge commit lands on `main`.
- A release is **finalized** when `pnpm release` completes — this pushes a version bump commit to `main`, making it the new `main` HEAD. The signed tag and GitHub Release point to this finalized SHA.
- A release is **deployed** when Vercel's production deployment for the finalized `main` HEAD succeeds.
- No other merges to `main` are allowed between merging the release PR and completing `pnpm release`.

## Architecture

```text
PRs ──squash merge──▸ dev ──cut release/*──▸ release PR (merge commit)──▸ main ──CI: release-it──▸ tag + changelog + GitHub Release ──CI: backmerge──▸ dev
```

### Branch Model

| Branch      | Purpose                                             | Merge strategy INTO this branch                |
| ----------- | --------------------------------------------------- | ---------------------------------------------- |
| `dev`       | Development. PRs land here. Vercel preview deploys. | Squash merge (from feature PRs)                |
| `release/*` | Frozen release candidate. Cut from `origin/dev`.    | Direct commits (release-only fixes only)       |
| `main`      | Production. Vercel production deploys.              | Merge commit (from `release/*` via release PR) |

### Step 1: Create Release PR (`pnpm release:pr`)

The `scripts/release-pr.sh` script:

1. Fetches latest remote state
2. Finds the last release tag on main (e.g., `v1.2.3`), or falls back to `merge-base origin/main origin/dev` if no tags exist
3. Cuts a `release/YYYY-MM-DD` branch from `origin/dev` and pushes it
4. Gets all commits between the range start and the release branch
5. For each commit, extracts the PR number from the squash commit subject (GitHub appends `(#123)` to squash-merge messages)
6. Looks up PR metadata (title, author) via `gh pr view` for commits with PR numbers
7. Builds a PR body grouped by conventional commit type:
   - Features, Bug Fixes, Refactoring, etc.
   - Format: `* [#123](url) description (@author)`
   - Direct commits (no PR): `* description (<sha>) — author`
8. Prompts for confirmation: `Create release PR? [y/N]`
9. Creates the PR: `gh pr create --base main --head release/YYYY-MM-DD --title "Release YYYY-MM-DD" --body "$changelog"`

If a release-only fix is needed after the PR is created, commit it to the `release/*` branch, not `dev`.

### Step 2: Merge the Release PR

Release preconditions before merge:

- CI is green (lint checks pass)
- Only one active `release/*` branch at a time
- Release PR has been reviewed

On GitHub, merge the release PR using **merge commit** (not squash, not rebase). This:

- Carries all squash-merged PR commits from dev into main's history
- Creates a merge commit that marks the release boundary
- Allows `release-it` to see all conventional commits via `git log` for changelog generation

### Step 3: CI Runs release-it (Automatic)

The `.github/workflows/release.yml` workflow triggers on push to `main`. It only runs when the commit message contains `/release/` (matching merge commits from release PRs).

The `release` job:

1. Checks out full git history (`fetch-depth: 0`)
2. Installs dependencies
3. Runs `pnpm release` (which executes `release-it --ci`)

`release-it` handles:

- Analyzing conventional commits since last tag → semver bump (auto)
- Bumping version in `package.json`
- Generating/updating `CHANGELOG.md` with custom handlebars templates
- Creating unsigned commit + tag (GPG signing is skipped in CI via conditional config in `.release-it.ts`)
- Pushing to main
- Creating GitHub Release with formatted release notes

The `GITHUB_TOKEN` is used for git push and GitHub Release creation. Pushes made with `GITHUB_TOKEN` do not re-trigger workflows, preventing infinite loops.

### Step 4: CI Runs Cleanup (Automatic)

The `cleanup` job runs after `release` succeeds:

1. Merges `origin/main` back into `dev` — carries the release commit, `package.json` version bump, and `CHANGELOG.md` back to dev
2. Pushes dev
3. The `release/*` branch is auto-deleted by GitHub on PR merge

This prevents `package.json` and `CHANGELOG.md` conflicts on the next release.

`scripts/release-cleanup.sh` is still available for manual cleanup if the CI job fails.

## Failure Recovery

- **CI `release` job failed:** Check the workflow run logs. Fix the issue, then either re-run the workflow or run `pnpm release` locally on main.
- **CI `cleanup` job failed (merge conflict):** Resolve locally: `git checkout dev && git merge origin/main`, resolve conflicts, push dev.
- **Release commit reached main but tag/GitHub Release did not:** Create the missing artifact from the pushed release commit. Do not run a second version bump.
- **Tag exists but GitHub Release is missing:** Publish the GitHub Release from the existing tag.
- **Vercel deployment failed:** Fix the build issue on a new branch, merge to dev, patch forward with a new release.
- **Bad release shipped:** Patch forward with a new release. Do not rewrite `main`.

## New Files

- `scripts/release-pr.sh` — creates release branch + release PR
- `scripts/release-cleanup.sh` — manual post-release merge main→dev + branch deletion (fallback if CI cleanup fails)
- `.github/workflows/release.yml` — CI workflow: auto-runs release-it + backmerge on push to main

## Config Changes

- `.release-it.ts`: `requireCleanWorkingDir` → `true`, conditional GPG signing and lint (skipped in CI via `process.env.CI`)
- `package.json` scripts:
  - `"release:pr": "./scripts/release-pr.sh"`
  - `"release:cleanup": "./scripts/release-cleanup.sh"`

## What Changes

| Before                        | After                                               |
| ----------------------------- | --------------------------------------------------- |
| `git rebase dev` on main      | Release PR (merge commit) via `pnpm release:pr`     |
| No release boundary markers   | Merge commits mark each release                     |
| Manual rebase risk            | PR-based review of release contents                 |
| No post-release sync          | Automatic `main → dev` backmerge via CI cleanup job |
| dev as PR head (mutable)      | Frozen `release/*` branch as PR head                |
| Manual `pnpm release` run     | CI auto-runs release-it on merge to main            |
| Manual `pnpm release:cleanup` | CI auto-runs backmerge after release                |

## What Stays the Same

- Squash merge for PRs→dev
- `scripts/release-it/` custom changelog templates
- `pnpm release` command
- Signed commits and tags (local only — CI runs unsigned)
- GitHub Release format

## Key Design Decisions

1. **Frozen `release/*` branch** — prevents new dev commits from slipping into a release. Critical for a team of 3 where multiple people push to dev.

2. **Merge commit for `release/*`→main** — carries squash-merged PR commits into main's history so `release-it` can parse each conventional commit for changelog generation.

3. **CI release-it execution** — runs automatically on push to main via `.github/workflows/release.yml`. GPG signing is conditionally skipped in CI (no keys available). Uses `GITHUB_TOKEN` (no PAT needed).

4. **Automatic semver from conventional commits** — `feat:` → minor, `fix:` → patch, `feat!:` → major.

5. **Mandatory `main→dev` backmerge** — keeps `package.json`, `CHANGELOG.md`, and any release-only fixes in sync. Prevents conflicts on next release.

6. **`main` as source of truth** — production deploys from `main` via Vercel. Tags and GitHub Releases are artifacts of the `main` state.

7. **One release at a time** — only one active `release/*` branch allowed. Simplifies recovery and prevents release conflicts.

## Acceptance Criteria

A release is complete when all of the following are true:

- [ ] Release PR merged to `main` via merge commit
- [ ] CI `release` job created version bump commit, tag, and GitHub Release on `main`
- [ ] Vercel production deployment for the finalized `main` HEAD (post-`release-it`) succeeded
- [ ] CI `cleanup` job backmerged `main` into `dev` (no file drift in `package.json` or `CHANGELOG.md`)
- [ ] `release/*` branch auto-deleted by GitHub on PR merge
- [ ] No other `release/*` branches exist

## Future Enhancements

- Slack notification on new release
- Vercel production deploy gate tied to release tag
