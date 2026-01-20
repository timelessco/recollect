# Review Current Branch Against Dev Branch

This command reviews your current branch changes against the `dev` branch using the PR Standards Checklist.

## Usage

Run this command to get a comprehensive review of your changes:

```bash
# Ensure you're on your feature branch
git status

# Fetch latest dev branch
git fetch origin dev

# Review changes against dev
# This will analyze all changes and check against PR standards
```

## Automated Review Process

This review checks:

1. **Database Migrations** - File naming, structure, RLS policies, indexes, documentation
2. **API Routes** - Authentication, validation, error handling, documentation
3. **TypeScript Standards** - Types, exports, strict mode compliance
4. **React/React Query** - Hook patterns, optimistic mutations, query invalidation
5. **Code Quality** - File size, linting, naming conventions

---

## Step-by-Step Review Checklist

### 1. Get Changed Files

```bash
# Get list of changed files compared to dev
git diff --name-status origin/dev...HEAD

# Get detailed diff
git diff origin/dev...HEAD

# Get only SQL migration files
git diff --name-only origin/dev...HEAD | grep '\.sql$'

# Get only TypeScript/TSX files
git diff --name-only origin/dev...HEAD | grep -E '\.(ts|tsx)$'
```

### 2. Review Database Migrations

For each migration file (`supabase/migrations/*.sql`):

#### ✅ Check File Naming

```bash
# Verify migration file naming convention
git diff --name-only origin/dev...HEAD | grep 'supabase/migrations/.*\.sql$' | while read file; do
	filename=$(basename "$file")
	if [[ ! "$filename" =~ ^[0-9]{14}_[a-z0-9_]+\.sql$ ]]; then
		echo "❌ INVALID: $filename - Must match YYYYMMDDHHmmss_description.sql"
	else
		echo "✅ VALID: $filename"
	fi
done
```

#### ✅ Check Migration Structure

```bash
# Check for BEGIN/COMMIT transaction blocks
git diff origin/dev...HEAD -- 'supabase/migrations/*.sql' | grep -E '^(BEGIN|COMMIT)' || echo "❌ Missing BEGIN/COMMIT transaction blocks"

# Check for header comments
git diff origin/dev...HEAD -- 'supabase/migrations/*.sql' | grep -E '^\+-- ============================================================================' || echo "❌ Missing migration header comments"

# Check for SET search_path
git diff origin/dev...HEAD -- 'supabase/migrations/*.sql' | grep -E 'SET search_path' || echo "⚠️  Consider adding SET search_path = public, pg_temp"
```

#### ✅ Check RLS Policies

```bash
# Check if RLS is enabled for new tables
git diff origin/dev...HEAD -- 'supabase/migrations/*.sql' | grep -E 'CREATE TABLE' | while read line; do
	table=$(echo "$line" | grep -oP 'CREATE TABLE[^(]*\K[^(]+')
	if ! git diff origin/dev...HEAD -- 'supabase/migrations/*.sql' | grep -q "ALTER TABLE.*$table.*ENABLE ROW LEVEL SECURITY"; then
		echo "❌ Missing RLS for table: $table"
	fi
done

# Check for granular RLS policies (not combined)
git diff origin/dev...HEAD -- 'supabase/migrations/*.sql' | grep -E 'CREATE POLICY.*FOR ALL' && echo "❌ Found FOR ALL policy - should be separate policies per operation"

# Check for role-specific policies
git diff origin/dev...HEAD -- 'supabase/migrations/*.sql' | grep -E 'CREATE POLICY' | grep -v 'TO (authenticated|anon)' && echo "⚠️  Policy missing TO clause for role specification"
```

#### ✅ Check Indexes

