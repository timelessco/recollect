---
name: wide-event-enrichment
description: >
  Audit and fix wide event ctx.fields patterns in Recollect v2 API routes. Reads a route file,
  checks for getServerContext import, entity ID placement before DB operations, outcome flags
  after operations, PII compliance, console.* absence, and Sentry absence in after() blocks.
  Reports a pass/fail checklist and offers to fix gaps. Use when the user mentions wide events,
  ctx.fields, audit a route, check logging, event enrichment, Axiom fields, or after finishing
  a v2 route handler. Also use when reviewing any v2 API route for observability completeness.
  This is a POST-IMPLEMENTATION audit — load after writing the route, not before.
---

# Wide Event Enrichment Audit

Post-implementation audit for v2 API route `ctx.fields` patterns. Checks 8 requirements,
reports a checklist, and offers to fix gaps.

Read `references/patterns.md` for canonical examples and field naming conventions.
Cross-references: `.claude/rules/api-logging.md` (factory architecture), `.claude/rules/sentry.md` (error flow).

## Routing

| User says | Action |
|-----------|--------|
| "audit this route" / "check wide events" / "ctx.fields audit" | Phases 1-3 (audit + report) |
| "fix wide events" / "enrich this route" / "add missing fields" | Phases 1-4 (audit + fix) |
| "what fields should I add" | Show Route Type Guidance table |
| "PII check" / "is this logging PII" | Run Check 5 only |

## Phase 1: Discover

1. Accept file path argument, or if none: `Glob src/app/api/v2/**/route.ts` and ask which route
2. Read the route file
3. Classify:
   - **Factory**: `withAuth` | `withPublic` | `withSecret` (grep the import)
   - **Method**: `GET` | `POST` | `PATCH` | `PUT` | `DELETE` (grep the export)
   - **Has after()**: boolean (grep `after(async`)
   - **Route type**: read (GET) | mutation (POST/PATCH/PUT/DELETE) | file (imports storage/upload helpers) | queue (references `queue_name` or `processImageQueue`)

## Phase 2: Audit

Run all 8 checks against the route file. For each, determine PASS/FAIL/WARN/N/A.

### Check 1: `getServerContext` import

```
grep 'import.*getServerContext.*from.*server-context' <file>
```
- PASS: import exists
- FAIL: import missing — route has zero observability

### Check 2: Entity IDs BEFORE operations

Compare line numbers: first `ctx.fields.*_id` or `ctx.fields.user_id` assignment vs first
`supabase.from(` / `supabase.rpc(` / `fetch(` / `createApiClient(` call.

