---
name: openapi-endpoints
description: >
  End-to-end OpenAPI endpoint documentation lab for Recollect. Autonomously discovers route
  handlers, audits Zod schemas for .meta() descriptions, creates supplement files, updates
  barrel exports, regenerates the spec, and verifies in both the JSON output and the Scalar
  UI at /api-docs. This is an EXECUTION skill — it runs the full workflow without needing
  context from the caller. Use when creating new App Router endpoints, adding OpenAPI docs
  to existing endpoints, updating endpoint schemas, writing supplement files, adding named
  examples, or registering edge function endpoints. Also use when someone says "document this
  endpoint", "add OpenAPI", "create supplement", "add to api-docs", or mentions any endpoint
  that needs OpenAPI documentation — even if they don't say "OpenAPI" explicitly.
disable-model-invocation: true
---

# OpenAPI Endpoint Documentation Lab

This skill runs an end-to-end lab: discover → audit schemas → create supplement → verify.
Execute all 6 phases autonomously. The spec is generated in two passes: (1) a filesystem
scanner auto-infers schemas from handler factories, (2) a merge script overlays human-authored
metadata from supplement files.

## Execution Loop

```
Phase 1    Phase 2       Phase 3        Phase 4    Phase 5      Phase 6
DISCOVER → SCHEMA AUDIT → SUPPLEMENT → BARREL → VERIFY SPEC → VERIFY UI
    ↑                                                              |
    └──────────── fix and retry if any verification fails ─────────┘
```

---

## Phase 1 — Discover

Gather all context autonomously. Never ask the caller for file paths.

### Find the route handler

```
Glob src/app/api/**/<endpoint-name>/route.ts
```

Read it. Identify:
- **Factory**: which factory is used?
  - **v1** (from `src/lib/api-helpers/create-handler.ts`): `createGetApiHandlerWithAuth` / `createPostApiHandlerWithAuth` (auth required), `createGetApiHandler` / `createPostApiHandler` (no auth)
  - **v2** (from `src/lib/api-helpers/create-handler-v2.ts`): `withAuth` (auth required), `withPublic` (no auth), always wrapped as `createAxiomRouteHandler(withAuth/withPublic({...}))`. Handler `.config` has `{ auth, contract: "v2", factoryName: "withAuth"|"withPublic", inputSchema, outputSchema, route }`
  - If route imports from `create-handler-v2.ts`, note it as **v2** — this affects response example format (see Phase 3)
- **Method**: GET or POST (from the factory name and the export: `export const GET` or `export const POST`)
- **ROUTE constant**: the kebab-case identifier (used for Sentry, not the URL path)
- **Schemas**: inline `InputSchema`/`OutputSchema`, or imported from `./schema`

### Find the schema

Check for colocated `schema.ts` first:
```
Glob src/app/api/**/<endpoint-name>/schema.ts
```

If no `schema.ts` exists, schemas are inline in `route.ts`. Note this for Phase 2.

### Find the domain barrel

The domain is the first path segment after `/api/` (e.g., `instagram`, `profiles`, `twitter`):
```
Read src/lib/openapi/endpoints/<domain>/index.ts
```

### Read a sibling supplement for pattern reference

Pick any existing supplement in the same domain directory:
```
Glob src/lib/openapi/endpoints/<domain>/*.ts
```

Read one (not `index.ts`, not `*-examples.ts`, not `edge-process-imports.ts`). This shows the exact pattern to follow — tags, security, example format.

### Determine naming

- **Export name**: `<camelCaseDomainAndEndpoint>Supplement` (e.g., `instagramLastSyncedIdSupplement`)
- **File name**: `<endpoint-name>.ts` matching the route directory name
- **Path**: `/<domain>/<endpoint-name>` (relative to `/api`, no `/api` prefix, no trailing slash)
- **Tags**: capitalized domain name matching siblings (e.g., `["Instagram"]`, `["Profiles"]`)

---

## Phase 2 — Schema Audit & Fix

Every Zod schema field must have `.meta({ description: "..." })`. This maps directly to field
descriptions in the generated OpenAPI spec via `@asteasolutions/zod-to-openapi`. Without it,
fields appear in the spec with no description — bad developer experience.

### Check all fields

Read the schema (from `schema.ts` or inline in `route.ts`). For every field in both
InputSchema and OutputSchema, check for `.meta({ description: "..." })`.

### Add missing `.meta()`

For any field without `.meta()`, add it:

```typescript
// Before
z.string()

// After
z.string().meta({ description: "The ID of the last synced Instagram bookmark" })
```