```bash
# Check if indexes exist for RLS policy columns
git diff origin/dev...HEAD -- 'supabase/migrations/*.sql' | grep -E 'CREATE POLICY.*USING.*auth\.uid\(\)' \
	&& echo "⚠️  Ensure indexes exist on user_id columns used in RLS policies"

# Check for foreign key indexes
git diff origin/dev...HEAD -- 'supabase/migrations/*.sql' | grep -E 'FOREIGN KEY' | while read line; do
	column=$(echo "$line" | grep -oP 'FOREIGN KEY\s*\(\K[^)]+')
	if ! git diff origin/dev...HEAD -- 'supabase/migrations/*.sql' | grep -q "CREATE INDEX.*$column"; then
		echo "⚠️  Consider adding index for foreign key column: $column"
	fi
done
```

#### ✅ Check Documentation

```bash
# Check for COMMENT ON statements
git diff origin/dev...HEAD -- 'supabase/migrations/*.sql' | grep -E 'CREATE TABLE' | while read line; do
	table=$(echo "$line" | grep -oP 'CREATE TABLE[^(]*\K[^(]+')
	if ! git diff origin/dev...HEAD -- 'supabase/migrations/*.sql' | grep -q "COMMENT ON TABLE.*$table"; then
		echo "⚠️  Missing COMMENT ON TABLE for: $table"
	fi
done

# Check for function comments
git diff origin/dev...HEAD -- 'supabase/migrations/*.sql' | grep -E 'CREATE.*FUNCTION' | while read line; do
	if ! git diff origin/dev...HEAD -- 'supabase/migrations/*.sql' | grep -q "COMMENT ON FUNCTION"; then
		echo "⚠️  Missing COMMENT ON FUNCTION for created functions"
	fi
done
```

### 3. Review API Routes

For each API route file (`src/app/api/**/*.ts` or `src/pages/api/**/*.ts`):

#### ✅ Check Authentication

```bash
# Check for proper handler usage (public vs authenticated)
git diff origin/dev...HEAD -- 'src/app/api/**/*.ts' 'src/pages/api/**/*.ts' | grep -E 'export (const|async function) (GET|POST|PUT|DELETE|PATCH)' | while read line; do
	file=$(echo "$line" | grep -oP '^diff --git.*\K[^\s]+' || echo "$line" | awk '{print $3}')
	if [ -n "$file" ] && [ -f "$file" ]; then
		# Check if using handler helpers
		if git diff origin/dev...HEAD -- "$file" | grep -qE '(createGetApiHandler|createPostApiHandler|createPutApiHandler|createDeleteApiHandler)'; then
			# Public handler - should NOT have requireAuth
			if git diff origin/dev...HEAD -- "$file" | grep -q "requireAuth"; then
				echo "⚠️  Public handler should not use requireAuth in: $file"
			fi
			echo "✅ Using public handler helper in: $file"
		elif git diff origin/dev...HEAD -- "$file" | grep -qE '(createGetApiHandlerWithAuth|createPostApiHandlerWithAuth|createPutApiHandlerWithAuth|createDeleteApiHandlerWithAuth)'; then
			# Authenticated handler - should have requireAuth (handled by helper)
			echo "✅ Using authenticated handler helper in: $file"
		elif git diff origin/dev...HEAD -- "$file" | grep -qE 'export async function (GET|POST|PUT|DELETE|PATCH)'; then
			# Manual handler - must check for requireAuth
			if ! git diff origin/dev...HEAD -- "$file" | grep -q "requireAuth"; then
				echo "❌ Missing requireAuth in manual handler: $file"
			else
				echo "✅ Has requireAuth in: $file"
			fi
		fi
	fi
done
```

#### ✅ Check Input Validation