Entity ID fields: `user_id`, `bookmark_id`, `category_id`, `tag_id`, `shared_category_id`,
`queue_name`, `msg_id`, `url` (when it's the subject of the operation).

- PASS: at least one entity ID set before the first DB/API operation
- FAIL: all entity IDs set after operations, or no entity IDs at all
- WARN: entity IDs exist but some are set after operations (partial compliance)

Why this matters: if the handler throws mid-way, the Axiom wide event needs enough context
to identify WHAT was being attempted. Entity IDs set after the throw point are lost.

### Check 3: Outcome flags AFTER operations

Look for `ctx.fields.*` assignments that reflect results: booleans (`*_completed`, `*_deleted`,
`*_updated`, `*_sent`, `*_failed`, `found`), counts (`*_count`, `processed_count`,
`bookmarks_returned`), or detail fields (`content_type`, `provider`).

- PASS: at least one outcome field set after a DB/API operation
- FAIL: no outcome fields at all
- WARN: mutation route with only entity IDs (no outcome flag). GET routes may legitimately
  have minimal outcomes (just a count) — don't FAIL for this

### Check 4: Minimum 2 `ctx.fields` assignments

Count distinct `ctx.fields.FIELDNAME` assignments (not counting duplicates in different branches).

- PASS: 2 or more
- FAIL: fewer than 2 — minimum viable observability requires entity context + one outcome

### Check 5: No PII in `ctx.fields`

Scan for exact patterns (avoid false positives on `has_email`, `username_length`):
- `ctx.fields.email =` (not `has_email`)
- `ctx.fields.username =` (not `username_updated` or `username_length`)
- `ctx.fields.recipient_email`
- `ctx.fields.collaboration_email`
- `ctx.fields.password`
- `ctx.fields.token =` (not `has_token`)
- `ctx.fields.access_token`
- `ctx.fields.refresh_token`
- `ctx.fields.api_key =` (not `has_api_key`)

PII replacements:
| Raw PII | Safe alternative |
|---------|------------------|
| `email` | `has_email = Boolean(email)` |
| `username` | `username_length = username.length` |
| `recipient_email` | `recipient_count = emailList.length` |
| `collaboration_email` | `has_collaboration_email = Boolean(addr)` |
| `api_key` | `has_api_key = Boolean(apiKey)` |

- PASS: no raw PII fields found
- FAIL: any raw PII field found

### Check 6: No `console.*` calls

```
grep 'console\.\(log\|warn\|error\)(' <file>
```
- PASS: none found
- FAIL: found — v2 routes use structured Axiom logging only

### Check 7: No Sentry in `after()` blocks

```
grep 'Sentry' <file>
```
- PASS: no Sentry usage in the file (v2 factory handles Sentry via onRequestError)
- FAIL: Sentry found — replace with `logger.warn` pattern in after() catches
- N/A: route has no after() blocks AND no Sentry import

### Check 8: Error format in `logger.warn` calls

If the route has `logger.warn(` calls (typically in after() catch blocks):
- Check error field uses: `error instanceof Error ? error.message : String(error)`
- Check message format: `"[route-name] after() ..."` with route identifier prefix

- PASS: all logger.warn calls follow the pattern
- FAIL: logger.warn with raw error object or missing error formatting
- N/A: no logger.warn calls in the file

## Phase 3: Report

Present findings as a table:

```
## Wide Event Audit: {ROUTE}

Route type: {type} ({METHOD}) | Factory: {factory} | after(): {yes/no}

| # | Check | Status | Detail |
|---|-------|--------|--------|
| 1 | getServerContext import | PASS | Line 8 |
| 2 | Entity IDs before operations | PASS | user_id at L24, first DB op at L38 |
| 3 | Outcome flags after operations | PASS | deleted=true at L45 |
| 4 | Minimum 2 ctx.fields | PASS | 4 fields |
| 5 | No PII in ctx.fields | PASS | |
| 6 | No console.* calls | PASS | |
| 7 | No Sentry in after() | N/A | No after() blocks |
| 8 | Error format in logger.warn | N/A | No logger.warn calls |

Score: 6/6 passed, 2 N/A
```

If all checks pass: done. If any FAIL: proceed to Phase 4.

## Phase 4: Fix

For each FAIL, show the specific code to add with line numbers. Apply only after user confirms.

Fix templates:

**Missing import:**
```typescript
import { getServerContext } from "@/lib/api-helpers/server-context";
```

**Missing entity IDs (add right after destructuring input/auth, before first DB call):**
```typescript
const ctx = getServerContext();
if (ctx?.fields) {
  ctx.fields.user_id = userId;
  // add relevant entity IDs for this route
}
```

**Missing outcome flags (add after the main DB operation's success path):**
```typescript
if (ctx?.fields) {
  ctx.fields.operation_completed = true;
}
```

**PII violation:** Replace raw field with boolean signal (see Check 5 table).

**Console calls:** Delete or convert to `ctx.fields` assignment.

**Sentry in after():** Replace with:
```typescript
logger.warn("[route-name] after() enrichment failed", {
  bookmark_id: id,
  user_id: userId,
  error: error instanceof Error ? error.message : String(error),
});
```
Add `import { logger } from "@/lib/api-helpers/axiom";` if not present.

## Route Type Guidance

Expected fields by route type — use as a checklist when adding fields:

| Route Type | Entity IDs (before) | Outcome Flags (after) |
|------------|--------------------|-----------------------|
| GET read | `user_id` | count/result fields (`*_count`, `bookmarks_returned`, `found`) |
| POST create | `user_id`, input context (`url`, `category_id`) | `*_id` (after insert), `has_*` booleans |
| PATCH update | `user_id`, `*_id` (target entity) | `*_updated = true` |
| DELETE | `user_id`, `*_id` (target entity) | `deleted = true` |
| File upload | `user_id`, `file_type`, `file_name`, `category_id` | `bookmark_id` (after insert), `has_og_image` |
| Queue worker | `queue_name`, `msg_id`, `bookmark_id`, `url` | `processed_count`, `enrichment_*`, `*_failed` |
| Invite/share | `user_id`, `category_id` | `*_sent`, `*_accepted`, `role_updated` |

Complex routes with branching or multi-step pipelines should have MORE fields (one per
decision point or failure mode). Simple single-operation routes need fewer.
