#!/bin/bash
#
# Cuts a frozen release/* branch from dev and creates a release PR
# to main with a changelog body listing all commits/PRs since the
# last release tag.
#
# Usage:
#   ./scripts/release-pr.sh            # Interactive: preview, confirm, create
#   ./scripts/release-pr.sh --dry-run   # Preview changelog only, no remote changes
#   ./scripts/release-pr.sh --yes       # Non-interactive: auto-confirm all prompts
#   ./scripts/release-pr.sh --yes --dry-run
#
# Requires: gh CLI, git
#
# Override branches:
#   SOURCE_BRANCH=dev TARGET_BRANCH=main ./scripts/release-pr.sh
#

set -eo pipefail

DRY_RUN=false
AUTO_YES=false
for arg in "$@"; do
	case "$arg" in
		--dry-run) DRY_RUN=true ;;
		--yes | -y) AUTO_YES=true ;;
	esac
done

SOURCE_BRANCH=${SOURCE_BRANCH:-dev}
TARGET_BRANCH=${TARGET_BRANCH:-main}
REMOTE=${REMOTE:-origin}

# --- Preflight checks ---

for cmd in gh git; do
	if ! command -v "$cmd" &> /dev/null; then
		echo "Error: $cmd is not installed." >&2
		exit 1
	fi
done

REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner')
if [ -z "$REPO" ]; then
	echo "Error: could not determine repository." >&2
	exit 1
fi

# --- Fetch and check for existing release branches ---

echo "Fetching latest from $REMOTE..."
git fetch "$REMOTE" || {
	echo "Error: git fetch failed." >&2
	exit 1
}

RELEASE_BRANCHES=$(git branch -r --list "$REMOTE/release/*" | xargs)
BRANCH_COUNT=$(echo "$RELEASE_BRANCHES" | wc -w | tr -d ' ')

if [ "$BRANCH_COUNT" -gt 1 ]; then
	echo "Error: multiple release branches found:" >&2
	echo "$RELEASE_BRANCHES" >&2
	exit 1
fi

if [ "$BRANCH_COUNT" -eq 1 ]; then
	EXISTING_BRANCH=$(echo "$RELEASE_BRANCHES" | sed "s|$REMOTE/||" | xargs)
	EXISTING_PR=$(gh pr list --head "$EXISTING_BRANCH" --base "$TARGET_BRANCH" --state open --json number -q '.[0].number')

	if [ -z "$EXISTING_PR" ]; then
		echo "Error: stale release branch '$EXISTING_BRANCH' exists without an open PR." >&2
		echo "Run: pnpm release:cleanup" >&2
		exit 1
	fi

	echo "Found existing release PR #$EXISTING_PR ($EXISTING_BRANCH)"

	if [ "$DRY_RUN" = true ]; then
		echo "[dry-run] Would delete PR #$EXISTING_PR and branch $EXISTING_BRANCH, then recreate."
	else
		if [ "$AUTO_YES" = true ]; then
			response="y"
		else
			read -r -p "Delete and recreate release PR? [y/N] " response
		fi
		if [[ ! "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
			echo "Cancelled."
			exit 0
		fi
		echo "Closing PR #$EXISTING_PR and deleting $EXISTING_BRANCH..."
		gh pr close "$EXISTING_PR" --delete-branch
		git branch -d "$EXISTING_BRANCH" 2> /dev/null || true
	fi
fi

# Check that main is an ancestor of dev (no divergence)
if ! git merge-base --is-ancestor "$REMOTE/$TARGET_BRANCH" "$REMOTE/$SOURCE_BRANCH"; then
	echo "Error: $REMOTE/$TARGET_BRANCH has commits not in $REMOTE/$SOURCE_BRANCH." >&2
	echo "Merge $TARGET_BRANCH into $SOURCE_BRANCH first to resolve divergence." >&2
	exit 1
fi

# --- Determine range ---

LAST_TAG=$(git tag --sort=-version:refname --merged "$REMOTE/$TARGET_BRANCH" | head -1)

if [ -n "$LAST_TAG" ]; then
	RANGE_START="$LAST_TAG"
	echo "Last release: $LAST_TAG"
else
	RANGE_START=$(git merge-base "$REMOTE/$TARGET_BRANCH" "$REMOTE/$SOURCE_BRANCH")
	echo "No release tags found. Using merge-base: ${RANGE_START:0:8}"
fi

# --- Collect commits ---

COMMITS=$(git log --pretty=format:"%H %s" --no-merges "$RANGE_START".."$REMOTE/$SOURCE_BRANCH")

if [ -z "$COMMITS" ]; then
	echo "No new commits since $RANGE_START. Nothing to release."
	exit 0
fi

# --- Section title lookup (bash 3.2 compatible, no declare -A) ---

get_section_title() {
	case "$1" in
		feat) echo "New Features" ;;
		fix) echo "Bug Fixes" ;;
		refactor) echo "Code Refactoring" ;;
		perf) echo "Performance Improvements" ;;
		docs) echo "Documentation Changes" ;;
		test) echo "Test Updates" ;;
		build) echo "Build Updates" ;;
		ci) echo "CI Changes" ;;
		revert) echo "Reverted Changes" ;;
		chore) echo "Maintenance Updates" ;;
		style) echo "Code Style Changes" ;;
		*) echo "" ;;
	esac
}

