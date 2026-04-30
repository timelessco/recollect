# Wide Event Enrichment Patterns

Canonical examples, anti-patterns, and field naming conventions for v2 API route `ctx.fields`.

For v2 route rules (handler composition, error handling, schemas), see `.claude/rules/api-v2.md`.

## Canonical Examples

### Simple mutation — api-key

`src/app/api/v2/api-key/route.ts`

```typescript
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";

// BEFORE: entity context (observability primitives stay top-level)
const ctx = getServerContext();
if (ctx?.fields) {
  ctx.fields.user_id = userId;
}

// ... validate + upsert ...

// AFTER: outcome flag → lands in the `payload` scalar
setPayload(ctx, { key_upserted: true });
```

Non-observability, non-`_id`-suffix writes (counts, flags, outcomes, input descriptors) MUST route
through `setPayload`. `ServerContext.fields` is narrowed at compile time —
`ctx.fields.key_upserted = true` is a `tsc` error.

### Complex mutation with after() — add-bookmark-min-data

`src/app/api/v2/bookmark/add-bookmark-min-data/route.ts`

```typescript
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";

// BEFORE: entity context (set first — survives any throw below)
const ctx = getServerContext();
if (ctx?.fields) {
  ctx.fields.user_id = userId;                 // observability primitive
  ctx.fields.category_id = data.category_id;   // `_id` suffix → `ids` scalar
}
// Input descriptor (`url` has no `_id` suffix) → `payload` scalar
setPayload(ctx, { url: data.url });

// DURING: process-level flags (set as events happen)
if (scrapperError) {
  setPayload(ctx, { scraper_failed: true });
}

// AFTER INSERT: entity ID available now + outcome flag
if (ctx?.fields) {
  ctx.fields.bookmark_id = insertedBookmark.id;   // `_id` suffix
}
setPayload(ctx, { has_og_image: ogImageToBeAdded !== null });

// NON-BLOCKING ERROR (junction failure — degraded, not fatal)
if (junctionError) {
  setPayload(ctx, {
    junction_error: junctionError.message,
    junction_error_code: junctionError.code,
  });
}

// AFTER() CATCH: logger.warn (NOT Sentry — ALS is gone in after())
after(async () => {
  try {
    await addRemainingBookmarkData({ ... });
  } catch (error) {
    logger.warn("[add-bookmark-min-data] after() enrichment failed", {
      bookmark_id: insertedBookmark.id,
      user_id: userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
```

### Queue worker — ai-enrichment (21+ fields)

`src/app/api/v2/ai-enrichment/route.ts`

Queue workers need the richest events because they process asynchronously:
- Entity: `user_id`, `queue_name`, `msg_id`, `bookmark_id`, `url`
- Classification: `is_twitter`, `is_instagram`, `is_raindrop`
- Process: `url_validation_error`, `validation_message`, `image_reupload_error`
- Outcome: `enrichment_failed`, `queue_kept`, `enrich_error`

### GET read — fetch-bookmarks-count

`src/app/api/v2/bookmark/fetch-bookmarks-count/route.ts`

```typescript
// BEFORE: entity context
if (ctx?.fields) {
  ctx.fields.user_id = userId;
}

// AFTER: result aggregates → `payload` scalar (counts are non-observability)
setPayload(ctx, {
  total_count: allResult.count ?? 0,
  trash_count: trashResult.count ?? 0,
  category_count_total: allCategoryIds.length,
});
```

### File upload — upload-file

`src/app/api/v2/file/upload-file/route.ts`

```typescript
// BEFORE: entity IDs stay top-level (`_id` suffix → `ids` scalar)
if (ctx?.fields) {
  ctx.fields.category_id = data.category_id;
}
// File input descriptors → `payload` scalar
setPayload(ctx, { file_name: fileName, file_type: fileType });

// AFTER INSERT: `_id` suffix stays top-level
if (ctx?.fields) {
  ctx.fields.bookmark_id = insertedBookmark.id;
}

// NON-BLOCKING ERROR (junction table failure — degraded, not fatal)
if (junctionError) {
  setPayload(ctx, {
    junction_error: junctionError.message,
    junction_error_code: junctionError.code,
  });
}
```

## Anti-patterns

### Raw PII in ctx.fields