```bash
# Check for parseBody usage
git diff origin/dev...HEAD -- 'src/app/api/**/*.ts' 'src/pages/api/**/*.ts' | grep -E 'export async function POST' | while read line; do
	file=$(echo "$line" | grep -oP '^diff --git.*\K[^\s]+')
	if ! git diff origin/dev...HEAD -- "$file" | grep -q "parseBody"; then
		echo "❌ Missing parseBody validation in: $file"
	fi
done

# Check for Zod schemas
git diff origin/dev...HEAD -- 'src/app/api/**/*.ts' 'src/pages/api/**/*.ts' | grep -E 'export async function (POST|PUT|PATCH)' | while read line; do
	file=$(echo "$line" | grep -oP '^diff --git.*\K[^\s]+')
	if ! git diff origin/dev...HEAD -- "$file" | grep -q "Schema.*=.*z\."; then
		echo "⚠️  Consider adding Zod schema for input validation in: $file"
	fi
done
```

#### ✅ Check Error Handling

```bash
# Check for apiError/apiWarn usage
git diff origin/dev...HEAD -- 'src/app/api/**/*.ts' 'src/pages/api/**/*.ts' | grep -E 'export async function' | while read line; do
	file=$(echo "$line" | grep -oP '^diff --git.*\K[^\s]+')
	if ! git diff origin/dev...HEAD -- "$file" | grep -qE '(apiError|apiWarn|apiSuccess)'; then
		echo "⚠️  Missing proper error handling helpers in: $file"
	fi
done

# Check for try/catch blocks
git diff origin/dev...HEAD -- 'src/app/api/**/*.ts' 'src/pages/api/**/*.ts' | grep -E 'export async function' | while read line; do
	file=$(echo "$line" | grep -oP '^diff --git.*\K[^\s]+')
	if ! git diff origin/dev...HEAD -- "$file" | grep -q "try {"; then
		echo "⚠️  Missing try/catch block in: $file"
	fi
done
```

#### ✅ Check for Console.log Statements

```bash
# Check for console.log statements in frontend code only (allowed in API routes)
git diff origin/dev...HEAD -- 'src/**/*.{ts,tsx}' | grep -E '^\+.*console\.log' | grep -v 'src/app/api/' | grep -v 'src/pages/api/' && echo "❌ Found console.log statements in frontend code - remove from production code"
```

### 4. Review TypeScript Standards

#### ✅ Check for Default Exports

```bash
# Check for default exports (should be named exports only)
git diff origin/dev...HEAD -- 'src/**/*.{ts,tsx}' | grep -E '^\+export default' && echo "❌ Found default exports - use named exports only"
```

#### ✅ Check for `any` Types

```bash
# Check for 'any' types
git diff origin/dev...HEAD -- 'src/**/*.{ts,tsx}' | grep -E ':\s*any\b' && echo "❌ Found 'any' types - use proper types"
```

#### ✅ Check for TypeScript Ignores

```bash
# Check for @ts-ignore or @ts-expect-error
git diff origin/dev...HEAD -- 'src/**/*.{ts,tsx}' | grep -E '@ts-(ignore|expect-error)' && echo "❌ Found @ts-ignore/@ts-expect-error - fix types properly"
```

### 5. Review React/React Query Patterns

#### ✅ Check Hook File Naming

```bash
# Check hook file naming (should be kebab-case)
git diff --name-only origin/dev...HEAD | grep -E 'src/(hooks|async)/.*\.ts$' | while read file; do
	filename=$(basename "$file")
	if [[ "$filename" =~ [A-Z] ]]; then
		echo "⚠️  Hook file should be kebab-case: $file"
	fi
done
```

#### ✅ Check Hook Exports

```bash
# Check for default exports in hooks
git diff origin/dev...HEAD -- 'src/hooks/**/*.ts' 'src/async/**/*.ts' | grep -E '^\+export default' && echo "❌ Found default exports in hooks - use named exports"
```

#### ✅ Check Optimistic Mutations

