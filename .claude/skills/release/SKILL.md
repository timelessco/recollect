---
name: release
description: >
  Automate the full Recollect release pipeline: create release PR, merge to main,
  monitor CI release workflow, and verify tag + GitHub Release + backmerge. Use when
  the user says "release", "cut a release", "ship a release", "/release", or wants
  to trigger the release pipeline. This is an EXECUTION skill — it runs the full
  workflow without needing context from the caller.
---

# Release Pipeline

Automates the full release lifecycle. Execute steps in order, stop and report if any step fails.

## Prerequisites

Check all three before starting:

```bash
git branch --show-current   # must be: dev
git status --porcelain      # must be: empty
git log --oneline origin/dev..HEAD  # must be: empty (in sync with origin)
```

## Happy Path

### Step 1: Create release PR

```bash
pnpm release:pr:yes
```

The script automatically:
- Extracts the PR number from `gh pr create` output
- Posts `docs/API_CHANGELOG.md` content as a PR comment (if the file has content)
- Recreates existing release PRs if found (`--yes` auto-confirms)
- Cleans up stale local `release/*` branches from previous aborted runs

Extract the PR number from the script output — it prints the PR URL as the last line before "Release PR created."

If the script exits with "No new commits since [tag]. Nothing to release." — there's nothing to release. Stop here.

### Step 2: Merge the release PR

Branch protection requires `--admin` to bypass:

```bash
gh pr merge {PR_NUMBER} --merge --admin
```

- **Must use `--merge`** (NOT `--squash`) — the release workflow's `if` condition checks for `/release/` in the merge commit message
- **Must use `--admin`** — branch protection blocks direct merge otherwise
- Do NOT pass `--auto` or wait for CI — the `release` label skips CodeRabbit and Semantic PR validation

### Step 3: Monitor the release workflow

The `Release` workflow triggers on push to `main`. Watch it:

```bash
# Get the run ID and watch it
gh run watch $(gh run list --workflow=release.yml --branch=main --limit=1 --json databaseId -q '.[0].databaseId')
```

If no run appears, wait a few seconds and retry `gh run list` — GitHub Actions can have a brief delay.

The workflow has two jobs:
1. **Release** (~30s) — runs `pnpm release` (release-it creates tag + GitHub Release)
2. **Cleanup** (~8s) — backmerges main→dev, clears `docs/API_CHANGELOG.md`, deletes release branch

### Step 4: Verify release artifacts

```bash
# Latest tag
git fetch origin --tags
git tag --sort=-version:refname | head -1

# GitHub Release exists
gh release list --limit=1

# Backmerge landed on dev (check dev's tip, not the diff)
git fetch origin
git log --oneline origin/dev | head -3
```

The backmerge commit message is `chore(release): merge main back into dev after release`.

Note: `git log origin/dev..origin/main` may show the release tag commit even after successful backmerge — the merge commit on dev and the tagged commit on main have different SHAs. This is normal. Check `git log origin/dev | head` instead to confirm the merge commit arrived.

### Step 5: Sync local dev

```bash
git switch dev
git pull --ff-only origin dev
```

Verify `docs/API_CHANGELOG.md` is empty (cleared by the cleanup job):

```bash
wc -c < docs/API_CHANGELOG.md  # should be 0
```

## Fallback: Local Release (if CI fails)

Only use this if the `Release` workflow fails (e.g., GPG signing issues, npm token problems).
The CI `cleanup` job handles backmerge (main→dev) and release branch deletion automatically — do NOT run `pnpm release:cleanup` manually unless CI cleanup also failed.

```bash
# 1. Switch to main and pull
git fetch origin --tags
git switch main
git pull --ff-only origin main

# 2. Run release-it locally (interactive — requires GITHUB_TOKEN)
pnpm release

# 3. Verify Vercel deployment
# Check https://recollect.so or use Vercel MCP

# 4. Only if CI cleanup job also failed:
pnpm release:cleanup
```

## Key Constraints

- **Merge commit required** — squash breaks the release workflow's tag detection (`if: contains(github.event.head_commit.message, '/release/')`)
- **`--admin` required** — branch protection blocks direct merge
- **`release` label on PR** — skips CodeRabbit and Semantic PR validation
- **`GITHUB_TOKEN` required** for local `pnpm release` — the changelog writer fetches commit author data from GitHub API
- **Don't push to dev after merge** — wait for CI backmerge to complete, or you'll create divergence
- **Don't run `pnpm release:cleanup` after CI success** — CI already handles backmerge + branch deletion; running it manually creates empty merge commits
- **API changelog** — `release-pr.sh` posts `docs/API_CHANGELOG.md` as a PR comment (if non-empty); the backmerge step clears the file automatically
