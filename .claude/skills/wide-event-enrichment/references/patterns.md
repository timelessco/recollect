# Wide Event Enrichment Patterns

Canonical examples, anti-patterns, and field naming conventions for v2 API route `ctx.fields`.

## Architecture

```
Handler code                    Axiom wide event
─────────────                   ────────────────
ctx.fields.user_id = userId     ──┐
ctx.fields.bookmark_id = id     ──┤
ctx.fields.found = true         ──┤──→  { route, method, status, duration_ms,
                                  │      user_id, bookmark_id, found,
createAxiomRouteHandler          │      request_id, source, search_params }
  └── ...ctx?.fields  ───────────┘      ↑ single Axiom log line per request
```

**How it works:**
1. `createAxiomRouteHandler` (axiom.ts:107) wraps the handler in `runWithServerContext`
2. `fields: {}` initialized at axiom.ts:104
3. Handler code calls `getServerContext()` → gets reference to the same object
4. Handler mutates `ctx.fields` by direct assignment
5. After handler returns, axiom.ts:124 spreads `...ctx?.fields` into the log payload
6. Same spread happens in the catch path (axiom.ts:151) — fields persist on errors
7. `after(() => logger.flush())` defers the network call until after the response

**Key insight:** Because fields spread happens in BOTH success AND error paths, entity IDs
set before an operation are visible in Axiom even when the handler throws. This is why
the "entity before, outcome after" pattern works — you never lose context on failures.

## Canonical Examples

### Simple mutation — update-username

`src/app/api/v2/profiles/update-username/route.ts`

```typescript
// BEFORE: entity context + PII-safe input metric
const ctx = getServerContext();
if (ctx?.fields) {
  ctx.fields.user_id = userId;
  ctx.fields.username_length = username.length;  // NOT raw username (PII)
}

// ... check availability, update DB ...

// AFTER: outcome
if (ctx?.fields) {
  ctx.fields.username_updated = true;
}
```

### Complex mutation with after() — add-bookmark-min-data

`src/app/api/v2/bookmark/add-bookmark-min-data/route.ts`

```typescript
// BEFORE: entity context (set first thing — survives any throw below)
const ctx = getServerContext();
if (ctx?.fields) {
  ctx.fields.user_id = userId;
  ctx.fields.url = data.url;
  ctx.fields.category_id = data.category_id;
}

// DURING: process-level flags (set as events happen)
if (scrapperError && ctx?.fields) {
  ctx.fields.scraper_failed = true;
}
if (ctx?.fields) {
  ctx.fields.is_media_url = isUrlOfMimeType;
}

// AFTER INSERT: entity ID only available now + outcome
if (ctx?.fields) {
  ctx.fields.bookmark_id = insertedBookmark.id;
  ctx.fields.has_og_image = ogImageToBeAdded !== null;
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

### Rich route — add-url-screenshot (8 fields)

`src/app/api/v2/bookmark/add-url-screenshot/route.ts`

Entity IDs up front, sub-step failure flags during processing, success gate at end:
- `user_id`, `bookmark_id`, `url` — always present
- `screenshot_failed` — set if screenshot API fails
- `additional_images_failed`, `additional_video_failed`, `video_collection_error` — sub-step outcomes
- `has_screenshot` — only set when entire happy path completes (absence = failure)

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

// ... 12 parallel count queries ...

// AFTER: result aggregates
if (ctx?.fields) {
  ctx.fields.total_count = allResult.count ?? 0;
  ctx.fields.trash_count = trashResult.count ?? 0;
  ctx.fields.category_count_total = allCategoryIds.length;
}
```

### File upload — upload-file

`src/app/api/v2/file/upload-file/route.ts`

```typescript
// BEFORE: file metadata (set before return — Pitfall #23)
ctx.fields.file_name = fileName;
ctx.fields.file_type = fileType;
ctx.fields.category_id = data.category_id;

// AFTER INSERT
ctx.fields.bookmark_id = insertedBookmark.id;

// NON-BLOCKING ERROR (junction table failure — degraded, not fatal)
if (junctionError && ctx?.fields) {
  ctx.fields.junction_error = junctionError.message;
  ctx.fields.junction_error_code = junctionError.code;
}
```

## Anti-patterns

### Raw PII in ctx.fields