```bash
# Check for optimistic mutation patterns
git diff origin/dev...HEAD -- 'src/async/mutationHooks/**/*.ts' | grep -E 'useMutation' | while read line; do
	file=$(echo "$line" | grep -oP '^diff --git.*\K[^\s]+')
	if git diff origin/dev...HEAD -- "$file" | grep -q "onMutate"; then
		if ! git diff origin/dev...HEAD -- "$file" | grep -qE '(cancelQueries|previousData|onError.*previousData)'; then
			echo "⚠️  Optimistic mutation may be missing rollback logic in: $file"
		fi
	fi
done
```

### 6. Review Code Quality

#### ✅ Check File Sizes

```bash
# Check for files over 250 lines
git diff --name-only origin/dev...HEAD | grep -E '\.(ts|tsx)$' | while read file; do
	if [ -f "$file" ]; then
		lines=$(wc -l < "$file")
		if [ "$lines" -gt 250 ]; then
			echo "⚠️  File exceeds 250 lines: $file ($lines lines)"
		fi
	fi
done
```

#### ✅ Check for Classes

```bash
# Check for class definitions (should be functional only)
git diff origin/dev...HEAD -- 'src/**/*.{ts,tsx}' | grep -E '^\+.*class\s+\w+' && echo "❌ Found class definitions - use functional programming only"
```

#### ✅ Check for Code Duplication

```bash
# Check for potential duplicate hooks/functions
# This is a manual check - review new hooks/functions against existing ones
echo "🔍 Checking for potential code duplication..."
echo ""
echo "New hooks created:"
git diff --name-only origin/dev...HEAD | grep -E 'src/(hooks|async)/.*\.ts$' | while read file; do
	hook_name=$(basename "$file" .ts)
	echo "  - $hook_name"
	echo "    Check if similar functionality exists:"
	echo "    rg '$hook_name|${hook_name//-/_}' src/hooks/ src/async/ | head -5"
done

echo ""
echo "New components created:"
git diff --name-only origin/dev...HEAD | grep -E 'src/components/.*\.tsx$' | while read file; do
	component_name=$(basename "$file" .tsx)
	echo "  - $component_name"
	echo "    Check if similar component exists:"
	echo "    rg '$component_name' src/components/ | head -5"
done

echo ""
echo "New utilities created:"
git diff --name-only origin/dev...HEAD | grep -E 'src/utils/.*\.ts$' | while read file; do
	util_name=$(basename "$file" .ts)
	echo "  - $util_name"
	echo "    Check if similar utility exists:"
	echo "    rg '$util_name' src/utils/ | head -5"
done
```

### 7. Run Linting Checks

```bash
# Get list of changed TypeScript/TSX files
changed_files=$(git diff --name-only origin/dev...HEAD | grep -E '\.(ts|tsx)$' | tr '\n' ' ')

if [ -n "$changed_files" ]; then
	echo "Running ESLint fixes..."
	pnpm fix:eslint $changed_files

	echo "Running TypeScript type checks..."
	pnpm lint:types

	echo "Running Prettier..."
	pnpm fix:prettier

	echo "Checking for unused code..."
	pnpm lint:knip
else
	echo "No TypeScript files changed"
fi
```

---

## Comprehensive Review Script

Save this as a script and run it:

