# Sentry Monitoring Guidelines

Patterns for error tracking and debugging with Sentry in this project.

## Configuration

Sentry initialization files:

- `instrumentation-client.ts` - Client-side init
- `sentry.server.config.ts` - Server init
- `sentry.edge.config.ts` - Edge init

Import Sentry in other files: `import * as Sentry from "@sentry/nextjs"`

## Exception Capture (Primary Pattern)

**Always include tags and context:**

```typescript
Sentry.captureException(error, {
	tags: {
		operation: "operation_name", // Required - makes errors searchable
		userId, // Include when available
	},
	extra: {
		contextualData, // Debug data (not indexed)
	},
});
```

**Anti-pattern to avoid:**

```typescript
// BAD - No tags, not searchable
Sentry.captureException(error);
Sentry.captureException(`Error: ${message}`);

// GOOD - Tagged and searchable
Sentry.captureException(error, {
	tags: { operation: "fetch_bookmark", userId },
	extra: { bookmarkId },
});
```

## Breadcrumbs for Cache Debugging

Use `Sentry.addBreadcrumb` to track state before errors occur:

```typescript
// From /src/utils/cache-debug-helpers.ts
Sentry.addBreadcrumb({
	category: "optimistic-update", // Lowercase, hyphenated
	message: "Cache miss for category",
	level: "warning",
	data: {
		bookmarkId: variables.bookmark_id,
		categoryId: variables.category_id,
	},
});
```

Use `logCacheMiss` helper in optimistic mutation hooks:

```typescript
import { logCacheMiss } from "@/utils/cache-debug-helpers";

if (!foundItem) {
	logCacheMiss("Optimistic Update", "Item not found in cache", {
		itemId: variables.id,
	});
	return currentData;
}
```

## API Handler Integration

Response helpers in `/src/lib/api-helpers/response.ts` auto-capture exceptions:

| Helper       | Sentry                  | Use For                       |
| ------------ | ----------------------- | ----------------------------- |
| `apiError`   | Auto-captures with tags | System/database errors        |
| `apiWarn`    | No capture              | User errors (404, validation) |
| `apiSuccess` | No capture              | Success responses             |

```typescript
// apiError automatically calls Sentry.captureException
return apiError({
	route: ROUTE,
	message: "Failed to fetch data",
	error,
	operation: "fetch_bookmarks", // Becomes Sentry tag
	userId,
	extra: { queryParams },
});
```

## Error Boundaries

Root error boundaries capture with context:

```typescript
// /src/app/error.tsx
Sentry.captureException(error, {
	extra: { errorMessage: "Root error" },
});
```

## Best Practices

1. **Always tag operations** - Makes errors filterable in Sentry dashboard
2. **Include userId when available** - Helps identify affected users
3. **Use breadcrumbs before risky operations** - Provides context for debugging
4. **Let response helpers handle API errors** - Consistent capture pattern
5. **Don't capture strings** - Always pass actual Error objects