```typescript
// BAD: raw email logged to Axiom
ctx.fields.email = email;
ctx.fields.username = username;
ctx.fields.recipient_email = input.emailList;

// GOOD: boolean/length signals
ctx.fields.has_email = Boolean(email);
ctx.fields.username_length = username.length;
ctx.fields.recipient_count = input.emailList.length;
```

### Console calls in v2 handlers

```typescript
// BAD: unstructured logging
console.log("Processing bookmark:", bookmarkId);

// GOOD: structured via wide event (already captured in the Axiom log line)
ctx.fields.bookmark_id = bookmarkId;
```

### Sentry in after() blocks

```typescript
// BAD: Sentry inside after() — should use logger.warn
after(async () => {
  try { ... } catch (error) {
    Sentry.captureException(error, { extra: { bookmarkId } });
  }
});

// GOOD: logger.warn with explicit entity context
after(async () => {
  try { ... } catch (error) {
    logger.warn("[route-name] after() enrichment failed", {
      bookmark_id: bookmarkId,
      user_id: userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
```

Why: after() runs outside the factory's `runWithServerContext` scope. `onRequestError` cannot
intercept errors here. The factory-level Sentry integration handles unexpected errors in the
main handler; after() callbacks need explicit logger.warn for operational failure tracking.

### Late entity IDs

```typescript
// BAD: entity IDs set after the operation
const { data } = await supabase.from(TABLE).select();
const ctx = getServerContext();
if (ctx?.fields) {
  ctx.fields.user_id = userId;  // lost if the query above throws
}

// GOOD: entity IDs before the operation
const ctx = getServerContext();
if (ctx?.fields) {
  ctx.fields.user_id = userId;  // always in the Axiom event
}
const { data } = await supabase.from(TABLE).select();
```

### Raw error objects in logger.warn

```typescript
// BAD: error object may not serialize properly
logger.warn("failed", { error });

// GOOD: extract message string
logger.warn("[route-name] after() enrichment failed", {
  error: error instanceof Error ? error.message : String(error),
});
```

## Field Naming Conventions

| Category | Pattern | Examples |
|----------|---------|----------|
| Entity IDs | `*_id`, `user_id` | `bookmark_id`, `category_id`, `tag_id`, `shared_category_id` |
| Input context | descriptive name | `url`, `file_type`, `file_name`, `media_type`, `queue_name`, `offset` |
| Boolean flags | `is_*`, `has_*` | `is_discover`, `is_media_url`, `has_screenshot`, `has_og_image` |
| Outcome booleans | `*_completed`, `*_deleted`, `*_updated`, `*_sent` | `enrichment_completed`, `deleted`, `profile_updated`, `email_sent` |
| PII replacements | `has_*`, `*_length`, `*_count` | `has_email`, `username_length`, `recipient_count` |
| Result metrics | `*_count`, `*_returned` | `total_count`, `bookmarks_returned`, `results_count`, `processed_count` |
| Error context | `*_error`, `*_error_code` | `junction_error`, `media_type_error`, `video_collection_error` |
| Failure flags | `*_failed` | `scraper_failed`, `additional_images_failed`, `profile_fetch_failed` |

## Pitfall #23: ALS Gone Inside after()

AsyncLocalStorage context is NOT available inside `after()` callbacks. This means:

1. All `ctx.fields` assignments must happen BEFORE the handler returns
2. Inside `after()`, you cannot call `getServerContext()` — it returns null
3. Error logging inside `after()` catch blocks must use `logger.warn` directly (not ctx.fields)
4. Entity context for logger.warn must be captured as closure variables before `after()` is called

Reference: `src/app/api/v2/file/upload-file/route.ts` lines 186-195 explain this pattern.

## Cross-references

| Resource | Location | What it covers |
|----------|----------|----------------|
| v2 Layered Factory | `.claude/rules/api-logging.md` | Factory architecture, error handling layers, log levels |
| v2 Error Flow | `.claude/rules/sentry.md` | RecollectApiError vs unknown errors, Sentry integration |
| Wide event emission | `src/lib/api-helpers/axiom.ts:115-125` | `...ctx?.fields` spread into log payload |
| ServerContext | `src/lib/api-helpers/server-context.ts` | AsyncLocalStorage setup, getServerContext export |
| Factory error handling | `src/lib/api-helpers/create-handler-v2.ts` | withAuth/withPublic error catch, RecollectApiError handling |
| Error class | `src/lib/api-helpers/errors.ts` | `RecollectApiError.toLogContext()` — merged into ctx.fields |