```bash
#!/bin/bash
# review-pr-standards.sh
# Comprehensive review of current branch against dev branch

set -e

echo "🔍 PR Standards Review"
echo "======================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
	echo -e "${RED}❌ Not in a git repository${NC}"
	exit 1
fi

# Fetch latest dev
echo "📥 Fetching latest dev branch..."
git fetch origin dev 2> /dev/null || echo "⚠️  Could not fetch origin/dev"

# Check if dev branch exists
if ! git rev-parse --verify origin/dev > /dev/null 2>&1; then
	echo -e "${RED}❌ origin/dev branch not found${NC}"
	exit 1
fi

# Get current branch
current_branch=$(git rev-parse --abbrev-ref HEAD)
echo "📍 Current branch: $current_branch"
echo "📊 Comparing against: origin/dev"
echo ""

# Get changed files
changed_files=$(git diff --name-only origin/dev...HEAD)
if [ -z "$changed_files" ]; then
	echo -e "${GREEN}✅ No changes detected${NC}"
	exit 0
fi

echo "📝 Changed files:"
echo "$changed_files" | nl
echo ""

# Track issues
issues=0
warnings=0

# 1. Check Migration Files
echo "🗄️  Checking Database Migrations..."
migration_files=$(echo "$changed_files" | grep 'supabase/migrations/.*\.sql$' || true)
if [ -n "$migration_files" ]; then
	echo "$migration_files" | while read file; do
		filename=$(basename "$file")

		# Check naming convention
		if [[ ! "$filename" =~ ^[0-9]{14}_[a-z0-9_]+\.sql$ ]]; then
			echo -e "${RED}❌ Invalid migration filename: $filename${NC}"
			echo "   Should match: YYYYMMDDHHmmss_description.sql"
			((issues++))
		else
			echo -e "${GREEN}✅ Valid migration filename: $filename${NC}"
		fi

		# Check for BEGIN/COMMIT
		if ! git diff origin/dev...HEAD -- "$file" | grep -qE '^\+BEGIN'; then
			echo -e "${RED}❌ Missing BEGIN transaction in: $file${NC}"
			((issues++))
		fi
		if ! git diff origin/dev...HEAD -- "$file" | grep -qE '^\+COMMIT'; then
			echo -e "${RED}❌ Missing COMMIT transaction in: $file${NC}"
			((issues++))
		fi

		# Check for header comments
		if ! git diff origin/dev...HEAD -- "$file" | grep -qE '^\+-- ============================================================================'; then
			echo -e "${YELLOW}⚠️  Missing migration header comments in: $file${NC}"
			((warnings++))
		fi

		# Check for RLS
		if git diff origin/dev...HEAD -- "$file" | grep -qE '^\+CREATE TABLE'; then
			if ! git diff origin/dev...HEAD -- "$file" | grep -qE 'ENABLE ROW LEVEL SECURITY'; then
				echo -e "${RED}❌ Missing RLS enablement for new table in: $file${NC}"
				((issues++))
			fi
		fi

		# Check for COMMENT ON
		if git diff origin/dev...HEAD -- "$file" | grep -qE '^\+CREATE TABLE'; then
			if ! git diff origin/dev...HEAD -- "$file" | grep -qE 'COMMENT ON TABLE'; then
				echo -e "${YELLOW}⚠️  Missing COMMENT ON TABLE in: $file${NC}"
				((warnings++))
			fi
		fi
	done
else
	echo -e "${GREEN}✅ No migration files changed${NC}"
fi
echo ""

# 2. Check API Routes
echo "🌐 Checking API Routes..."
api_files=$(echo "$changed_files" | grep -E '(src/app/api|src/pages/api)/.*\.ts$' || true)
if [ -n "$api_files" ]; then
	echo "$api_files" | while read file; do
		# Check if using handler helpers (preferred pattern)
		if git diff origin/dev...HEAD -- "$file" | grep -qE '(createGetApiHandler|createPostApiHandler|createPutApiHandler|createDeleteApiHandler|createGetApiHandlerWithAuth|createPostApiHandlerWithAuth)'; then
			# Using handler helper - check if correct type
			if git diff origin/dev...HEAD -- "$file" | grep -qE '(createGetApiHandler|createPostApiHandler)' && git diff origin/dev...HEAD -- "$file" | grep -q "requireAuth"; then
				echo -e "${YELLOW}⚠️  Public handler should not use requireAuth in: $file${NC}"
				((warnings++))
			fi
			if git diff origin/dev...HEAD -- "$file" | grep -qE '(createGetApiHandlerWithAuth|createPostApiHandlerWithAuth)'; then
				echo -e "${GREEN}✅ Using authenticated handler helper in: $file${NC}"
			else
				echo -e "${GREEN}✅ Using public handler helper in: $file${NC}"
			fi
		# Check manual handlers
		elif git diff origin/dev...HEAD -- "$file" | grep -qE 'export async function (GET|POST|PUT|DELETE|PATCH)'; then
			# Manual handler - must have requireAuth
			if ! git diff origin/dev...HEAD -- "$file" | grep -q "requireAuth"; then
				echo -e "${RED}❌ Missing requireAuth in manual handler: $file${NC}"
				echo "   Consider using createGetApiHandlerWithAuth or createPostApiHandlerWithAuth instead"
				((issues++))
			else
				echo -e "${GREEN}✅ Has requireAuth in: $file${NC}"
			fi
		fi

		# Check for parseBody/parseQuery (POST/PUT/PATCH for body, GET for query)
		if git diff origin/dev...HEAD -- "$file" | grep -qE 'export (const GET|async function GET)'; then
			if ! git diff origin/dev...HEAD -- "$file" | grep -qE '(parseQuery|createGetApiHandler)'; then
				echo -e "${YELLOW}⚠️  GET handler should use parseQuery or createGetApiHandler in: $file${NC}"
				((warnings++))
			fi
		fi
		if git diff origin/dev...HEAD -- "$file" | grep -qE 'export (const POST|async function POST|const PUT|async function PUT|const PATCH|async function PATCH)'; then
			if ! git diff origin/dev...HEAD -- "$file" | grep -qE '(parseBody|createPostApiHandler|createPutApiHandler|createPatchApiHandler)'; then
				echo -e "${RED}❌ Missing parseBody validation in: $file${NC}"
				((issues++))
			fi
		fi

		# Check for try/catch (only for manual handlers, helpers handle it)
		if git diff origin/dev...HEAD -- "$file" | grep -qE 'export async function' && ! git diff origin/dev...HEAD -- "$file" | grep -qE '(createGetApiHandler|createPostApiHandler|createPutApiHandler|createDeleteApiHandler|createGetApiHandlerWithAuth|createPostApiHandlerWithAuth)'; then
			if ! git diff origin/dev...HEAD -- "$file" | grep -q "try {"; then
				echo -e "${YELLOW}⚠️  Missing try/catch block in manual handler: $file${NC}"
				((warnings++))
			fi
		fi
	done
else
	echo -e "${GREEN}✅ No API route files changed${NC}"
fi
echo ""

# 3. Check TypeScript Standards
echo "📘 Checking TypeScript Standards..."
ts_files=$(echo "$changed_files" | grep -E '\.(ts|tsx)$' || true)
if [ -n "$ts_files" ]; then
	# Check for default exports
	if git diff origin/dev...HEAD -- $ts_files | grep -qE '^\+export default'; then
		echo -e "${RED}❌ Found default exports - use named exports only${NC}"
		git diff origin/dev...HEAD -- $ts_files | grep -E '^\+export default'
		((issues++))
	fi

	# Check for 'any' types
	if git diff origin/dev...HEAD -- $ts_files | grep -qE ':\s*any\b'; then
		echo -e "${RED}❌ Found 'any' types${NC}"
		git diff origin/dev...HEAD -- $ts_files | grep -E ':\s*any\b' | head -5
		((issues++))
	fi

	# Check for @ts-ignore
	if git diff origin/dev...HEAD -- $ts_files | grep -qE '@ts-(ignore|expect-error)'; then
		echo -e "${RED}❌ Found @ts-ignore/@ts-expect-error${NC}"
		git diff origin/dev...HEAD -- $ts_files | grep -E '@ts-(ignore|expect-error)'
		((issues++))
	fi

	# Check for console.log statements in frontend code only
	if git diff origin/dev...HEAD -- $ts_files | grep -E '^\+.*console\.log' | grep -v 'src/app/api/' | grep -v 'src/pages/api/'; then
		echo -e "${RED}❌ Found console.log statements in frontend code - remove from production code${NC}"
		git diff origin/dev...HEAD -- $ts_files | grep -E '^\+.*console\.log' | grep -v 'src/app/api/' | grep -v 'src/pages/api/' | head -5
		((issues++))
	fi

	# Check for classes
	if git diff origin/dev...HEAD -- $ts_files | grep -qE '^\+.*class\s+\w+'; then
		echo -e "${RED}❌ Found class definitions - use functional programming only${NC}"
		((issues++))
	fi
else
	echo -e "${GREEN}✅ No TypeScript files changed${NC}"
fi
echo ""

# 4. Check File Sizes
echo "📏 Checking File Sizes..."
echo "$changed_files" | grep -E '\.(ts|tsx)$' | while read file; do
	if [ -f "$file" ]; then
		lines=$(wc -l < "$file" 2> /dev/null || echo "0")
		if [ "$lines" -gt 250 ]; then
			echo -e "${YELLOW}⚠️  File exceeds 250 lines: $file ($lines lines)${NC}"
			((warnings++))
		fi
	fi
done
echo ""

# 5. Check for Code Duplication
echo "🔄 Checking for Code Reuse Opportunities..."
new_hooks=$(echo "$changed_files" | grep -E 'src/(hooks|async)/.*\.ts$' || true)
new_components=$(echo "$changed_files" | grep -E 'src/components/.*\.tsx$' || true)
new_utils=$(echo "$changed_files" | grep -E 'src/utils/.*\.ts$' || true)

if [ -n "$new_hooks" ] || [ -n "$new_components" ] || [ -n "$new_utils" ]; then
	echo -e "${YELLOW}⚠️  New code created - please verify no duplicates exist:${NC}"
	if [ -n "$new_hooks" ]; then
		echo "  New hooks:"
		echo "$new_hooks" | while read file; do
			hook_name=$(basename "$file" .ts)
			echo "    - $hook_name"
		done
	fi
	if [ -n "$new_components" ]; then
		echo "  New components:"
		echo "$new_components" | while read file; do
			component_name=$(basename "$file" .tsx)
			echo "    - $component_name"
		done
	fi
	if [ -n "$new_utils" ]; then
		echo "  New utilities:"
		echo "$new_utils" | while read file; do
			util_name=$(basename "$file" .ts)
			echo "    - $util_name"
		done
	fi
	echo ""
	echo "  💡 Tip: Search for similar functionality before creating new code:"
	echo "    rg '<function-name>' src/hooks/ src/async/ src/components/ src/utils/"
	((warnings++))
else
	echo -e "${GREEN}✅ No new hooks/components/utils created${NC}"
fi
echo ""

# Summary
echo "📊 Review Summary"
echo "================="
if [ $issues -eq 0 ] && [ $warnings -eq 0 ]; then
	echo -e "${GREEN}✅ No issues found!${NC}"
elif [ $issues -eq 0 ]; then
	echo -e "${GREEN}✅ No critical issues${NC}"
	echo -e "${YELLOW}⚠️  $warnings warning(s)${NC}"
else
	echo -e "${RED}❌ $issues critical issue(s) found${NC}"
	echo -e "${YELLOW}⚠️  $warnings warning(s)${NC}"
	echo ""
	echo "Please review the issues above and fix them before submitting your PR."
	echo "Refer to docs/pr_standards_checklist.md for detailed guidelines."
	exit 1
fi

echo ""
echo "✅ Review complete!"
echo ""
echo "Next steps:"
echo "1. Run: pnpm fix:eslint <changed-files>"
echo "2. Run: pnpm lint:types"
echo "3. Run: pnpm fix:prettier"
echo "4. Review docs/pr_standards_checklist.md for any missed items"
```

