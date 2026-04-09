---
name: prod-hotfix
description: >
  Ship a small urgent fix directly to main and backmerge into dev, bypassing
  the normal release PR pipeline. Use when the user says "hotfix", "quick fix
  to prod", "push to prod directly", "hotfix to main", "emergency fix", or
  describes a one/two-file fix that can't wait for the next release cycle. This
  is the emergency path — prefer the /release skill for normal releases.
  Execution skill: normalizes local state, pulls both branches, verifies,
  commits on main, pushes with admin bypass, then merges main → dev.
disable-model-invocation: true
---

# Production Hotfix

Ships a small fix directly to `main` without going through the release PR pipeline, then backmerges `main` into `dev` so the two branches stay in sync. Normal changes still go through `/release` — this exists only for urgent fixes that cannot wait.

## When NOT to use this

- Multi-file refactors or feature work → use `/release`
- Anything that needs CodeRabbit review or a second pair of eyes → use `/release`
- Changes touching migrations, auth, billing, or anything with a non-trivial blast radius → too risky for the bypass, open a hotfix PR instead

## Prerequisites

- The fix is scoped to one or two files, minimal blast radius
- You have admin permissions on the repo (the push to `main` bypasses branch protection — non-admins get rejected outright)
- No concurrent release PR is in flight (check with `gh pr list --label release`)

## Starting states this skill handles

The workflow branches on what state the local checkout is in when the skill runs:

1. **Uncommitted change on `dev`** — working tree is dirty with the fix
2. **Already committed on `dev`** — you committed the fix before realizing it needs the hotfix path (what we hit in the motivating session)
3. **Nothing yet** — no edit made; stop and make the edit on `dev` first, then rerun

## Steps

Run steps in order. Stop and report if any step fails — do not try to push through a red state.

### Step 1: Normalize the starting state

Check where you are:

```bash
git branch --show-current
git status --short
git log --oneline origin/dev..HEAD
```

Handle each starting state:

**If there is a local commit on `dev`** (third command has output), uncommit it but keep the change in the working tree:

```bash
git reset --mixed HEAD~1
```

**If the working tree has uncommitted changes** (from the reset above, or because the user never committed), stash them so the pull cannot conflict:

```bash
git stash push -m "prod-hotfix"
```

Stash everything rather than cherry-picking paths — the fix may touch multiple files and we want the whole diff moved atomically.

**If the working tree was clean AND there was no local commit**, stop. There is nothing to hotfix. Ask the user to make the edit on `dev` first.

### Step 2: Pull both branches

```bash
git fetch origin
git pull --ff-only origin dev
git checkout main
git pull --ff-only origin main
```

Both pulls must be fast-forwards. If either refuses to fast-forward, stop — local divergence means this hotfix path is not safe and the user should investigate manually. Do not use `git pull --rebase` or `git reset --hard` to force it.

### Step 3: Apply the fix on main

```bash
git stash pop
git diff
```

Read the diff carefully. Confirm it is exactly the intended fix and nothing else — no stray formatter churn, no unrelated files. If the stash pop conflicts, `main` has diverged from `dev` in the file being fixed and the fix probably needs to be rewritten against the current `main` contents; stop and report.

### Step 4: Verify

Run the project verification chain before committing. All three must pass:

```bash
pnpm fix
pnpm lint
pnpm build
```

`pnpm fix` runs auto-fixers (may modify files — if it does, re-inspect with `git diff`). `pnpm lint` runs all quality gates in parallel. `pnpm build` confirms the production build still compiles. Do not skip `pnpm build` even for trivial changes — silent build regressions on `main` are exactly what branch protection exists to prevent, and the skill is already bypassing that.

### Step 5: Commit on main

Use a conventional commit matching the project style (see `.claude/rules/commands.md`). Example:

```bash
git add <path/to/file>
git commit -m "$(cat <<'EOF'
<type>(<scope>): <gitmoji> <subject>

- <why / what changed>
EOF
)"
```

Types used in this repo: `fix` for bugs, `style` for UI/cosmetic, `perf`, `chore`, `docs`, `refactor`, `feat`. Gitmoji goes after the colon+space. Subject under 50 chars, imperative mood, no trailing period.

### Step 6: Push to prod

```bash
git push origin main
```

Expected output includes a bypass notice:

```
remote: Bypassed rule violations for refs/heads/main:
remote: - Changes must be made through a pull request.
remote: - Required status check "Vercel" is expected.
```

This is normal — branch protection on `main` is configured to allow admin bypass. **If the push is rejected outright** (not just annotated with "Bypassed"), the user does not have admin and this path cannot continue. Stop and tell them to open a hotfix PR against `main` instead.

### Step 7: Backmerge main → dev

```bash
git checkout dev
git merge main --no-ff -m "chore(release): merge main back into dev after hotfix"
git push origin dev
```

The `--no-ff` preserves the merge commit so the backmerge is visible in history, matching the commit style the CI release pipeline uses (grep for `d0196bd5` in the log as a reference). This keeps `dev` ahead of `main` by exactly the already-unreleased work plus the merge commit.

### Step 8: Confirm clean state

```bash
git pull
git log --oneline -5
git log --oneline origin/main..origin/dev | head -3
```

The log should show, top-down: the backmerge commit, the hotfix commit, the previous `dev` tip. `origin/main..origin/dev` should still list every unreleased commit — confirming the hotfix did not accidentally ship any of the in-flight work.

## After the hotfix

- **Watch Vercel on main.** The hotfix triggers the normal Vercel production deploy on `main` but does NOT run `release-it`, so no new tag or GitHub Release is created. The next proper release (via `/release`) will pick up the hotfix commit in the changelog automatically.
- **API changelog.** If the hotfix touches public API surface, add the entry to `docs/API_CHANGELOG.md` on `dev` after the backmerge — it will be posted as a PR comment during the next release.
- **Post to Slack dev channel** (optional, matches the `/release` skill convention): a short note that a hotfix shipped directly to `main`, with the commit SHA and a one-line description.

## Red flags — stop and report instead of pushing through

| Signal | What it means | Action |
|---|---|---|
| Either pull refused to fast-forward | Local `dev` or `main` has diverged | Investigate manually; do not force |
| `pnpm fix` / `lint` / `build` fails | Fix has a secondary regression | Fix the regression, rerun verification, only then commit |
| `git stash pop` conflicts | `main` diverged from `dev` in the target file | Rewrite the fix against current `main` |
| Push to `main` rejected (not bypassed) | No admin permissions | Open a hotfix PR against `main` instead |
| `origin/main..origin/dev` shows unexpected commits after Step 8 | Backmerge picked up stale state | Investigate; may need to reset `dev` |

## Why this skill exists

The normal release pipeline (`/release`) bundles commits from `dev` into a `release/*` branch, runs CodeRabbit + CI, merges to `main` via admin-approved PR, and runs `release-it` to cut a tag. That pipeline is the right default — it exists because shipping straight to `main` is risky.

This skill exists for the narrow case where:
- The fix is so small and so obviously correct that full review is overhead, not safety
- The issue is user-visible in production right now and waiting for the next release cycle is worse than the residual risk of bypassing review
- The person running the skill has admin and is accountable for the call

Keep the bar high for invoking it. If in doubt, use `/release`.