```typescript
// BAD: raw email logged to Axiom — also a tsc error (not in the narrow)
ctx.fields.email = email;
ctx.fields.username = username;

// GOOD: boolean/length signals via setPayload → `payload` scalar
setPayload(ctx, {
  has_email: Boolean(email),
  username_length: username.length,
});
```

### Console calls in v2 handlers

```typescript
// BAD: unstructured logging
console.log("Processing bookmark:", bookmarkId);

// GOOD: structured via wide event
ctx.fields.bookmark_id = bookmarkId;
```

### Bare catch blocks (discards error cause)

```typescript
// BAD: original error lost
} catch {
  throw new RecollectApiError("bad_request", {
    message: "Invalid input",
  });
}

// GOOD: cause preserved for Axiom extractCauseFields
} catch (error) {
  throw new RecollectApiError("bad_request", {
    cause: error,
    message: "Invalid input",
  });
}
```

### Raw throw new Error in v2 routes

```typescript
// BAD: goes to outer catch as "unknown" → Axiom error + Sentry
throw new Error(`Failed to delete: ${error.message}`);

// GOOD: caught by inner layer → Axiom warn, no Sentry
throw new RecollectApiError("service_unavailable", {
  cause: error,
  message: "Failed to delete",
  operation: "delete_resource",
});
```

### Error message string concatenation

```typescript
// BAD: bakes inner error into message string
throw new Error(`Failed to list at ${path}: ${err.message}`);

// GOOD: structured cause — extractCauseFields reads cause_message, cause_code, etc.
throw new RecollectApiError("service_unavailable", {
  cause: err,
  message: `Failed to list at ${path}`,
  operation: "storage_list",
});
```

### Sentry in after() blocks

```typescript
// BAD: Sentry inside after()
after(async () => {
  try { ... } catch (error) {
    Sentry.captureException(error);
  }
});

// GOOD: logger.warn with entity context
after(async () => {
  try { ... } catch (error) {
    logger.warn("[route-name] after() enrichment failed", {
      bookmark_id: id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
```

### Late entity IDs

```typescript
// BAD: entity IDs set after the operation
const { data } = await supabase.from(TABLE).select();
ctx.fields.user_id = userId;  // lost if the query above throws

// GOOD: entity IDs before the operation
ctx.fields.user_id = userId;  // always in the Axiom event
const { data } = await supabase.from(TABLE).select();
```

## Field Naming Conventions

| Category | Pattern | Examples |
|----------|---------|----------|
| Entity IDs | `*_id`, `user_id` | `bookmark_id`, `category_id`, `tag_id`, `shared_category_id` |
| Input context | descriptive name | `url`, `file_type`, `file_name`, `media_type`, `queue_name`, `offset` |
| Boolean flags | `is_*`, `has_*` | `is_discover`, `is_media_url`, `has_screenshot`, `has_og_image` |
| Outcome booleans | `*_completed`, `*_deleted`, `*_updated`, `*_sent` | `enrichment_completed`, `user_deleted`, `profile_updated` |
| PII replacements | `has_*`, `*_length`, `*_count` | `has_email`, `username_length`, `recipient_count` |
| Result metrics | `*_count`, `*_returned` | `total_count`, `results_count`, `processed_count` |
| Error context | `*_error`, `*_error_code` | `junction_error`, `media_type_error`, `video_collection_error` |
| Failure flags | `*_failed` | `scraper_failed`, `additional_images_failed`, `profile_fetch_failed` |

## Pitfall #23: ALS Gone Inside after()

AsyncLocalStorage context is NOT available inside `after()` callbacks:

1. All `ctx.fields` assignments must happen BEFORE the handler returns
2. Inside `after()`, `getServerContext()` returns null
3. Error logging inside `after()` catch blocks must use `logger.warn` directly
4. Entity context for logger.warn must be captured as closure variables before `after()` is called

## Cross-references

| Resource | Location |
|----------|----------|
| v2 route rules | `.claude/rules/api-v2.md` |
| Wide event emission | `src/lib/api-helpers/axiom.ts` — `partitionFields` (~L196), `createAxiomRouteHandler` (~L242) |
| `setPayload` helper | `src/lib/api-helpers/server-context.ts` — `setPayload` (~L95) |
| ServerContext | `src/lib/api-helpers/server-context.ts` |
| Error class | `src/lib/api-helpers/errors.ts` |
