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

This skill automates the full release lifecycle. Execute the steps below in order.

## Prerequisites

- On `dev` branch with clean working tree
- All changes committed and pushed to `origin/dev`
- No existing release branch (or willing to recreate)

## Happy Path

### Step 1: Create release PR

```bash
pnpm release:pr:yes
```

Extract the PR number from the output (printed by `gh pr create`).

If the script detects an existing release PR and recreates it, that's expected — `--yes` auto-confirms.

### Step 2: Merge the release PR

Merge immediately with a merge commit (NOT squash — the release workflow depends on merge commits):

```bash
gh pr merge {PR_NUMBER} --merge
```

Do NOT pass `--auto` or wait for CI checks — the release PR only has a `release` label which skips CodeRabbit and Semantic PR validation. Merge directly.

### Step 3: Monitor the release workflow

After merging, the `Release` workflow triggers on push to `main`. Poll until it completes:

```bash
# Check if the workflow started
gh run list --workflow=release.yml --branch=main --limit=1

# Watch it (blocks until complete)
gh run watch $(gh run list --workflow=release.yml --branch=main --limit=1 --json databaseId -q '.[0].databaseId')
```

If the run doesn't appear within 30 seconds, check with `gh run list` again — GitHub Actions can have a brief delay.

### Step 4: Verify release artifacts

After the workflow succeeds, verify all three artifacts:

```bash
# Latest tag
git fetch origin --tags
git tag --sort=-version:refname | head -1

# GitHub Release exists
gh release list --limit=1

# Backmerge: main→dev happened (the cleanup job does this)
git fetch origin
git log --oneline origin/dev..origin/main | head -5
```

If backmerge shows commits, the cleanup job may still be running. Wait and re-check.

### Step 5: Sync local dev

```bash
git switch dev
git pull --ff-only origin dev
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

- **Merge commit required** — squash breaks the release workflow's tag detection
- **`release` label on PR** — skips CodeRabbit and Semantic PR validation
- **`GITHUB_TOKEN` required** for local `pnpm release` — the changelog writer fetches commit author data from GitHub API
- **Don't push to dev after merge** — wait for CI backmerge to complete, or you'll create divergence
- **Don't run `pnpm release:cleanup` after CI success** — CI already handles backmerge + branch deletion; running it manually creates empty merge commits
