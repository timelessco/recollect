---
paths:
  - "src/**/*.{ts,tsx}"
---

## Sentry

Error tracking and debugging patterns.

### Exception Capture

Always include `tags.operation` (makes errors searchable) and `userId` when available:

```typescript
Sentry.captureException(error, {
  tags: { operation: "fetch_bookmark", userId },
  extra: { bookmarkId },
});
```

Anti-patterns to avoid: `Sentry.captureException(error)` (no tags); `Sentry.captureException(`Error: ${msg}`)` (string instead of an Error object).

### Breadcrumbs for Cache Debugging

Use `Sentry.addBreadcrumb` to track state before errors (category lowercase + hyphenated):

```typescript
// src/utils/cache-debug-helpers.ts
Sentry.addBreadcrumb({
  category: "optimistic-update",
  message: "Cache miss for category",
  level: "warning",
  data: { bookmarkId: variables.bookmark_id, categoryId: variables.category_id },
});
```

Use `logCacheMiss` in optimistic mutation hooks:

```typescript
import { logCacheMiss } from "@/utils/cache-debug-helpers";

if (!foundItem) {
  logCacheMiss("Optimistic Update", "Item not found in cache", { itemId: variables.id });
  return currentData;
}
```

### API Handler Integration (v1 only)

Response helpers in `/src/lib/api-helpers/response.ts` auto-capture exceptions. For v2 error routing, see `api-v2.md`.

| Helper | Sentry | Use For |
|---|---|---|
| `apiError` | Auto-captures with tags | System/database errors |
| `apiWarn` | No capture | User errors (404, validation) |
| `apiSuccess` | No capture | Success responses |

```typescript
return apiError({
  route: ROUTE,
  message: "Failed to fetch data",
  error,
  operation: "fetch_bookmarks", // becomes Sentry tag
  userId,
  extra: { queryParams },
});
```

### Error Boundaries

Root error boundaries capture with context:

```typescript
// src/app/error.tsx
Sentry.captureException(error, { extra: { errorMessage: "Root error" } });
```

### Best Practices

- Always tag operations (filterable in Sentry dashboard)
- Include `userId` when available
- Use breadcrumbs before risky operations
- Let response helpers handle API errors (v1 only)
- Always pass `Error` objects, never strings