For nested objects and arrays:
```typescript
z.array(z.int()).meta({ description: "Updated ordered list of favorite category IDs" })
z.object({
  id: z.string().meta({ description: "Tag identifier" }),
  name: z.string().meta({ description: "Tag display name" }),
}).meta({ description: "The newly created tag" })
```

### Extract inline schemas to `schema.ts` if needed

If schemas are defined inline in `route.ts` and don't already have a `schema.ts` file, extract
them to a colocated `schema.ts`. Follow this pattern:

```typescript
// src/app/api/<domain>/<endpoint>/schema.ts
import { z } from "zod";

export const <PascalCase>InputSchema = z.object({
  field: z.string().meta({ description: "Field description" }),
});

export const <PascalCase>OutputSchema = z.object({
  field: z.string().meta({ description: "Field description" }),
});
```

Then update `route.ts` to import from `./schema` instead of defining inline.

### Reference examples for `.meta()` style

Read these files for well-documented schema patterns:
- `src/app/api/category/delete-user-category/schema.ts` — 11-field response, boolean default
- `src/app/api/tags/create-and-assign-tag/schema.ts` — nested sub-schemas with independent `.meta()`
- `src/app/api/bookmark/fetch-discoverable-by-id/schema.ts` — deeply nested with `MetadataSchema`

---

## Phase 3 — Create Supplement

### Template

Use this template. Fill in applicable fields, delete inapplicable ones:

```typescript
/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";
import { bearerAuth } from "@/lib/openapi/registry";

export const <camelCaseName>Supplement = {
	path: "/<domain>/<endpoint-name>",
	method: "<get|post>",
	tags: ["<Domain>"],
	summary: "<One-line summary for Scalar heading>",
	description: "<Detailed explanation. Supports markdown.>",
	security: [{ [bearerAuth.name]: [] }, {}],
	// --- Request examples (POST only) ---
	// Single: requestExample: { field: "value" },
	// Named:  requestExamples: { "key": { summary, description, value } },
	// --- Response examples ---
	// Single: responseExample: { data: { ... }, error: null },
	// Named:  responseExamples: { "key": { summary, description, value } },
	// --- Error examples ---
	// response400Examples: { "key": { summary, description, value: { data: null, error: "..." } } },
	// --- Additional response codes ---
	// additionalResponses: { 400: { description: "..." } },
	// --- Parameter examples (GET only) ---
	// parameterExamples: { paramName: { "key": { summary, description, value } } },
} satisfies EndpointSupplement;
```

### Rules

- `path` relative to `/api` — NOT `/api/bookmarks/check-url`, just `/bookmarks/check-url`
- `method` lowercase: `"get"` or `"post"`
- Tags capitalized: `"Bookmarks"`, `"Categories"`, `"Twitter"`, `"iPhone"`
- Security: `[{ [bearerAuth.name]: [] }, {}]` — `{}` means cookie auth also accepted
- No-auth endpoints: `security: []`
- Export name: `<camelCaseName>Supplement`
- File header: `/** @module Build-time only */`
- Use realistic example data (actual IDs, realistic strings — not "test-123")
- **v1 routes**: Response examples must include the `{ data: ..., error: null }` wrapper
  - e.g., `responseExample: { data: { hasApiKey: true }, error: null }`
- **v2 routes**: Response examples use bare values — no `{data, error}` envelope
  - e.g., `responseExample: { hasApiKey: true }` (or `value: { hasApiKey: true } as const` in named examples)
- Named example keys: kebab-case, both `summary` and `description` required
- When supplement exceeds 250 lines, extract examples to `<endpoint-name>-examples.ts` with `as const`

### Choosing single vs named examples

| Scenario | Use |
|----------|-----|
| One obvious happy path | `responseExample` (singular) |
| Multiple success scenarios | `responseExamples` (named, creates dropdown in Scalar) |
| Endpoint can return validation errors | Add `response400Examples` + `additionalResponses: { 400 }` |
| GET with query params | Add `parameterExamples` (creates dropdown per param in "Try It") |

---

## Phase 4 — Barrel Export

Read the domain barrel at `src/lib/openapi/endpoints/<domain>/index.ts`. Add the new export
in **alphabetical order** among existing exports:

```typescript
export { <camelCaseName>Supplement } from "./<endpoint-name>";
```

The `collectSupplements()` function in the merge script auto-discovers any export with `path`
and `method` properties from these barrels — no registration needed beyond the barrel export.

---

## Phase 5 — Verify (Script-Based)

This phase does NOT require a running dev server. These are all build-time operations.

### 5a. Regenerate the spec

```bash
npx tsx scripts/generate-openapi.ts
```

Check the output line: `Supplements applied: X/Y`. Verify X increased by 1 compared to before.
If X < Y, a supplement path or method doesn't match — check Phase 3 rules.

