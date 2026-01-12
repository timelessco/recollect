# PR Standards Checklist

This document outlines the standards expected for all pull requests in the Recollect codebase. Review this checklist before submitting any PR to ensure your code meets the project's quality standards.

> **Reference PRs**:
>
> - ✅ **PR 694**: Excellent example of migration standards (`feat(bookmark-categories): ✨ implement many-to-many bookmark categories relationship`)
> - ⚠️ **PR 690**: Review comments highlight common mistakes to avoid (`feat(bookmark): implement discoverable feature for bookmarks`)

---

## Table of Contents

1. [Database Migrations](#database-migrations)
2. [API Routes](#api-routes)
3. [TypeScript Standards](#typescript-standards)
4. [React & React Query Patterns](#react--react-query-patterns)
5. [Code Quality Requirements](#code-quality-requirements)
6. [Common Mistakes & Anti-Patterns](#common-mistakes--anti-patterns)
7. [Pre-PR Checklist](#pre-pr-checklist)

---

## Database Migrations

### File Naming Convention

**✅ CORRECT:**

```text
20251208115323_bookmark_categories_many_to_many.sql
```

**❌ WRONG:**

```text
migration.sql
bookmark_categories.sql
2025-12-08_bookmark_categories.sql
```

**Rule**: Use format `YYYYMMDDHHmmss_short_description.sql` (UTC timestamp, lowercase with underscores)

### Migration Structure

Every migration MUST follow this structure:

```sql
-- ============================================================================
-- MIGRATION: [Clear description of what this migration does]
-- Created: YYYY-MM-DD
-- Purpose: [Detailed explanation of the purpose and affected tables]
-- ============================================================================
--
-- This migration:
--   1. [Step 1 description]
--   2. [Step 2 description]
--   3. [Step 3 description]
--
-- [Any special considerations, security notes, or performance implications]
--
-- ============================================================================

BEGIN;
SET search_path = public, pg_temp;

-- ============================================================================
-- PART 1: [Section name]
-- ============================================================================

-- [Implementation with detailed comments]

-- ============================================================================
-- PART 2: [Next section]
-- ============================================================================

-- [More implementation]

COMMIT;
```

### Required Elements

#### 1. Transaction Blocks

**✅ ALWAYS use BEGIN/COMMIT:**

```sql
BEGIN;
-- All migration SQL here
COMMIT;
```

**❌ NEVER skip transactions:**

```sql
-- Missing BEGIN/COMMIT - WRONG!
ALTER TABLE everything ADD COLUMN make_discoverable timestamptz;
```

**Why**: Ensures atomicity - if any part fails, entire migration rolls back.

#### 2. Pre-Flight Validation

**✅ CORRECT - Validate prerequisites:**

```sql
-- Pre-flight validation: Ensure category_id=0 exists for uncategorized bookmarks
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.categories WHERE id = 0) THEN
        RAISE EXCEPTION 'Migration blocked: category with id=0 does not exist. Run seed migration first.';
    END IF;
END $$;
```

**Why**: Prevents migrations from running in invalid states, catching issues early.

#### 3. Post-Migration Verification

**✅ CORRECT - Verify migration success:**

```sql
-- Post-migration verification for Part 1
DO $$
DECLARE
    v_everything_count bigint;
    v_junction_bookmark_count bigint;
BEGIN
    SELECT COUNT(*) INTO v_everything_count FROM public.everything;
    SELECT COUNT(DISTINCT bookmark_id) INTO v_junction_bookmark_count FROM public.bookmark_categories;

    IF v_everything_count != v_junction_bookmark_count THEN
        RAISE EXCEPTION 'Data mismatch: % bookmarks but only % have junction entries. Rolling back.',
            v_everything_count, v_junction_bookmark_count;
    END IF;

    RAISE NOTICE 'Junction table migration verified: all % bookmarks have junction entries', v_everything_count;
END $$;
```

**Why**: Ensures data integrity after migration completes.

#### 4. RLS Policies

**✅ CORRECT - Granular policies per role and operation:**

```sql
-- SELECT: Authenticated users can view bookmark_categories if:
-- 1. They own the entry (user_id = auth.uid())
-- 2. They are a collaborator in the category (via shared_categories)
-- 3. They own the category (category owner sees all)
CREATE POLICY "bookmark_categories_select_authenticated"
ON public.bookmark_categories FOR SELECT TO authenticated
USING (
    user_id = (SELECT auth.uid())
    OR
    category_id IN (
        SELECT category_id
        FROM public.shared_categories
        WHERE email = (SELECT auth.jwt()->>'email')
    )
    OR
    category_id IN (
        SELECT id
        FROM public.categories
        WHERE user_id = (SELECT auth.uid())
    )
);

-- SELECT: Anonymous users can view bookmark_categories for public categories
CREATE POLICY "bookmark_categories_select_public"
ON public.bookmark_categories FOR SELECT TO anon
USING (
    category_id IN (
        SELECT id
        FROM public.categories
        WHERE is_public = true
    )
);

-- INSERT: Users can only insert bookmark_categories for bookmarks they own
CREATE POLICY "bookmark_categories_insert"
ON public.bookmark_categories FOR INSERT TO authenticated
WITH CHECK (
    user_id = (SELECT auth.uid())
    AND
    public.user_owns_bookmark(bookmark_id, (SELECT auth.uid()))
);
```

**❌ WRONG - Combined policies:**

```sql
-- WRONG: Don't combine operations or roles
CREATE POLICY "all_access" ON public.bookmark_categories
FOR ALL TO authenticated, anon
USING (true);
```

**Rules**:

- One policy per operation (SELECT, INSERT, UPDATE, DELETE)
- One policy per role (authenticated, anon)
- Always use `(SELECT auth.uid())` pattern for performance
- Include detailed comments explaining access logic

#### 5. Security Functions

**✅ CORRECT - Use SECURITY DEFINER to prevent RLS recursion:**

```sql
-- Helper function to check bookmark ownership (bypasses RLS to prevent recursion)
-- SECURITY: Function only checks ownership for the calling user (p_user_id must equal auth.uid())
-- This prevents enumeration attacks where users could check arbitrary user_id values
CREATE OR REPLACE FUNCTION public.user_owns_bookmark(p_bookmark_id bigint, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
    -- SECURITY: Only allow checking ownership for the calling user
    -- This prevents enumeration attacks (cannot check other users' bookmark ownership)
    IF p_user_id IS DISTINCT FROM auth.uid() THEN
        RETURN false;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.everything
        WHERE id = p_bookmark_id AND user_id = p_user_id
    );
END;
$$;

COMMENT ON FUNCTION public.user_owns_bookmark(bigint, uuid) IS
'Helper function to check if a user owns a bookmark. Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion in bookmark_categories policies. Function enforces that p_user_id must equal auth.uid() to prevent enumeration attacks.';
```

**Why**: Prevents RLS recursion when policies need to check other tables, while maintaining security.

#### 6. Performance Indexes

**✅ CORRECT - Index columns used in RLS policies:**

```sql
-- Create indexes for query performance
CREATE INDEX IF NOT EXISTS idx_bookmark_categories_bookmark_id ON public.bookmark_categories(bookmark_id);
CREATE INDEX IF NOT EXISTS idx_bookmark_categories_category_id ON public.bookmark_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_bookmark_categories_user_id ON public.bookmark_categories(user_id);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_bookmark_categories_user_category ON public.bookmark_categories(user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_bookmark_categories_bookmark_user ON public.bookmark_categories(bookmark_id, user_id);

-- Indexes for columns referenced in RLS policies (performance optimization)
CREATE INDEX IF NOT EXISTS idx_categories_is_public ON public.categories(is_public);
CREATE INDEX IF NOT EXISTS idx_shared_categories_edit_access ON public.shared_categories(edit_access);
```

**Why**: RLS policies are evaluated for every row - indexes dramatically improve performance.

#### 7. Documentation Comments

**✅ CORRECT - Document everything:**

```sql
COMMENT ON TABLE public.bookmark_categories IS
'Junction table for many-to-many relationship between bookmarks (everything) and categories. Allows bookmarks to belong to multiple categories. category_id = 0 represents uncategorized bookmarks.';

COMMENT ON COLUMN public.bookmark_categories.bookmark_id IS 'Foreign key to everything.id (bookmark)';
COMMENT ON COLUMN public.bookmark_categories.category_id IS 'Foreign key to categories.id. 0 = uncategorized';
COMMENT ON COLUMN public.bookmark_categories.user_id IS 'Owner of this bookmark-category association';

COMMENT ON FUNCTION public.set_bookmark_categories IS
'Atomically replaces all category associations for a bookmark. Uses FOR UPDATE locking to prevent race conditions. Deletes existing entries and inserts new ones in a single transaction.';

COMMENT ON POLICY "bookmark_categories_select_authenticated" ON public.bookmark_categories IS
'Allows authenticated users to view bookmark categories they own, collaborate on, or own the parent category.';
```

**Why**: Makes schema self-documenting and helps future developers understand intent.

#### 8. Data Migration Patterns

**✅ CORRECT - Migrate existing data carefully:**

```sql
-- Step 1: Migrate bookmarks with real categories (NOT 0)
INSERT INTO public.bookmark_categories (bookmark_id, category_id, user_id, created_at)
SELECT e.id, e.category_id, e.user_id, e.inserted_at
FROM public.everything e
WHERE e.category_id IS NOT NULL AND e.category_id != 0
ON CONFLICT (bookmark_id, category_id) DO NOTHING;

-- Step 2: Add category 0 ONLY for bookmarks that have NO entry yet (truly uncategorized)
INSERT INTO public.bookmark_categories (bookmark_id, category_id, user_id, created_at)
SELECT e.id, 0, e.user_id, e.inserted_at
FROM public.everything e
WHERE NOT EXISTS (
    SELECT 1 FROM public.bookmark_categories bc WHERE bc.bookmark_id = e.id
)
ON CONFLICT (bookmark_id, category_id) DO NOTHING;
```

**Why**: Handles edge cases, prevents duplicates, and maintains data integrity.

---

## API Routes

### Route Structure

**✅ CORRECT - Use handler helpers (preferred pattern):**

```typescript
import { z } from "zod";
import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { HttpStatus } from "@/utils/error-utils/common";

const ROUTE = "set-bookmark-categories";

const SetBookmarkCategoriesPayloadSchema = z.object({
	bookmarkId: z.number().int().positive(),
	categoryIds: z.array(z.number().int().nonnegative()),
});

const SetBookmarkCategoriesResponseSchema = z.object({
	bookmarkId: z.number(),
	categoryIds: z.array(z.number()),
});

// Authenticated endpoint
export const POST = createPostApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: SetBookmarkCategoriesPayloadSchema,
	outputSchema: SetBookmarkCategoriesResponseSchema,
	handler: async ({ data, supabase, user, route }) => {
		const { bookmarkId, categoryIds } = data;
		const userId = user.id;

		// Implementation here
		const result = await setBookmarkCategories(
			supabase,
			userId,
			bookmarkId,
			categoryIds,
		);

		// Return data directly - handler wraps in apiSuccess automatically
		return result;
	},
});
```

**✅ CORRECT - Public endpoint (no auth):**

```typescript
import { z } from "zod";
import { createGetApiHandler } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { createApiClient } from "@/lib/supabase/api";
import { HttpStatus } from "@/utils/error-utils/common";

const ROUTE = "fetch-discoverable-by-id";

const FetchDiscoverableByIdQuerySchema = z.object({
	id: z.coerce.number().int().positive(),
});

const ResponseSchema = z.object({
	id: z.number(),
	title: z.string().nullable(),
	// ... other fields
});

// Public endpoint - no auth required
export const GET = createGetApiHandler({
	route: ROUTE,
	inputSchema: FetchDiscoverableByIdQuerySchema,
	outputSchema: ResponseSchema,
	handler: async ({ input, route }) => {
		const { id } = input;
		const { supabase } = await createApiClient(); // No auth needed

		const { data, error } = await supabase
			.from("everything")
			.select("*")
			.eq("id", id)
			.maybeSingle();

		if (error) {
			return apiError({
				route,
				message: "Failed to fetch bookmark",
				error,
				operation: "fetch_discoverable_bookmark",
			});
		}

		if (!data) {
			return apiWarn({
				route,
				message: "Bookmark not found",
				status: HttpStatus.NOT_FOUND,
				context: { id },
			});
		}

		return data; // Handler wraps in apiSuccess automatically
	},
});
```

**✅ CORRECT - Manual handler (only if handler helpers don't fit):**

```typescript
import { type NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, parseBody } from "@/lib/api-helpers/response";
import { requireAuth } from "@/lib/supabase/api";

const ROUTE = "set-bookmark-categories";

const SetBookmarkCategoriesPayloadSchema = z.object({
	bookmarkId: z.number().int().positive(),
	categoryIds: z.array(z.number().int().nonnegative()),
});

const SetBookmarkCategoriesResponseSchema = z.object({
	bookmarkId: z.number(),
	categoryIds: z.array(z.number()),
});

export async function POST(request: NextRequest) {
	try {
		const auth = await requireAuth(ROUTE);
		if (auth.errorResponse) {
			return auth.errorResponse;
		}

		const body = await parseBody({
			request,
			schema: SetBookmarkCategoriesPayloadSchema,
			route: ROUTE,
		});
		if (body.errorResponse) {
			return body.errorResponse;
		}

		const { supabase, user } = auth;
		const { bookmarkId, categoryIds } = body.data;

		// Implementation here
		const result = await setBookmarkCategories(
			supabase,
			user.id,
			bookmarkId,
			categoryIds,
		);

		return apiSuccess({
			route: ROUTE,
			data: result,
			schema: SetBookmarkCategoriesResponseSchema,
		});
	} catch (error) {
		return apiError({
			route: ROUTE,
			message: "Failed to set bookmark categories",
			error,
			operation: "set_bookmark_categories",
			userId: auth?.user?.id,
		});
	}
}
```

**When to use which pattern:**

- **Handler helpers** (`createGetApiHandler`, `createPostApiHandlerWithAuth`, etc.): Use for standard CRUD operations - handles validation, error handling, and response formatting automatically
- **Manual handlers**: Only use if you need custom logic that doesn't fit the handler helper pattern (e.g., streaming responses, custom middleware)

### Required Patterns

#### 1. Authentication & Handler Pattern

**✅ CORRECT - Use handler helpers (preferred):**

```typescript
// For authenticated endpoints - use WithAuth helpers
import {
	createGetApiHandlerWithAuth,
	createPostApiHandlerWithAuth,
} from "@/lib/api-helpers/create-handler";

export const GET = createGetApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: QuerySchema,
	outputSchema: ResponseSchema,
	handler: async ({ data, supabase, user, route }) => {
		// user and supabase are automatically available
		// No need to call requireAuth manually
	},
});

// For public endpoints - use public handlers
import {
	createGetApiHandler,
	createPostApiHandler,
} from "@/lib/api-helpers/create-handler";

export const GET = createGetApiHandler({
	route: ROUTE,
	inputSchema: QuerySchema,
	outputSchema: ResponseSchema,
	handler: async ({ input, route }) => {
		// No auth required - public endpoint
		const { supabase } = await createApiClient();
		// ...
	},
});
```

**✅ CORRECT - Manual handler (if handler helpers don't fit):**

```typescript
// For authenticated endpoints
const auth = await requireAuth(ROUTE);
if (auth.errorResponse) {
	return auth.errorResponse;
}
const { supabase, user } = auth;
```

**❌ WRONG - Public handler with requireAuth:**

```typescript
// WRONG: Using requireAuth in public handler
export const GET = createGetApiHandler({
	handler: async ({ input, route }) => {
		const auth = await requireAuth(ROUTE); // ❌ Don't do this!
		// ...
	},
});
```

**❌ WRONG - No auth check in manual authenticated handler:**

```typescript
// WRONG: No auth check
export async function POST(request: NextRequest) {
	const body = await request.json();
	// Direct database access without auth
}
```

**Rules**:

- **Prefer handler helpers**: Use `createGetApiHandler`, `createPostApiHandler`, `createGetApiHandlerWithAuth`, `createPostApiHandlerWithAuth`
- **Public endpoints**: Use `createGetApiHandler`/`createPostApiHandler` (no auth)
- **Authenticated endpoints**: Use `createGetApiHandlerWithAuth`/`createPostApiHandlerWithAuth` (auth handled automatically)
- **Manual handlers**: Only if handler helpers don't fit your use case - must include `requireAuth` for authenticated endpoints

#### 2. Input Validation

**✅ CORRECT - Handler helpers handle validation automatically:**

```typescript
// Handler helpers automatically validate input/output
export const GET = createGetApiHandler({
	inputSchema: QuerySchema, // Automatically validates query params
	outputSchema: ResponseSchema, // Automatically validates response
	handler: async ({ input, route }) => {
		// input is already validated
		const { id } = input;
	},
});
```

**✅ CORRECT - Manual validation:**

**✅ ALWAYS use `parseBody` (POST/PUT/PATCH) or `parseQuery` (GET) with Zod:**

```typescript
const body = await parseBody({
	request,
	schema: SetBookmarkCategoriesPayloadSchema,
	route: ROUTE,
});
if (body.errorResponse) {
	return body.errorResponse;
}
const { bookmarkId, categoryIds } = body.data;
```

**❌ NEVER trust user input:**

```typescript
// WRONG: No validation
const body = await request.json();
const bookmarkId = body.bookmarkId; // Could be anything!
```

#### 3. Error Handling

**✅ CORRECT - Use appropriate error helpers:**

```typescript
// For user errors (4xx) - use apiWarn
if (!bookmark) {
	return apiWarn({
		route: ROUTE,
		message: "Bookmark not found",
		status: HttpStatus.NOT_FOUND,
		context: { bookmarkId },
	});
}

// For system errors (5xx) - use apiError
try {
	// Database operation
} catch (error) {
	return apiError({
		route: ROUTE,
		message: "Failed to update bookmark",
		error,
		operation: "update_bookmark",
		userId: user.id,
	});
}
```

**Rules**:

- `apiWarn`: User errors (validation, not found, permission denied) - logs to console.warn, NO Sentry
- `apiError`: System errors (database failures, unexpected errors) - logs to console.error AND sends to Sentry

#### 4. Response Validation

**✅ ALWAYS validate output with Zod:**

```typescript
return apiSuccess({
	route: ROUTE,
	data: result,
	schema: SetBookmarkCategoriesResponseSchema,
});
```

**Why**: Ensures API contracts are maintained and catches bugs early.

#### 5. Route Documentation

**✅ CORRECT - Include comprehensive API docs:**

```typescript
/**
 * =============================================================================
 * API DOCUMENTATION: Set Bookmark Categories
 * =============================================================================
 *
 * ENDPOINT
 * --------
 * POST /api/set-bookmark-categories
 *
 * AUTHENTICATION
 * --------------
 * Requires Bearer token (Supabase JWT) in Authorization header
 *
 * REQUEST BODY SCHEMA
 * -------------------
 * {
 *   "bookmarkId": number (required),
 *   "categoryIds": number[] (required)
 * }
 *
 * SUCCESS RESPONSE (200 OK)
 * -------------------------
 * {
 *   "data": { "bookmarkId": 123, "categoryIds": [1, 2, 3] },
 *   "error": null
 * }
 *
 * ERROR RESPONSES
 * ---------------
 * 401 Unauthorized: { "data": null, "error": "Not authenticated" }
 * 400 Bad Request: { "data": null, "error": "Invalid input" }
 * 500 Internal Server Error: { "data": null, "error": "Failed to set bookmark categories" }
 *
 * =============================================================================
 */
```

---

## TypeScript Standards

### Export Rules

**✅ CORRECT - Named exports only:**

```typescript
export type SetBookmarkCategoriesPayload = z.infer<
	typeof SetBookmarkCategoriesPayloadSchema
>;
export type SetBookmarkCategoriesResponse = z.infer<
	typeof SetBookmarkCategoriesResponseSchema
>;
export async function POST(request: NextRequest) {
	/* ... */
}
```

**❌ WRONG - No default exports:**

```typescript
// WRONG
export default function POST(request: NextRequest) { /* ... */ }
export default type MyType = { /* ... */ };
```

### Type Deduction

**✅ CORRECT - Use type deduction from immediate parent:**

```typescript
// Child props = parent props, use type alias
type ChildProps = ParentProps;

// Use utility types
type HandlerParams = Parameters<typeof myFunction>;
type HandlerReturn = ReturnType<typeof myFunction>;
type UserEmail = Pick<User, "email">;
```

**❌ WRONG - Don't skip to grandparents:**

```typescript
// WRONG: Skipping parent
type ChildProps = GrandparentProps; // Should use ParentProps instead
```

### Type Safety

**✅ CORRECT - Strict types, no `any`:**

```typescript
const result: SetBookmarkCategoriesResponse = {
    bookmarkId: number,
    categoryIds: number[],
};
```

**❌ WRONG - Never use `any` or `@ts-ignore`:**

```typescript
// WRONG
const result: any = {
	/* ... */
};
// @ts-ignore
const unsafe = someFunction();
```

### Type Exports

**✅ CORRECT - Only export types used elsewhere:**

```typescript
// Check with grep first before exporting
export type SetBookmarkCategoriesPayload = z.infer<typeof Schema>; // Used in other files
type InternalHelperType = {
	/* ... */
}; // Not exported - only used locally
```

---

## React & React Query Patterns

### Hook Naming

**✅ CORRECT - kebab-case file names, camelCase exports:**

```text
use-bookmark-categories.ts
use-set-bookmark-categories.ts
```

```typescript
export function useSetBookmarkCategories() {
	/* ... */
}
```

**❌ WRONG:**

```text
useBookmarkCategories.ts  // Wrong file name
export default function useSetBookmarkCategories() { /* ... */ }  // Wrong export
```

### Optimistic Mutations

**✅ CORRECT - Follow the pattern:**

```typescript
export function useSetBookmarkCategoriesOptimisticMutation() {
	const queryClient = useQueryClient();
	const session = useSupabaseSession((state) => state.session);

	const mutation = useMutation({
		mutationFn: setBookmarkCategories,
		onMutate: async (data) => {
			// Cancel any outgoing refetches
			await queryClient.cancelQueries({
				queryKey: [BOOKMARKS_KEY, session?.user?.id],
			});

			// Snapshot the previous value
			const previousData = queryClient.getQueryData([
				BOOKMARKS_KEY,
				session?.user?.id,
			]);

			// Optimistically update to the new value
			queryClient.setQueryData(
				[BOOKMARKS_KEY, session?.user?.id],
				(old: BookmarksData | undefined) => {
					if (!old?.data) {
						return old;
					}
					return {
						...old,
						data: old.data.map((bookmark) =>
							bookmark.id === data.bookmarkId
								? { ...bookmark, categoryIds: data.categoryIds }
								: bookmark,
						),
					};
				},
			);

			// Return context for rollback
			return { previousData };
		},
		// Rollback on error
		onError: (error, variables, context) => {
			if (context?.previousData) {
				queryClient.setQueryData(
					[BOOKMARKS_KEY, session?.user?.id],
					context.previousData,
				);
			}
		},
		// Always refetch after error or success
		onSettled: () => {
			void queryClient.invalidateQueries({
				queryKey: [BOOKMARKS_KEY, session?.user?.id],
			});
		},
	});

	return { mutation };
}
```

**Key Points**:

- Cancel queries in `onMutate`
- Snapshot previous data for rollback
- Update optimistically
- Rollback in `onError`
- Invalidate in `onSettled`

### Query Invalidation

**✅ CORRECT - Invalidate related queries:**

```typescript
onSuccess: () => {
    void queryClient.invalidateQueries({
        queryKey: [BOOKMARKS_KEY, session?.user?.id],
    });
    void queryClient.invalidateQueries({
        queryKey: [CATEGORIES_KEY, session?.user?.id],
    });
},
```

---

## Code Quality Requirements

### File Size

**✅ CORRECT - Max 250 lines per file:**

- Split larger files into modules
- Extract reusable logic into utilities
- Use composition over large monolithic files

### Functional Programming

**✅ CORRECT - Only functional code:**

```typescript
export function processBookmarks(bookmarks: Bookmark[]): ProcessedBookmark[] {
	return bookmarks.map(transformBookmark);
}
```

**❌ WRONG - No classes:**

```typescript
// WRONG
class BookmarkProcessor {
	process(bookmarks: Bookmark[]) {
		/* ... */
	}
}
```

### Linting & Formatting

**✅ ALWAYS run before PR:**

```bash
pnpm fix:eslint <changed-files>
pnpm lint:types
pnpm fix:prettier
```

**Required checks**:

- ESLint passes
- TypeScript strict mode passes
- Prettier formatting applied
- No unused code (knip)

### Code Style

**✅ Follow conventions:**

- Components: `PascalCase`
- Functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Files: `kebab-case` for hooks/utils, `PascalCase` for components

### Code Reuse

**✅ ALWAYS check for existing implementations before creating new ones:**

```typescript
// ✅ CORRECT: Search for existing hooks/functions first
// Before creating a new hook, check:
// - src/hooks/ for custom hooks
// - src/async/mutationHooks/ for mutation hooks
// - src/async/queryHooks/ for query hooks
// - src/utils/ for utility functions
// - src/components/ for reusable components

// Example: Need to fetch categories?
// ✅ Use existing: useFetchCategories() from src/async/queryHooks/category/
// ❌ Don't create: useGetCategories() or fetchCategories()

// Example: Need to add category to bookmark?
// ✅ Use existing: useAddCategoryToBookmarkOptimisticMutation() from src/async/mutationHooks/category/
// ❌ Don't create: useSetBookmarkCategory() or addCategory()
```

**❌ WRONG - Creating duplicates:**

```typescript
// WRONG: Creating duplicate functionality
export function useGetCategories() {
	// Same functionality as existing useFetchCategories()
}

// WRONG: Creating duplicate component
export function CategoryList() {
	// Same functionality as existing CategoriesList component
}

// WRONG: Creating duplicate utility
export function formatDate(date: Date) {
	// Same functionality as existing formatDate() in utils/
}
```

**Rules:**

- **Search first**: Use `grep`, `rg`, or `ast-grep` to find existing implementations
- **Check imports**: Look at how other files solve similar problems
- **Reuse patterns**: Follow established patterns rather than inventing new ones
- **Extend, don't duplicate**: If existing code is close but not perfect, extend it rather than duplicating
- **Ask if unsure**: If you can't find existing code, ask in PR comments before creating new

**Why**: Reduces code duplication, maintains consistency, and leverages tested, battle-hardened code.

---

## Common Mistakes & Anti-Patterns

### Code Reuse Mistakes

#### ❌ Creating Duplicate Functionality

**Problem:**

```typescript
// WRONG: Creating duplicate hook when useFetchCategories already exists
export function useGetCategories() {
	const [categories, setCategories] = useState([]);
	// ... same logic as existing useFetchCategories
}

// WRONG: Creating duplicate component
export function CategoryDropdown() {
	// ... same functionality as existing component
}

// WRONG: Creating duplicate utility
export function formatDate(date: Date) {
	// ... same logic as existing formatDate in utils/
}
```

**Fix:**

```typescript
// CORRECT: Use existing hook
import { useFetchCategories } from "@/async/queryHooks/category/useFetchCategories";

// CORRECT: Use existing component
import { CategorySelect } from "@/components/category-select";

// CORRECT: Use existing utility
import { formatDate } from "@/utils/date-utils";
```

**How to check:**

```bash
# Search for existing hooks
rg "useFetch.*Categories" src/hooks/ src/async/

# Search for existing components
rg "Category.*Select|Category.*Dropdown" src/components/

# Search for existing utilities
rg "formatDate|format.*date" src/utils/
```

### Migration Mistakes

#### ❌ Missing Transaction Blocks

**Problem:**

```sql
-- WRONG: No BEGIN/COMMIT
ALTER TABLE everything ADD COLUMN make_discoverable timestamptz;
CREATE POLICY "anon_discover_access" ON everything FOR SELECT TO anon USING (make_discoverable IS NOT NULL);
```

**Fix:**

```sql
BEGIN;
ALTER TABLE everything ADD COLUMN make_discoverable timestamptz;
CREATE POLICY "anon_discover_access" ON everything FOR SELECT TO anon USING (make_discoverable IS NOT NULL);
COMMIT;
```

#### ❌ Incomplete RLS Policies

**Problem:**

```sql
-- WRONG: Only one policy for all operations
CREATE POLICY "all_access" ON everything FOR ALL TO authenticated USING (true);
```

**Fix:**

```sql
-- Separate policies per operation and role
CREATE POLICY "everything_select_authenticated" ON everything FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "everything_select_anon" ON everything FOR SELECT TO anon USING (is_public = true);
CREATE POLICY "everything_insert" ON everything FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "everything_update" ON everything FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "everything_delete" ON everything FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));
```

#### ❌ Missing Indexes

**Problem:**

```sql
-- WRONG: RLS policy uses column without index
CREATE POLICY "user_access" ON everything FOR SELECT TO authenticated
USING (category_id IN (SELECT category_id FROM shared_categories WHERE email = (SELECT auth.jwt()->>'email')));
-- No index on shared_categories.category_id or shared_categories.email
```

**Fix:**

```sql
-- Add indexes for RLS performance
CREATE INDEX IF NOT EXISTS idx_shared_categories_category_id ON public.shared_categories (category_id);
CREATE INDEX IF NOT EXISTS idx_shared_categories_email ON public.shared_categories (email);
CREATE INDEX IF NOT EXISTS idx_shared_categories_category_id_email ON public.shared_categories (category_id, email);
```

#### ❌ Missing Documentation

**Problem:**

```sql
-- WRONG: No comments explaining purpose
CREATE TABLE bookmark_categories (
    bookmark_id bigint,
    category_id bigint
);
```

**Fix:**

```sql
CREATE TABLE bookmark_categories (
    bookmark_id bigint,
    category_id bigint
);

COMMENT ON TABLE public.bookmark_categories IS
'Junction table for many-to-many relationship between bookmarks and categories.';
COMMENT ON COLUMN public.bookmark_categories.bookmark_id IS 'Foreign key to everything.id';
COMMENT ON COLUMN public.bookmark_categories.category_id IS 'Foreign key to categories.id';
```

### API Route Mistakes

#### ❌ Missing Authentication or Wrong Handler Type

**Problem:**

```typescript
// WRONG: No auth check in manual handler
export async function POST(request: NextRequest) {
	const body = await request.json();
	// Direct database access without auth
}

// WRONG: Using requireAuth in public handler
export const GET = createGetApiHandler({
	handler: async ({ input, route }) => {
		const auth = await requireAuth(ROUTE); // ❌ Public handler shouldn't require auth
		// ...
	},
});
```

**Fix:**

```typescript
// CORRECT: Use authenticated handler helper
export const POST = createPostApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: PayloadSchema,
	outputSchema: ResponseSchema,
	handler: async ({ data, supabase, user, route }) => {
		// Auth handled automatically
		// Now safe to proceed
	},
});

// OR: Manual handler with requireAuth
export async function POST(request: NextRequest) {
	const auth = await requireAuth(ROUTE);
	if (auth.errorResponse) {
		return auth.errorResponse;
	}
	const { supabase, user } = auth;
	// Now safe to proceed
}

// CORRECT: Public handler (no auth)
export const GET = createGetApiHandler({
	route: ROUTE,
	inputSchema: QuerySchema,
	outputSchema: ResponseSchema,
	handler: async ({ input, route }) => {
		// Public endpoint - no auth required
		const { supabase } = await createApiClient();
		// ...
	},
});
```

#### ❌ Missing Input Validation

**Problem:**

```typescript
// WRONG: No validation
const body = await request.json();
const bookmarkId = body.bookmarkId; // Could be string, null, undefined, etc.
```

**Fix:**

```typescript
const body = await parseBody({
	request,
	schema: z.object({
		bookmarkId: z.number().int().positive(),
	}),
	route: ROUTE,
});
if (body.errorResponse) {
	return body.errorResponse;
}
const { bookmarkId } = body.data; // Type-safe!
```

#### ❌ Wrong Error Type

**Problem:**

```typescript
// WRONG: Using apiError for user validation error
if (!bookmark) {
	return apiError({
		route: ROUTE,
		message: "Bookmark not found",
		error: new Error("Not found"),
		operation: "get_bookmark",
	}); // This sends to Sentry unnecessarily
}
```

**Fix:**

```typescript
// CORRECT: Use apiWarn for user errors
if (!bookmark) {
	return apiWarn({
		route: ROUTE,
		message: "Bookmark not found",
		status: HttpStatus.NOT_FOUND,
		context: { bookmarkId },
	}); // No Sentry, just logs warning
}
```

### TypeScript Mistakes

#### ❌ Using `any`

**Problem:**

```typescript
// WRONG
function processData(data: any) {
	return data.someProperty;
}
```

**Fix:**

```typescript
// CORRECT
type DataType = {
	someProperty: string;
};
function processData(data: DataType) {
	return data.someProperty;
}
```

#### ❌ Default Exports

**Problem:**

```typescript
// WRONG
export default function useBookmarkCategories() {
	/* ... */
}
```

**Fix:**

```typescript
// CORRECT
export function useBookmarkCategories() {
	/* ... */
}
```

### React Query Mistakes

#### ❌ Missing Rollback

**Problem:**

```typescript
// WRONG: No rollback on error
onMutate: async (data) => {
    queryClient.setQueryData([KEY], newData);
    // No snapshot, no rollback
},
```

**Fix:**

```typescript
// CORRECT: Snapshot and rollback
onMutate: async (data) => {
    await queryClient.cancelQueries({ queryKey: [KEY] });
    const previousData = queryClient.getQueryData([KEY]);
    queryClient.setQueryData([KEY], newData);
    return { previousData };
},
onError: (error, variables, context) => {
    if (context?.previousData) {
        queryClient.setQueryData([KEY], context.previousData);
    }
},
```

---

## Pre-PR Checklist

Use this checklist before submitting any PR. Check each item to ensure your code meets standards.

### Checklist: Database Migrations

- [ ] Migration file named correctly (`YYYYMMDDHHmmss_description.sql`)
- [ ] Comprehensive header comment with purpose and affected tables
- [ ] Wrapped in `BEGIN;` / `COMMIT;` transaction block
- [ ] Pre-flight validation (DO blocks) for prerequisites
- [ ] Post-migration verification (DO blocks) for data integrity
- [ ] RLS policies created (one per operation, one per role)
- [ ] RLS policies use `(SELECT auth.uid())` pattern for performance
- [ ] Indexes created for columns used in RLS policies
- [ ] Indexes created for foreign keys and common query patterns
- [ ] `COMMENT ON` statements for tables, columns, functions, policies
- [ ] Data migration handles edge cases (NULLs, duplicates, conflicts)
- [ ] Security functions use `SECURITY DEFINER` with proper checks
- [ ] Functions include `SET search_path = public, pg_temp`
- [ ] All SQL keywords in UPPERCASE (consistent within file)

### Checklist: API Routes

- [ ] **Handler pattern**:
  - [ ] Uses handler helpers (`createGetApiHandler`, `createPostApiHandler`, etc.) when possible
  - [ ] Uses `createGetApiHandlerWithAuth`/`createPostApiHandlerWithAuth` for authenticated endpoints
  - [ ] Uses `createGetApiHandler`/`createPostApiHandler` for public endpoints (no auth)
  - [ ] If manual handler, uses `requireAuth` for authenticated endpoints only
  - [ ] Public handlers do NOT use `requireAuth`
- [ ] Uses `parseBody` with Zod schema (POST/PUT/PATCH) or `parseQuery` (GET) - or handler helpers handle this
- [ ] Uses `apiSuccess` with Zod schema for output validation - or handler helpers handle this
- [ ] Uses `apiWarn` for user errors (4xx)
- [ ] Uses `apiError` for system errors (5xx)
- [ ] Includes comprehensive API documentation comment block
- [ ] Error handling in try/catch block (if manual handler, helpers handle it automatically)
- [ ] Sentry integration for system errors only
- [ ] Route constant defined (`const ROUTE = "..."`)

### TypeScript

- [ ] No `any` types used
- [ ] No `@ts-ignore` or `@ts-expect-error` directives
- [ ] Named exports only (no default exports)
- [ ] Types exported only if used in other files
- [ ] Type deduction from immediate parent (not grandparent)
- [ ] Uses utility types (`Parameters<>`, `ReturnType<>`, `Pick<>`, etc.) where appropriate
- [ ] Strict mode passes (`pnpm lint:types`)

### React & React Query

- [ ] Hook file named in kebab-case (`use-bookmark-categories.ts`)
- [ ] Hook function exported as named export (not default)
- [ ] Optimistic mutations include:
  - [ ] `cancelQueries` in `onMutate`
  - [ ] Snapshot previous data
  - [ ] Rollback in `onError`
  - [ ] Invalidate in `onSettled`
- [ ] Query invalidation includes all related queries
- [ ] No array indices as React keys
- [ ] Hooks at top level with all dependencies

### Code Quality

- [ ] File size ≤ 250 lines (split if larger)
- [ ] Functional programming only (no classes)
- [ ] ESLint passes (`pnpm fix:eslint <changed-files>`)
- [ ] Prettier formatting applied (`pnpm fix:prettier`)
- [ ] TypeScript strict mode passes (`pnpm lint:types`)
- [ ] No unused code (check with `pnpm lint:knip`)
- [ ] Naming conventions followed:
  - [ ] Components: `PascalCase`
  - [ ] Functions: `camelCase`
  - [ ] Constants: `UPPER_SNAKE_CASE`
  - [ ] Files: `kebab-case` for hooks/utils
- [ ] **Code reuse checked**:
  - [ ] Searched for existing hooks before creating new ones (`src/hooks/`, `src/async/`)
  - [ ] Searched for existing components before creating new ones (`src/components/`)
  - [ ] Searched for existing utilities before creating new ones (`src/utils/`)
  - [ ] Used existing patterns rather than inventing new ones

### Documentation

- [ ] Migration includes header comments explaining purpose
- [ ] Complex logic includes inline comments
- [ ] API routes include API documentation block
- [ ] Functions include JSDoc comments where helpful
- [ ] Database objects have `COMMENT ON` statements

### Testing & Verification

- [ ] Migration tested locally (`supabase db reset` and verify)
- [ ] API routes tested with valid/invalid inputs
- [ ] Error cases tested (auth failures, validation errors)
- [ ] RLS policies tested (different user roles)
- [ ] **No console.log statements** left in frontend (remove all console.log from production code)
- [ ] No commented-out code

### Security

- [ ] RLS policies properly restrict access
- [ ] No SQL injection vulnerabilities (use parameterized queries)
- [ ] No authentication bypasses
- [ ] Input validation on all user inputs
- [ ] Sensitive data not logged

---

## Reference Documentation

- [CLAUDE.md](../CLAUDE.md) - Core project guidelines
- [Migration Guidelines](.cursor/rules/supabase-create-migration.mdc) - Migration standards
- [RLS Policy Guidelines](.cursor/rules/supabase-create-rls-policies.mdc) - RLS best practices
- [Code Style Conventions](../CLAUDE.md#code-style-conventions) - Code style rules
- [Task Completion Checklist](../CLAUDE.md#task-completion-checklist) - Required checks before completing tasks

---

## Questions?

If you're unsure about any standard, check:

1. PR 694 (`feat(bookmark-categories): ✨ implement many-to-many bookmark categories relationship`) - Excellent reference
2. Existing migrations in `supabase/migrations/` - Follow established patterns
3. Existing API routes in `src/app/api/` or `src/pages/api/` - Follow established patterns
4. Ask in PR comments before submitting - Better to clarify early!

---

**Last Updated**: 2026-01-05
**Maintained By**: Development Team
