# Release Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create release pipeline scripts (`release-pr.sh`, `release-cleanup.sh`), wire them into package.json, and tighten release-it config.

**Architecture:** Two bash scripts + config change. `release-pr.sh` previews a changelog, then (after confirmation) cuts a frozen `release/*` branch from dev and creates a PR to main. `release-cleanup.sh` backmerges main into dev and deletes the release branch. Both support safe early exits — no remote state is mutated until the operator confirms.

**Tech Stack:** Bash, `gh` CLI, `git`

**Spec:** `docs/superpowers/specs/2026-03-19-release-pipeline-design.md`

---

### Task 1: Create release-pr.sh

**Status:** DONE

**Files:**
- `scripts/release-pr.sh`

**Key behaviors:**
- `--dry-run` flag: previews changelog without creating any branches or PRs
- Release branch guard: aborts if a `release/*` branch already exists on remote
- Confirmation before mutation: changelog preview is shown first, branch creation + PR only happen after `y`
- No orphaned branches on cancel: branch is not created until after confirmation
- Switches back to original branch after PR creation

**Verification:**
- `pnpm release:pr` — exits with "No new commits" when dev and main are identical
- `pnpm release:pr:dryrun` — same but explicitly dry-run mode

### Task 2: Create release-cleanup.sh

**Status:** DONE

**Files:**
- `scripts/release-cleanup.sh`

**Key behaviors:**
- Backmerge (`main → dev`) always runs, even if the release branch was already auto-deleted by GitHub on PR merge
- Fails if multiple `release/*` branches exist (instead of silently picking one)
- Uses `git pull --ff-only` for dev (only the `main → dev` merge creates a merge commit)
- Merge conflict on `main → dev` gives actionable error message with recovery instructions
- Header says "Run after successful Vercel deployment" (not just after `pnpm release`)
- Branch deletion is best-effort (handles already-deleted remote branch)
- Avoids restoring to a deleted `release/*` branch (defaults to `dev`)
- Sweeps stale local `release/*` branches

**Verification:**
- `pnpm release:cleanup` — runs backmerge even when no remote release branch exists (logs "likely auto-deleted on PR merge")

### Task 3: Update package.json and .release-it.ts

**Status:** DONE

**Files:**
- `package.json`: added `release:cleanup`, `release:pr`, `release:pr:dryrun`
- `.release-it.ts`: `requireCleanWorkingDir` → `true`

### Task 4: End-to-end verification (manual)

**Status:** PENDING

Manual verification checklist — validates the full release flow.

- [ ] **Step 1: Create a test change via squash-merged PR**

Create a throwaway feature branch, make a small change (e.g., add a word to `.cspell/project-words.txt`), open a PR to `dev`, and squash-merge it. This exercises the primary `(#NNN)` PR-number extraction path in the script.

```bash
git checkout -b test/verify-release-pipeline dev
# make a small change
git commit -am "chore(test): verify release pipeline"
git push origin test/verify-release-pipeline
gh pr create --base dev --head test/verify-release-pipeline --title "chore(test): verify release pipeline" --body "Throwaway PR to test release script"
# squash-merge on GitHub, then pull dev
git checkout dev && git pull origin dev
```

Verify: the squash-merged commit on dev has `(#NNN)` in the subject line.

- [ ] **Step 2: Preview with dry-run**

Run: `pnpm release:pr:dryrun`

Verify:
- It detects the new commit
- It categorizes it by conventional commit type
- The changelog preview looks correct
- No branches are created, no PR is opened

- [ ] **Step 3: Run `pnpm release:pr`**

Verify:
- Changelog preview matches the dry-run
- After confirming `y`: creates `release/YYYY-MM-DD` branch from dev
- Pushes branch to remote
- Creates PR from `release/YYYY-MM-DD → main`
- Switches back to original branch

- [ ] **Step 4: Check the PR on GitHub**

Verify:
- PR head is `release/YYYY-MM-DD` (not `dev`)
- Title is `Release YYYY-MM-DD`
- Body has the changelog grouped by type
- CI passes (lint checks)

- [ ] **Step 5: Merge the PR**

On GitHub, merge using **merge commit** (not squash, not rebase).

- [ ] **Step 6: Run release-it**

```bash
git fetch origin --tags
git switch main
git pull --ff-only origin main
test -z "$(git status --porcelain)"
pnpm release:dryrun
pnpm release
```

Verify:
- Correct version bump based on conventional commits
- CHANGELOG.md generated
- Signed tag and GitHub Release created
- The tag points to the finalized `main` HEAD (post-`release-it` commit)

- [ ] **Step 7: Verify Vercel production deployment**

Wait for Vercel production deployment to succeed for the finalized `main` HEAD.
Verify at: https://vercel.com/timelessco/recollect/deployments

The deployed SHA should match the tagged commit (the `release-it` version bump commit), not the merge commit.

- [ ] **Step 8: Run `pnpm release:cleanup`**

Verify:
- `origin/main` merged back into `dev`
- `release/*` branch deleted locally and on remote
- `package.json` and `CHANGELOG.md` on dev match main

- [ ] **Step 9: Verify acceptance criteria**

All of the following must be true:
- Release PR merged to main via merge commit
- `release-it` created version bump commit, signed tag, and GitHub Release
- Vercel production deployment for the finalized `main` HEAD succeeded
- main backmerged into dev
- release/* branch deleted
- No file drift between main and dev (for release-managed files)
