#!/bin/bash
set -e

INPUT=$(cat)
NAME=$(echo "$INPUT" | jq -r '.name')
CWD=$(echo "$INPUT" | jq -r '.cwd')
WORKTREE_PATH="$CWD/.claude/worktrees/$NAME"

git -C "$CWD" worktree add "$WORKTREE_PATH" >&2

# Copy gitignored assets that worktrees need
[ -f "$CWD/.env.local" ] && cp "$CWD/.env.local" "$WORKTREE_PATH/.env.local" && echo "Copied .env.local" >&2
[ -d "$CWD/.planning" ] && cp -R "$CWD/.planning" "$WORKTREE_PATH/.planning" && echo "Copied .planning/" >&2

echo "$WORKTREE_PATH"
