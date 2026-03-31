---
paths:
  - "src/**/*.{ts,tsx}"
---

## Sentry

Patterns for error tracking and debugging with Sentry in this project.

### Exception Capture (Primary Pattern)

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

### Breadcrumbs for Cache Debugging

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

### API Handler Integration

**V1 routes only** — response helpers in `/src/lib/api-helpers/response.ts` auto-capture exceptions. v2 routes use `RecollectApiError` throws instead (see v2 Route Error Flow below).

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

### Error Boundaries

Root error boundaries capture with context:

```typescript
// /src/app/error.tsx
Sentry.captureException(error, {
	extra: { errorMessage: "Root error" },
});
```

### v2 Route Error Flow (v3.0+)

v2 routes (`create-handler-v2.ts`) use a layered error model where Sentry only captures truly unexpected errors:

**Known errors (RecollectApiError):**
1. Handler throws `new RecollectApiError("service_unavailable", { cause, message, operation })`
2. Inner layer (`withAuth`/`withPublic`) catches it
3. Logged as Axiom `warn` (not error) with route, status, and operation context
4. Returned as `{error: string}` HTTP response
5. **Never sent to Sentry** — these are expected operational failures (DB errors, validation, auth)

**Unknown errors (unexpected throws):**
1. Handler throws something that is NOT a `RecollectApiError`
2. Inner layer re-throws to outer `createAxiomRouteHandler` catch
3. Logged as Axiom `error` with full error details
4. Re-thrown from the outer catch
5. Next.js `instrumentation.ts` `onRequestError` hook catches it and sends to **Sentry**

**Key difference from v1:** v1 uses `apiError()` which directly calls `Sentry.captureException`. v2 separates known vs unknown errors — only unknown errors reach Sentry, reducing noise.

### Best Practices

1. **Always tag operations** - Makes errors filterable in Sentry dashboard
2. **Include userId when available** - Helps identify affected users
3. **Use breadcrumbs before risky operations** - Provides context for debugging
4. **Let response helpers handle API errors** - Consistent capture pattern (v1 only)
5. **Don't capture strings** - Always pass actual Error objects
6. **v2 routes: throw RecollectApiError for known failures** - Never import Sentry directly in v2 handlers
