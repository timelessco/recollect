#!/bin/bash

# Recollect Git Worktree Manager
# Handles creating, listing, switching, and cleaning up Git worktrees
# KISS principle: Simple, interactive, opinionated

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get repo root
GIT_ROOT=$(git rev-parse --show-toplevel)
WORKTREE_DIR="$GIT_ROOT/.worktrees"

# Create a new worktree
create_worktree() {
	local branch_name="$1"
	local from_branch="${2:-main}"

	if [[ -z "$branch_name" ]]; then
		echo -e "${RED}Error: Branch name required${NC}"
		exit 1
	fi

	local worktree_path="$WORKTREE_DIR/$branch_name"

	# Check if worktree already exists
	if [[ -d "$worktree_path" ]]; then
		echo -e "${YELLOW}Worktree already exists at: $worktree_path${NC}"
		echo -e "Switch to it instead? (y/n)"
		read -r response
		if [[ "$response" == "y" ]]; then
			switch_worktree "$branch_name"
		fi
		return
	fi

	echo -e "${BLUE}Creating worktree: $branch_name${NC}"
	echo "  From: $from_branch"
	echo "  Path: $worktree_path"
	echo ""
	echo "Proceed? (y/n)"
	read -r response

	if [[ "$response" != "y" ]]; then
		echo -e "${YELLOW}Cancelled${NC}"
		return
	fi

	# Update main branch
	echo -e "${BLUE}Updating $from_branch...${NC}"
	git checkout "$from_branch"
	git pull origin "$from_branch" || true

	# Create worktree
	mkdir -p "$WORKTREE_DIR"

	echo -e "${BLUE}Creating worktree...${NC}"
	git worktree add -b "$branch_name" "$worktree_path" "$from_branch"

	# Copy .env.local
	if [[ -f "$GIT_ROOT/.env.local" ]]; then
		cp "$GIT_ROOT/.env.local" "$worktree_path/.env.local"
		echo -e "${GREEN}✓ Copied .env.local${NC}"
	else
		echo -e "${YELLOW}⚠ No .env.local found in main repo${NC}"
	fi

	# Install dependencies
	echo -e "${BLUE}Installing dependencies...${NC}"
	cd "$worktree_path"
	pnpm install
	echo -e "${GREEN}✓ Dependencies installed${NC}"

	echo -e "${GREEN}✓ Worktree created successfully!${NC}"
	echo ""
	echo "To start development:"
	echo -e "${BLUE}cd $worktree_path${NC}"
	echo -e "${BLUE}pnpm run dev${NC}"
	echo ""
}

# List all worktrees
list_worktrees() {
	echo -e "${BLUE}Available worktrees:${NC}"
	echo ""

	if [[ ! -d "$WORKTREE_DIR" ]]; then
		echo -e "${YELLOW}No worktrees found${NC}"
		return
	fi

	local count=0
	for worktree_path in "$WORKTREE_DIR"/*; do
		if [[ -d "$worktree_path" && -d "$worktree_path/.git" ]]; then
			count=$((count + 1))
			local worktree_name=$(basename "$worktree_path")
			local branch=$(git -C "$worktree_path" rev-parse --abbrev-ref HEAD 2> /dev/null || echo "unknown")

			if [[ "$PWD" == "$worktree_path" ]]; then
				echo -e "${GREEN}✓ $worktree_name${NC} (current) → branch: $branch"
			else
				echo -e "  $worktree_name → branch: $branch"
			fi
		fi
	done

	if [[ $count -eq 0 ]]; then
		echo -e "${YELLOW}No worktrees found${NC}"
	else
		echo ""
		echo -e "${BLUE}Total: $count worktree(s)${NC}"
	fi

	echo ""
	echo -e "${BLUE}Main repository:${NC}"
	local main_branch=$(git rev-parse --abbrev-ref HEAD 2> /dev/null || echo "unknown")
	echo "  Branch: $main_branch"
	echo "  Path: $GIT_ROOT"
}

# Switch to a worktree
switch_worktree() {
	local worktree_name="$1"

	if [[ -z "$worktree_name" ]]; then
		list_worktrees
		echo -e "${BLUE}Switch to which worktree? (enter name)${NC}"
		read -r worktree_name
	fi

	local worktree_path="$WORKTREE_DIR/$worktree_name"

	if [[ ! -d "$worktree_path" ]]; then
		echo -e "${RED}Error: Worktree not found: $worktree_name${NC}"
		echo ""
		list_worktrees
		exit 1
	fi

	echo -e "${GREEN}Switching to worktree: $worktree_name${NC}"
	cd "$worktree_path"
	echo -e "${BLUE}Now in: $(pwd)${NC}"
}

# Clean up completed worktrees
cleanup_worktrees() {
	if [[ ! -d "$WORKTREE_DIR" ]]; then
		echo -e "${YELLOW}No worktrees to clean up${NC}"
		return
	fi

	echo -e "${BLUE}Checking for completed worktrees...${NC}"
	echo ""

	local found=0
	local to_remove=()

	for worktree_path in "$WORKTREE_DIR"/*; do
		if [[ -d "$worktree_path" && -d "$worktree_path/.git" ]]; then
			local worktree_name=$(basename "$worktree_path")

			# Skip if current worktree
			if [[ "$PWD" == "$worktree_path" ]]; then
				echo -e "${YELLOW}(skip) $worktree_name - currently active${NC}"
				continue
			fi

			found=$((found + 1))
			to_remove+=("$worktree_path")
			echo -e "${YELLOW}• $worktree_name${NC}"
		fi
	done

	if [[ $found -eq 0 ]]; then
		echo -e "${GREEN}No inactive worktrees to clean up${NC}"
		return
	fi

	echo ""
	echo -e "Remove $found worktree(s)? (y/n)"
	read -r response

	if [[ "$response" != "y" ]]; then
		echo -e "${YELLOW}Cleanup cancelled${NC}"
		return
	fi

	echo -e "${BLUE}Cleaning up worktrees...${NC}"
	for worktree_path in "${to_remove[@]}"; do
		local worktree_name=$(basename "$worktree_path")
		git worktree remove "$worktree_path" --force 2> /dev/null || true
		echo -e "${GREEN}✓ Removed: $worktree_name${NC}"
	done

	# Clean up empty directory if nothing left
	if [[ -z "$(ls -A "$WORKTREE_DIR" 2> /dev/null)" ]]; then
		rmdir "$WORKTREE_DIR" 2> /dev/null || true
	fi

	echo -e "${GREEN}Cleanup complete!${NC}"
}

# Main command handler
main() {
	local command="${1:-list}"

	case "$command" in
		create)
			create_worktree "$2" "$3"
			;;
		list | ls)
			list_worktrees
			;;
		switch | go)
			switch_worktree "$2"
			;;
		cleanup | clean)
			cleanup_worktrees
			;;
		help)
			show_help
			;;
		*)
			echo -e "${RED}Unknown command: $command${NC}"
			echo ""
			show_help
			exit 1
			;;
	esac
}

show_help() {
	cat << EOF
Recollect Git Worktree Manager

Usage: worktree-manager.sh <command> [options]

Commands:
  create <branch-name> [from-branch]  Create new worktree
                                      - Copies .env.local
                                      - Runs pnpm install
                                      (from-branch defaults to main)
  list | ls                           List all worktrees
  switch | go [name]                  Switch to worktree
  cleanup | clean                     Clean up inactive worktrees
  help                                Show this help message

Examples:
  worktree-manager.sh create feature-login
  worktree-manager.sh switch feature-login
  worktree-manager.sh cleanup
  worktree-manager.sh list

EOF
}

# Run
main "$@"