### 5b. Verify in JSON

```bash
cat public/openapi.json | jq '.paths["/<domain>/<endpoint-name>"].<method> | {summary, tags, description}'
```

All three fields should be non-null and match what you wrote in the supplement.

### 5c. Auto-fix formatting

```bash
pnpm fix
```

### 5d. Type check

```bash
pnpm lint:types
```

If either fails, fix and re-run from 5a.

---

## Phase 6 — Verify (Browser-Based)

### 6a. Ensure dev server is running

```bash
lsof -i :3000
```

If no process on port 3000, start the dev server:

```bash
pnpm dev &
```

Wait for it to be ready (check with `curl -s http://localhost:3000 > /dev/null`).

### 6b. Check Scalar UI

Use Chrome MCP to navigate to `http://localhost:3000/api-docs`. Search or scroll to find the
endpoint under its tag group. Confirm:
- Endpoint appears with correct summary
- Tag grouping matches (e.g., under "Instagram")
- Examples render in the "Try It" panel
- Field descriptions from `.meta()` appear in the schema viewer

If the endpoint doesn't appear, re-run Phase 5a and check for merge warnings.

---

## Updating an Existing Endpoint

For updates, start at Phase 2 (schema audit) and run through Phase 6. Common updates:

### Schema changes
Modify Zod schema in `schema.ts` — scanner picks it up automatically. Ensure all new fields
have `.meta({ description })`.

### Adding/updating examples
Edit the supplement file. Use named examples for multiple scenarios.

### Adding error examples
Add `response400Examples` and `additionalResponses: { 400: { description } }`.

---

## Supplement Reference

### EndpointSupplement fields

| Field                 | Type                              | When to use                                       |
| --------------------- | --------------------------------- | ------------------------------------------------- |
| `path`                | `string`                          | Always (required)                                 |
| `method`              | `string`                          | Always (required)                                 |
| `tags`                | `string[]`                        | Always — groups endpoint in Scalar sidebar         |
| `summary`             | `string`                          | Always — one-line heading                          |
| `description`         | `string`                          | Always — detailed explanation, supports markdown   |
| `security`            | `Array<Record<string, string[]>>` | Always — auth requirements                         |
| `requestExample`      | `Record<string, unknown>`         | POST with one obvious request body                 |
| `requestExamples`     | Named examples                    | POST with multiple request scenarios               |
| `responseExample`     | `Record<string, unknown>`         | One obvious success response                       |
| `responseExamples`    | Named examples                    | Multiple success scenarios (dropdown in Scalar)    |
| `response400Example`  | `Record<string, unknown>`         | One obvious validation error                       |
| `response400Examples` | Named examples                    | Multiple validation error scenarios                |
| `additionalResponses` | `Record<number, { description }>` | Custom descriptions for 400/403/404/409/500        |
| `parameterExamples`   | `Record<string, NamedExamples>`   | GET endpoints with query params (dropdown per param) |

### Response components (auto-registered by scanner)

- `ValidationError` (400) — `{ data: null, error: string }`
- `Unauthorized` (401) — `{ data: null, error: "Not authenticated" }`
- `InternalError` (500) — `{ data: null, error: "Failed to process request" }`

`additionalResponses` overrides the 400 description while preserving the schema.

### Naming conventions

- Export: `<camelCaseName>Supplement` (e.g., `checkUrlSupplement`)
- Example keys: kebab-case (`"single-tweet"`, `"validation-error"`)
- Example files: `<endpoint-name>-examples.ts` (use `as const`)
- Tags: capitalized (`"Bookmarks"`, `"iPhone"`)
- Named examples require both `summary` and `description`

---

## Edge Functions

Edge functions use a different workflow (manual `registerPath()` with raw `SchemaObject`).
See [reference.md](reference.md) for the complete pattern.

---

## Troubleshooting

### Supplement not appearing in spec
1. Exported from domain `index.ts` barrel?
2. `path` matches route exactly (relative to `/api`, no trailing slash)?
3. `method` matches handler export (`"get"` for `GET`, `"post"` for `POST`)?
4. Check console — `mergeSupplements` prints warnings for unmatched supplements

### 400 examples not showing
1. Has `additionalResponses: { 400: { description } }`?
2. Using `response400Examples` (not `responseExamples`)?

### Common mistakes
- `/api/bookmarks/check-url` instead of `/bookmarks/check-url`
- Forgetting `as const` on example data in `-examples.ts` files
- `responseExample` (singular) when you need `responseExamples` (named)
- Missing `summary` or `description` on named examples
- Forgetting `.meta({ description })` on schema fields — run Phase 2 again