---

## Manual Review Checklist

Use this checklist to manually review your changes:

### Database Migrations

- [ ] Migration file named correctly (`YYYYMMDDHHmmss_description.sql`)
- [ ] Comprehensive header comment with purpose
- [ ] Wrapped in `BEGIN;` / `COMMIT;` transaction
- [ ] Pre-flight validation (DO blocks)
- [ ] Post-migration verification (DO blocks)
- [ ] RLS policies (one per operation, one per role)
- [ ] Indexes for RLS policy columns
- [ ] Indexes for foreign keys
- [ ] `COMMENT ON` statements for tables/columns/functions
- [ ] Security functions use `SECURITY DEFINER` properly

### API Routes

- [ ] **Handler pattern**:
  - [ ] Uses handler helpers (`createGetApiHandler`, `createPostApiHandler`, etc.) when possible
  - [ ] Uses `createGetApiHandlerWithAuth`/`createPostApiHandlerWithAuth` for authenticated endpoints
  - [ ] Uses `createGetApiHandler`/`createPostApiHandler` for public endpoints (no auth)
  - [ ] If manual handler, uses `requireAuth` for authenticated endpoints
- [ ] Uses `parseBody` with Zod schema (POST/PUT/PATCH) or `parseQuery` (GET)
- [ ] Uses `apiSuccess` with Zod schema for output
- [ ] Uses `apiWarn` for user errors (4xx)
- [ ] Uses `apiError` for system errors (5xx)
- [ ] Error handling in try/catch (if manual handler, helpers handle it automatically)
- [ ] Route constant defined (`const ROUTE = "..."`)
- [ ] Public endpoints properly marked (no requireAuth if using public handler)
- [ ] **No console.log statements in frontend code** (allowed in API routes for backend logging)

