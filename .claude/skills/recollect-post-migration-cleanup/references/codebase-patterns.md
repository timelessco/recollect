# Codebase Patterns Reference

## Key File Locations

### API Infrastructure

| File                                    | Purpose                                          |
| --------------------------------------- | ------------------------------------------------ |
| `src/lib/api-helpers/create-handler.ts` | `createSupabasePostApiHandler` factory           |
| `src/lib/api-helpers/response.ts`       | `apiSuccess`, `apiError`, `apiWarn`, `parseBody` |
| `src/lib/api-helpers/api.ts`            | `postApi` client helper                          |
| `src/lib/supabase/api.ts`               | `requireAuth` authentication                     |

### Validation

| File                                        | Purpose                            |
| ------------------------------------------- | ---------------------------------- |
| `src/lib/validation/tag-category-schema.ts` | Shared `tagCategoryNameSchema`     |
| `src/utils/assertion-utils.ts`              | `isNonEmptyArray`, `isNonNullable` |

### State Management

| File                                               | Purpose                         |
| -------------------------------------------------- | ------------------------------- |
| `src/hooks/use-react-query-optimistic-mutation.ts` | Optimistic mutation abstraction |
| `src/store/componentStore.ts`                      | `useSupabaseSession`            |

### Constants

| File                     | Purpose                            |
| ------------------------ | ---------------------------------- |
| `src/utils/constants.ts` | Table names, API paths, query keys |

## Example Migrations

### Simple Create (Category)

**Route:** `src/app/api/category/create-user-category/route.ts`

- Single table insert
- Duplicate detection (23505)
- Optional order update

**Hook:** `src/async/mutationHooks/category/use-add-category-mutation.ts`

- Simple cache structure `{ data: CategoriesData[] }`
- Invalidates 3 keys: categories, profile, bookmarks count

### With Ownership (Add Tag to Bookmark)

**Route:** `src/app/api/tags/add-tag-to-bookmark/route.ts`

- Verify bookmark ownership
- Verify tag ownership
- Insert junction table record

**Hook:** `src/async/mutationHooks/tags/use-add-tag-to-bookmark-mutation.ts`

- Paginated cache structure `{ pages: Array<{ data: SingleListData[] }> }`
- Updates bookmark's `addedTags` array

### Compound Operation (Create and Assign Tag)

**Route:** `src/app/api/tags/create-and-assign-tag/route.ts`

- Verify bookmark ownership
- Create new tag
- Create junction table record
- Returns object `{ tag, bookmarkTag }`

**Hook:** `src/async/mutationHooks/tags/use-create-and-assign-tag-mutation.ts`

- `additionalOptimisticUpdates` for multi-cache
- Updates both bookmarks and user tags caches

## Error Handling Patterns

### Duplicate Detection

```typescript
if (
	error.code === "23505" ||
	error.message?.includes("unique_constraint_name")
) {
	return apiWarn({
		route,
		message: "Duplicate name",
		status: 409,
		context: { name, userId },
	});
}
```

### Authorization Failure

```typescript
if (resourceData?.user_id !== userId) {
	return apiWarn({
		route,
		message: "User is not the owner",
		status: 403,
		context: { resourceId, userId },
	});
}
```

### Server Error

```typescript
return apiError({
	route,
	message: "Error description",
	error,
	operation: "operation_name",
	userId,
	extra: { additionalContext },
});
```

## Query Key Patterns

```typescript
// Simple entity list
const queryKey = [ENTITY_KEY, session?.user?.id] as const;

// Paginated with filters
const queryKey = [
	BOOKMARKS_KEY,
	session?.user?.id,
	categoryId,
	sortBy,
] as const;
```

## Cache Structure Patterns

### Simple List

```typescript
type CacheData = { data: EntityData[] } | undefined;
```

### Paginated (Infinite Query)

```typescript
type CacheData =
	| {
			pages: Array<{ data: EntityData[] }>;
	  }
	| undefined;
```

## Temp ID Pattern

```typescript
const tempId = -Date.now(); // Negative to avoid collision with real IDs
```
