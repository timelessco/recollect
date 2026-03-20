#!/bin/bash
#
# Post-release cleanup: merges main back into dev and deletes
# the release/* branch (if it still exists).
#
# Run this after pnpm release succeeds AND Vercel production
# deployment for the finalized main HEAD is confirmed successful.
#
# The backmerge always runs. Branch deletion is best-effort
# (GitHub auto-delete-on-merge may have already removed it).
#
# Requires: gh CLI, git
#

set -eo pipefail

REMOTE=${REMOTE:-origin}

# --- Preflight checks ---

for cmd in gh git; do
	if ! command -v "$cmd" &> /dev/null; then
		echo "Error: $cmd is not installed." >&2
		exit 1
	fi
done

echo "Fetching latest from $REMOTE..."
git fetch "$REMOTE" || {
	echo "Error: git fetch failed." >&2
	exit 1
}

# --- Save and normalize original branch ---

ORIGINAL_BRANCH=$(git rev-parse --abbrev-ref HEAD)
# If on a release branch that will be deleted, default to dev
if [[ "$ORIGINAL_BRANCH" == release/* ]]; then
	ORIGINAL_BRANCH=dev
fi

# --- Find release branch (best-effort, may already be auto-deleted) ---

RELEASE_BRANCHES=$(git branch -r --list "$REMOTE/release/*" | xargs)
BRANCH_COUNT=$(echo "$RELEASE_BRANCHES" | wc -w | tr -d ' ')

if [ "$BRANCH_COUNT" -gt 1 ]; then
	echo "Error: multiple release branches found:" >&2
	echo "$RELEASE_BRANCHES" >&2
	echo "Expected at most one. Resolve manually." >&2
	exit 1
fi

if [ "$BRANCH_COUNT" -eq 1 ]; then
	RELEASE_BRANCH=$(echo "$RELEASE_BRANCHES" | sed "s|$REMOTE/||" | xargs)
	echo "Found release branch: $RELEASE_BRANCH"
else
	echo "No remote release branch found (likely auto-deleted on PR merge)."
	RELEASE_BRANCH=""
fi

# --- Merge main back into dev (always runs) ---

echo "Merging $REMOTE/main into dev..."
git checkout dev
git pull --ff-only "$REMOTE" dev || {
	echo "Error: dev has diverged from $REMOTE/dev." >&2
	echo "Someone may have pushed during the release window. Resolve manually." >&2
	git checkout "$ORIGINAL_BRANCH"
	exit 1
}
git merge "$REMOTE/main" -m "chore(release): merge main back into dev after release" || {
	echo "Error: merge conflict merging main into dev." >&2
	echo "Resolve conflicts, commit, push dev, then delete the release branch manually." >&2
	exit 1
}
# Clear API changelog — accumulated changes are now released
# Uses a separate commit (not --amend) to preserve the merge commit SHA,
# which must match origin/main for merge-base --is-ancestor to pass
API_CHANGELOG_FILE="docs/API_CHANGELOG.md"
if [ -s "$API_CHANGELOG_FILE" ]; then
	> "$API_CHANGELOG_FILE"
	git add "$API_CHANGELOG_FILE"
	git commit -m "chore(release): clear API changelog after release"
fi
git push "$REMOTE" dev

# --- Delete release branch (best-effort) ---

if [ -n "$RELEASE_BRANCH" ]; then
	echo "Deleting release branch: $RELEASE_BRANCH"
	git branch -d "$RELEASE_BRANCH" 2> /dev/null || true
	git push "$REMOTE" --delete "$RELEASE_BRANCH" 2> /dev/null || true
fi

# Clean up any stale local release branches
for local_branch in $(git branch --list "release/*" | xargs); do
	git branch -D "$local_branch" 2> /dev/null || true
done

echo "Cleanup complete."
git checkout "$ORIGINAL_BRANCH"