### TypeScript

- [ ] No `any` types
- [ ] No `@ts-ignore` directives
- [ ] Named exports only (no default exports)
- [ ] Types exported only if used elsewhere
- [ ] Strict mode passes

### React/React Query

- [ ] Hook files named in kebab-case
- [ ] Named exports (not default)
- [ ] Optimistic mutations include rollback
- [ ] Query invalidation includes related queries

### Code Quality

- [ ] File size ≤ 250 lines
- [ ] Functional programming only (no classes)
- [ ] ESLint passes
- [ ] Prettier formatting applied
- [ ] TypeScript strict mode passes
- [ ] No unused code
- [ ] **Code reuse verified**:
  - [ ] Searched for existing hooks before creating new (`rg` or `grep` in `src/hooks/`, `src/async/`)
  - [ ] Searched for existing components before creating new (`rg` or `grep` in `src/components/`)
  - [ ] Searched for existing utilities before creating new (`rg` or `grep` in `src/utils/`)
  - [ ] Used existing patterns rather than creating duplicates

---

## Reference

- **PR Standards Checklist**: `docs/pr_standards_checklist.md`
- **Migration Guidelines**: `.cursor/rules/supabase-create-migration.mdc`
- **RLS Guidelines**: `.cursor/rules/supabase-create-rls-policies.mdc`
- **Code Style**: `CLAUDE.md`

---

## Quick Commands

```bash
# Get diff summary
git diff --stat origin/dev...HEAD

# Get only added lines
git diff origin/dev...HEAD | grep '^+'

# Get only removed lines
git diff origin/dev...HEAD | grep '^-'

# Review specific file
git diff origin/dev...HEAD -- path/to/file.ts

# Check if branch is up to date with dev
git log origin/dev..HEAD --oneline

# See what commits are in your branch but not in dev
git log origin/dev..HEAD

# See what commits are in dev but not in your branch
git log HEAD..origin/dev

# Search for existing code before creating new
# Search for hooks
rg "useFetch.*Categories" src/hooks/ src/async/

# Search for components
rg "Category.*Select|Category.*Dropdown" src/components/

# Search for utilities
rg "formatDate|format.*date" src/utils/

# Search for functions by name pattern
rg "function.*category" src/
```
