# Release Pipeline Design

## Problem

Currently, dev→main syncing is a manual rebase (`git rebase dev` on main). This prevents CI-driven release workflows because:

- No PR exists to review what's being released
- No merge commit marks release boundaries
- No automated changelog generation from the merge event
- `release-it` must be run manually with no structured trigger
- dev is mutable during the release window — new commits can slip into a release unintentionally

## Solution

A release pipeline using frozen release candidate branches: a local script cuts a `release/*` branch from dev, creates a release PR to main with a changelog body, and after merging (merge commit), `release-it` runs locally on main. Post-release, main is merged back to dev and the release branch is deleted.

## Source of Truth

**`main` is the production source of truth.**

- A release is **merged** when the release PR merge commit lands on `main`.
- A release is **finalized** when `pnpm release` completes — this pushes a version bump commit to `main`, making it the new `main` HEAD. The signed tag and GitHub Release point to this finalized SHA.
- A release is **deployed** when Vercel's production deployment for the finalized `main` HEAD succeeds.
- No other merges to `main` are allowed between merging the release PR and completing `pnpm release`.

## Architecture

```text
PRs ──squash merge──▸ dev ──cut release/*──▸ release PR (merge commit)──▸ main ──pnpm release──▸ tag + changelog + GitHub Release ──▸ merge main back to dev
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

### Step 3: Run release-it Locally (Operator Runbook)

```bash
git fetch origin --tags
git switch main
git pull --ff-only origin main
test -z "$(git status --porcelain)"
pnpm release:dryrun
pnpm release
# pnpm release pushes a new commit to main — wait for Vercel production
# deployment to succeed for this new main HEAD (the finalized release SHA)
# Verify at: https://vercel.com/timelessco/recollect/deployments
```

Preconditions:

- Release operator has GPG configured for signed commits/tags
- Working directory is clean
- `main` is up to date with `origin/main`
- `pnpm release:dryrun` shows expected version bump

`pnpm release` runs `release-it --ci` (non-interactive). It handles:

- Analyzing conventional commits since last tag → semver bump (auto)
- Bumping version in `package.json`
- Generating/updating `CHANGELOG.md` with custom handlebars templates
- Creating signed commit (`-S`) + signed tag (`-s`)
- Pushing to main
- Creating GitHub Release with formatted release notes

### Step 4: Post-Release Cleanup (`pnpm release:cleanup`)

The `scripts/release-cleanup.sh` script:

1. Merges `origin/main` back into `dev` — carries the release commit, `package.json` version bump, and `CHANGELOG.md` back to dev
2. Pushes dev
3. Deletes the `release/*` branch locally and on remote

This prevents `package.json` and `CHANGELOG.md` conflicts on the next release.

## Failure Recovery

- **Nothing pushed remotely:** Fix the issue and rerun `pnpm release`.
- **Release commit reached main but tag/GitHub Release did not:** Create the missing artifact from the pushed release commit. Do not run a second version bump.
- **Tag exists but GitHub Release is missing:** Publish the GitHub Release from the existing tag.
- **Vercel deployment failed:** Fix the build issue on a new branch, merge to dev, cherry-pick to the `release/*` branch (if still open) or patch forward with a new release.
- **Bad release shipped:** Patch forward with a new release. Do not rewrite `main`.

## New Files

- `scripts/release-pr.sh` — creates release branch + release PR
- `scripts/release-cleanup.sh` — post-release merge main→dev + branch deletion

## Config Changes

- `.release-it.ts`: `requireCleanWorkingDir` → `true` (enforces what the runbook requires)
- `package.json` scripts:
  - `"release:pr": "./scripts/release-pr.sh"`
  - `"release:cleanup": "./scripts/release-cleanup.sh"`

## What Changes

| Before                      | After                                                   |
| --------------------------- | ------------------------------------------------------- |
| `git rebase dev` on main    | Release PR (merge commit) via `pnpm release:pr`         |
| No release boundary markers | Merge commits mark each release                         |
| Manual rebase risk          | PR-based review of release contents                     |
| No post-release sync        | Mandatory `main → dev` merge via `pnpm release:cleanup` |
| dev as PR head (mutable)    | Frozen `release/*` branch as PR head                    |

## What Stays the Same

- Squash merge for PRs→dev
- `.release-it.ts` configuration (except `requireCleanWorkingDir` → `true`)
- `scripts/release-it/` custom changelog templates
- `pnpm release` command
- Signed commits and tags
- GitHub Release format

## Key Design Decisions

1. **Frozen `release/*` branch** — prevents new dev commits from slipping into a release. Critical for a team of 3 where multiple people push to dev.

2. **Merge commit for `release/*`→main** — carries squash-merged PR commits into main's history so `release-it` can parse each conventional commit for changelog generation.

3. **Local release-it execution (not CI)** — GPG-signed commits require local keys. Avoids CI secret management. Can move to CI later.

4. **Automatic semver from conventional commits** — `feat:` → minor, `fix:` → patch, `feat!:` → major.

5. **Mandatory `main→dev` backmerge** — keeps `package.json`, `CHANGELOG.md`, and any release-only fixes in sync. Prevents conflicts on next release.

6. **`main` as source of truth** — production deploys from `main` via Vercel. Tags and GitHub Releases are artifacts of the `main` state.

7. **One release at a time** — only one active `release/*` branch allowed. Simplifies recovery and prevents release conflicts.

## Acceptance Criteria

A release is complete when all of the following are true:

- [ ] Release PR merged to `main` via merge commit
- [ ] `release-it` created version bump commit, signed tag, and GitHub Release on `main`
- [ ] Vercel production deployment for the finalized `main` HEAD (post-`release-it`) succeeded
- [ ] `main` backmerged into `dev` (no file drift in `package.json` or `CHANGELOG.md`)
- [ ] `release/*` branch deleted locally and on remote
- [ ] No other `release/*` branches exist

## Future Enhancements

- GitHub Actions workflow to auto-run `release-it --ci` on main after merge (removes local step)
- Slack notification on new release
- Vercel production deploy gate tied to release tag