# Use temp dir for per-type accumulation (avoids associative arrays)
TMPDIR_SECTIONS=$(mktemp -d)
# rm is intentional here — temp dir created by this script, not user data
trap 'rm -rf "$TMPDIR_SECTIONS"' EXIT

# --- Batch GraphQL: map all commits to their PRs in one query ---

PR_MAP_FILE="$TMPDIR_SECTIONS/_pr_map"
SEEN_PRS_FILE="$TMPDIR_SECTIONS/_seen_prs"
touch "$PR_MAP_FILE" "$SEEN_PRS_FILE"

SHA_ARRAY=()
while IFS= read -r line; do
	[ -z "$line" ] && continue
	SHA_ARRAY+=("${line%% *}")
done <<< "$COMMITS"

TOTAL=${#SHA_ARRAY[@]}

if [ "$TOTAL" -gt 0 ]; then
	echo "Fetching PR associations for $TOTAL commits..." >&2

	# GitHub's GraphQL API rejects very large aliased queries (node/complexity
	# limit). Batch in chunks to stay under the limit and keep failures visible.
	CHUNK_SIZE=50
	CHUNK_INDEX=0

	while [ "$CHUNK_INDEX" -lt "$TOTAL" ]; do
		CHUNK_END=$((CHUNK_INDEX + CHUNK_SIZE))
		[ "$CHUNK_END" -gt "$TOTAL" ] && CHUNK_END=$TOTAL

		ALIASES=""
		i=$CHUNK_INDEX
		while [ "$i" -lt "$CHUNK_END" ]; do
			ALIASES="${ALIASES} c${i}: object(expression: \"${SHA_ARRAY[$i]}\") { ... on Commit { author { user { login } } associatedPullRequests(first: 1) { nodes { number title author { login } } } } }"
			i=$((i + 1))
		done

		QUERY_STRING="query { repository(name: \"${REPO#*/}\", owner: \"${REPO%/*}\") {${ALIASES} } }"

		CHUNK_ERR=$(mktemp)
		if ! gh api graphql -f query="$QUERY_STRING" --jq '
			.data.repository | to_entries[] |
			select(.value != null) |
			[
				.key,
				((.value.associatedPullRequests.nodes[0].number // "") | tostring),
				(.value.associatedPullRequests.nodes[0].title // ""),
				(.value.associatedPullRequests.nodes[0].author.login // ""),
				(.value.author.user.login // "")
			] | @tsv
		' > "$TMPDIR_SECTIONS/_cidx_map" 2> "$CHUNK_ERR"; then
			FIRST_SHA="${SHA_ARRAY[$CHUNK_INDEX]:0:7}"
			LAST_SHA="${SHA_ARRAY[$((CHUNK_END - 1))]:0:7}"
			HUMAN_START=$((CHUNK_INDEX + 1))
			echo "Warning: GraphQL PR enrichment failed for commits ${HUMAN_START}-${CHUNK_END} (${FIRST_SHA}..${LAST_SHA}):" >&2
			cat "$CHUNK_ERR" >&2
			rm -f "$CHUNK_ERR"
			CHUNK_INDEX=$CHUNK_END
			continue
		fi
		rm -f "$CHUNK_ERR"

		# Parse with cut (not IFS read) — bash read treats tab as IFS whitespace
		# and collapses consecutive tabs, so rows with empty PR_NUM/PR_TITLE/
		# PR_AUTHOR but populated COMMIT_LOGIN would shift fields.
		while IFS= read -r jq_line; do
			CIDX=$(printf '%s' "$jq_line" | cut -f1)
			PR_NUM=$(printf '%s' "$jq_line" | cut -f2)
			PR_TITLE=$(printf '%s' "$jq_line" | cut -f3)
			PR_AUTHOR=$(printf '%s' "$jq_line" | cut -f4)
			COMMIT_LOGIN=$(printf '%s' "$jq_line" | cut -f5)
			IDX_NUM="${CIDX#c}"
			SHA="${SHA_ARRAY[$IDX_NUM]}"
			[ -z "$SHA" ] && continue
			printf '%s\t%s\t%s\t%s\t%s\n' "$SHA" "$PR_NUM" "$PR_TITLE" "$PR_AUTHOR" "$COMMIT_LOGIN" >> "$PR_MAP_FILE"
		done < "$TMPDIR_SECTIONS/_cidx_map"

		CHUNK_INDEX=$CHUNK_END
	done
fi

# --- Process commits ---

OTHER_ENTRIES=""
COMMIT_COUNT=$(echo "$COMMITS" | wc -l | tr -d ' ')
CURRENT=0

while IFS= read -r line; do
	[ -z "$line" ] && continue
	CURRENT=$((CURRENT + 1))

	SHA="${line%% *}"
	SUBJECT="${line#* }"
	SHORT_SHA="${SHA:0:7}"

	printf "\rProcessing commit %d/%d..." "$CURRENT" "$COMMIT_COUNT" >&2

	# Filter release commits
	case "$SUBJECT" in
		"feat(release): 🚀"* | "🚀 Release v"*) continue ;;
	esac

	# Look up PR + author login from batch map
	PR_LINE=$(grep "^${SHA}" "$PR_MAP_FILE" 2> /dev/null | head -1 || true)
	PR_NUMBER=""
	PR_TITLE=""
	PR_AUTHOR=""
	COMMIT_LOGIN=""
	if [ -n "$PR_LINE" ]; then
		PR_NUMBER=$(printf '%s' "$PR_LINE" | cut -f2)
		PR_TITLE=$(printf '%s' "$PR_LINE" | cut -f3)
		PR_AUTHOR=$(printf '%s' "$PR_LINE" | cut -f4)
		COMMIT_LOGIN=$(printf '%s' "$PR_LINE" | cut -f5)
	fi

	# Dedup: one entry per PR
	if [ -n "$PR_NUMBER" ]; then
		if grep -q "^${PR_NUMBER}$" "$SEEN_PRS_FILE" 2> /dev/null; then
			continue
		fi
		echo "$PR_NUMBER" >> "$SEEN_PRS_FILE"
	fi

	# Build the changelog entry
	COMMIT_TYPE=""
	if [ -n "$PR_NUMBER" ]; then
		PR_URL="https://github.com/$REPO/pull/$PR_NUMBER"
		DESCRIPTION="${PR_TITLE:-$SUBJECT}"
		if [[ "$DESCRIPTION" =~ ^([a-z]+)(\(.+\))?!?:\ (.+)$ ]]; then
			COMMIT_TYPE="${BASH_REMATCH[1]}"
		fi
		# Prefer PR author; fall back to commit author's GitHub login
		DISPLAY_LOGIN="${PR_AUTHOR:-$COMMIT_LOGIN}"
		if [ -n "$DISPLAY_LOGIN" ]; then
			ENTRY="* $DESCRIPTION ([#$PR_NUMBER]($PR_URL)) — @$DISPLAY_LOGIN"
		else
			ENTRY="* $DESCRIPTION ([#$PR_NUMBER]($PR_URL))"
		fi
	else
		COMMIT_URL="https://github.com/$REPO/commit/$SHA"
		if [[ "$SUBJECT" =~ ^([a-z]+)(\(.+\))?!?:\ (.+)$ ]]; then
			COMMIT_TYPE="${BASH_REMATCH[1]}"
		fi
		if [ -n "$COMMIT_LOGIN" ]; then
			ENTRY="* $SUBJECT ([$SHORT_SHA]($COMMIT_URL)) — @$COMMIT_LOGIN"
		else
			# Fallback: GraphQL didn't resolve a GitHub user (e.g. email-only author)
			AUTHOR_NAME=$(git log -1 --format='%an' "$SHA")
			ENTRY="* $SUBJECT ([$SHORT_SHA]($COMMIT_URL)) — $AUTHOR_NAME"
		fi
	fi

	# Place in correct section via temp files
	TITLE=$(get_section_title "$COMMIT_TYPE")
	if [ -n "$TITLE" ]; then
		echo "$ENTRY" >> "$TMPDIR_SECTIONS/$COMMIT_TYPE"
	else
		OTHER_ENTRIES+="$ENTRY"$'\n'
	fi
done <<< "$COMMITS"
echo "" >&2

# --- Build changelog body ---

CHANGELOG=""

for type in feat fix refactor perf docs test build ci revert chore style; do
	if [ -f "$TMPDIR_SECTIONS/$type" ]; then
		TITLE=$(get_section_title "$type")
		CHANGELOG+="### $TITLE"$'\n\n'
		CHANGELOG+="$(cat "$TMPDIR_SECTIONS/$type")"$'\n\n'
	fi
done

if [ -n "$OTHER_ENTRIES" ]; then
	CHANGELOG+="### Other"$'\n\n'
	CHANGELOG+="$OTHER_ENTRIES"$'\n'
fi

# --- Preview ---

RELEASE_DATE=$(date +"%Y-%m-%d-%H%M")
RELEASE_BRANCH="release/$RELEASE_DATE"
TITLE="feat(release): 🚀 $(date +'%d %b %Y %I:%M %p')"

echo ""
echo "=========================================="
echo "Release Changelog"
echo "=========================================="
echo ""
echo "$CHANGELOG"
echo "PR: $RELEASE_BRANCH → $TARGET_BRANCH"
echo "Title: $TITLE"

API_CHANGELOG_FILE="docs/API_CHANGELOG.md"

if [ "$DRY_RUN" = true ]; then
	echo ""
	if [ -s "$API_CHANGELOG_FILE" ]; then
		echo "[dry-run] Would post API changelog as PR comment."
	fi
	echo "[dry-run] No branches created, no PR opened."
	exit 0
fi

# --- Confirm, then create branch + PR ---

echo ""
if [ "$AUTO_YES" = true ]; then
	response="y"
else
	read -r -p "Create release branch and PR? [y/N] " response
fi

if [[ ! "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
	echo "Cancelled."
	exit 0
fi

ORIGINAL_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Clean up stale local branch from a previous aborted attempt
if git show-ref --verify --quiet "refs/heads/$RELEASE_BRANCH"; then
	echo "Removing stale local branch: $RELEASE_BRANCH"
	git branch -D "$RELEASE_BRANCH"
fi

cleanup_release_branch() {
	echo "Cleaning up release branch..." >&2
	git checkout "$ORIGINAL_BRANCH" 2> /dev/null || git checkout dev
	git branch -D "$RELEASE_BRANCH" 2> /dev/null || true
	git push "$REMOTE" --delete "$RELEASE_BRANCH" 2> /dev/null || true
}

echo "Creating release branch: $RELEASE_BRANCH from $REMOTE/$SOURCE_BRANCH"
git checkout -b "$RELEASE_BRANCH" "$REMOTE/$SOURCE_BRANCH"

if ! git push "$REMOTE" "$RELEASE_BRANCH"; then
	echo "Error: failed to push release branch." >&2
	cleanup_release_branch
	exit 1
fi

PR_URL=$(gh pr create \
	--base "$TARGET_BRANCH" \
	--head "$RELEASE_BRANCH" \
	--title "$TITLE" \
	--label "release" \
	--body "$CHANGELOG") || {
	echo "Error: PR creation failed." >&2
	cleanup_release_branch
	exit 1
}
PR_NUMBER=$(echo "$PR_URL" | grep -oE '[0-9]+$')

# Post API changelog as a comment if the file has content
if [ -s "$API_CHANGELOG_FILE" ]; then
	COMMENT_BODY="## API Changelog

$(cat "$API_CHANGELOG_FILE")"
	gh pr comment "$PR_NUMBER" --body "$COMMENT_BODY"
	echo "Posted API changelog as comment on PR #$PR_NUMBER"
fi

echo "Release PR created."
git checkout "$ORIGINAL_BRANCH"
