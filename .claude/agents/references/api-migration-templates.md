# API Migration Templates

Code templates and summary format for the `recollect-api-migrator` agent. Read in Step 2 (code gen) and Step 6 (output).

All templates are v2 (bare-response, `RecollectApiError`, Axiom wide events). For v1 / envelope patterns see `.claude/rules/api-v1.md`.

---

## Route Handler Templates

### `withAuth` — authenticated (most routes)

```typescript
import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";

import { MyInputSchema, MyOutputSchema } from "./schema";

const ROUTE = "v2-<domain>-<endpoint>";

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = user.id;
      }

      const { data: rows, error: dbError } = await supabase
        .from("<table>")
        .select("*")
        .eq("user_id", user.id);

      if (dbError) {
        throw new RecollectApiError("service_unavailable", {
          cause: dbError,
          message: "Failed to fetch rows",
          operation: "<snake_case_op>",
        });
      }

      if (ctx?.fields) {
        ctx.fields.result_count = rows.length;
      }

      return rows;
    },
    inputSchema: MyInputSchema,
    outputSchema: MyOutputSchema,
    route: ROUTE,
  }),
);
```

### `withPublic` — no auth (including v1 routes that manually called `createApiClient()` inside)

```typescript
import { createAxiomRouteHandler, withPublic } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";

import { MyInputSchema, MyOutputSchema } from "./schema";

const ROUTE = "v2-<domain>-<endpoint>";

export const GET = createAxiomRouteHandler(
  withPublic({
    handler: async ({ input }) => {
      // Handler receives `input` (not `data`). If service-role access is needed,
      // create it inline: const supabase = createServerServiceClient();
      return result;
    },
    inputSchema: MyInputSchema,
    outputSchema: MyOutputSchema,
    route: ROUTE,
  }),
);
```

### `withSecret` — CRON_SECRET / service-role token

```typescript
import { createAxiomRouteHandler, withSecret } from "@/lib/api-helpers/create-handler-v2";

import { MyInputSchema, MyOutputSchema } from "./schema";

const ROUTE = "v2-<domain>-<endpoint>";

export const POST = createAxiomRouteHandler(
  withSecret({
    handler: async ({ input }) => {
      // Secret token already verified by the factory via timingSafeEqual.
      // No supabase client — create one if needed:
      // const supabase = createServerServiceClient();
      return result;
    },
    inputSchema: MyInputSchema,
    outputSchema: MyOutputSchema,
    route: ROUTE,
    secretEnvVar: "<ENV_VAR_NAME>",
  }),
);
```

### `withRawBody` — multipart, queue consumers, FormData, SSE

```typescript
import { NextResponse, type NextRequest } from "next/server";

import { createAxiomRouteHandler, withRawBody } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";

import { MyInputSchema, MyOutputSchema } from "./schema";

const ROUTE = "v2-<domain>-<endpoint>";

export const POST = createAxiomRouteHandler(
  withRawBody({
    auth: "required", // OpenAPI metadata only — handler enforces auth itself
    handler: async ({ request }) => {
      // Inline auth / multipart / SSE / queue handling.
      // Always return NextResponse directly.
      return NextResponse.json(result);
    },
    inputSchema: MyInputSchema,
    outputSchema: MyOutputSchema,
    route: ROUTE,
  }),
);
```

### Binary response (inside `withAuth` / `withPublic`)

```typescript
return new NextResponse(buffer, {
  headers: { "Content-Type": "application/pdf" },
});
```

The factory detects `instanceof NextResponse` and passes through without JSON wrapping. No `withRawBody` needed unless the *input* is non-JSON.

---

## Schema Template (`schema.ts`)

```typescript
import { z } from "zod";

export const MyInputSchema = z.object({
  category_id: z.int().min(0).meta({
    description: "Category identifier. 0 = Uncategorized.",
  }),
});

export const MyOutputSchema = z.object({
  id: z.string().meta({ description: "Row identifier" }),
  favorite_categories: z.array(z.int()).meta({
    description: "Ordered list of favorite category IDs",
  }),
});
```

Rules:

- Every field has `.meta({ description: "..." })` — flows to OpenAPI spec + Scalar UI.
- `z.int()` over `z.number().int()` for inputs.
- For *output* schemas on fields that also appear in a sibling read endpoint's output, **match the sibling exactly** — same field set, same `z.int()` vs `z.number()` choice. `z.int()` adds a `Number.isInteger()` refinement that will 500 if a sibling read schema uses `z.number()`. See pitfall 19.
- `z.string()` for timestamps (Supabase `timestamptz` uses `+00:00`, not `Z`). Only use `z.iso.datetime()` for input schemas where the client sends `Z`-suffix.
- Empty input: `z.object({})`.
- Nullability mirrors the DB `Row` type from `src/types/database-generated.types.ts` exactly — `string | null` → `z.string().nullable()`.
- For `select("*")` endpoints, the output must match the `Row` type column-by-column. Reuse the sibling GET's output schema verbatim when migrating a write endpoint that returns the full record.
- `category_id` inputs use `.min(0)`.
- `z.email()` for emails, `z.uuid()` for UUIDs, `z.url()` for URLs.
- Never `z.looseObject` — infers `{ [x: string]: unknown }`, incompatible with Supabase `Json`. Use `z.object`.

---

## OpenAPI Supplement Template

File: `src/lib/openapi/endpoints/<domain>/v2-<kebab-name>.ts`

```typescript
/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const v2<CamelName>Supplement = {
  additionalResponses: {
    401: { description: "Not authenticated" },
    404: { description: "Row not found" },
    503: { description: "Database error" },
  },
  description:
    "Plain-English description of what the endpoint does, including idempotency and edge cases.",
  method: "post",
  path: "/v2/<domain>/<kebab-name>",
  requestExamples: {
    "happy-path": {
      description: "Send the shown body — toggles category 42 into favorites.",
      summary: "Toggle category into favorites",
      value: { category_id: 42 },
    },
  },
  response400Examples: {
    "missing-field": {
      description: "Omit `category_id` — returns 400 with the Zod error message.",
      summary: "Missing category_id",
      value: { error: "Required" },
    },
  },
  responseExamples: {
    "toggled-in": {
      description:
        "Full updated profile row after toggling category 42 into favorites.",
      summary: "Category toggled into favorites",
      value: {
        favorite_categories: [361, 547, 42],
        id: "550e8400-e29b-41d4-a716-446655440000",
      },
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}], // public endpoints: security: []
  summary: "Short title-case summary",
  tags: ["Profiles"],
} satisfies EndpointSupplement;
```

Barrel export in `src/lib/openapi/endpoints/<domain>/index.ts`:

```typescript
export { v2<CamelName>Supplement } from "./v2-<kebab-name>";
```

Rules:

- Kebab-case example keys.
- Every example has both `summary` and `description` — both required by `EndpointSupplement`.
- `description` tells the developer exactly how to reproduce in Scalar (click-to-test phrasing).
- Placeholders only — no real PII. Use `user@example.com`, `550e8400-e29b-41d4-a716-446655440000`.
- Timestamp placeholders use `+00:00` offset (e.g. `"2024-03-15T10:30:00+00:00"`), not `Z`.
- Bare response shape (no `{ data, error }` envelope) — success values are bare `T`, error values are `{ error: "..." }`.
- Public endpoints: `security: []` (empty array) to prevent inheriting global security.
- Method (`"get"` / `"post"` / `"patch"` / `"put"` / `"delete"`) is lowercase.
- Tags use Title Case and must match an existing tag name already in the spec (e.g. `"Bookmarks"`, `"Profiles"`, `"Categories"`).

---

## V2 URL Constant

Append to `src/utils/constants.ts`:

```typescript
export const V2_<SCREAMING_NAME>_API = "v2/<domain>/<kebab-name>";
```

No leading slash — the `api` ky instance in `src/lib/api-helpers/api-v2.ts` prefixes `/api`.

---

## Caller Repoint Template

```typescript
// Before (v1)
import { postApi } from "@/lib/api-helpers/api";
import { TOGGLE_FAVORITE_CATEGORY_API } from "@/utils/constants";

const { data, error } = await postApi<Response>(TOGGLE_FAVORITE_CATEGORY_API, payload);
if (error) { /* handle */ }

// After (v2)
import { api } from "@/lib/api-helpers/api-v2";
import { V2_TOGGLE_FAVORITE_CATEGORY_API } from "@/utils/constants";

try {
  const data = await api
    .post(V2_TOGGLE_FAVORITE_CATEGORY_API, { json: payload })
    .json<Response>();
  // use data directly — already bare T, no `.data` unwrap
} catch (error) {
  // error is ky's HTTPError — response body shape is { error: string }
}
```

GET with query params: `api.get(URL, { searchParams }).json<T>()`.

Scope: only repoint callers that fetch the exact path being migrated. Every other caller stays untouched.

---

## v1 Deprecation (JSDoc-only hunk)

Directly above the `export const GET` / `POST` in the v1 file:

```typescript
/**
 * @deprecated Use /api/v2/<same-path> instead. Retained for iOS and extension clients.
 */
export const POST = createPostApiHandlerWithAuth({ ... });
```

No other edit to the v1 file. `git diff` must show only the JSDoc hunk.

---

## Summary File Template

File: `~/.claude/session-documents/v2-migration-<endpoint-name>.md`

The `<endpoint-name>` is the leaf segment of the v2 route path (`/api/v2/profiles/toggle-favorite-category` → `toggle-favorite-category`, so the summary lands at `~/.claude/session-documents/v2-migration-toggle-favorite-category.md`).

````markdown
---
route: v2-<domain>-<endpoint-name>
status: complete
completed: YYYY-MM-DD
---

## What was migrated

- Source: `src/app/api/<path>/route.ts` (v1)
- Target: `src/app/api/v2/<same-path>/route.ts` (v2)
- Factory: `withAuth` | `withPublic` | `withSecret` | `withRawBody`
- HTTP Method: GET | POST | PATCH | PUT | DELETE

## Files

### Created
- `src/app/api/v2/<path>/route.ts`
- `src/app/api/v2/<path>/schema.ts`
- `src/lib/openapi/endpoints/<domain>/v2-<name>.ts`

### Modified
- `src/lib/openapi/endpoints/<domain>/index.ts` — barrel export
- `src/utils/constants.ts` — `V2_<NAME>_API`
- `src/app/api/<path>/route.ts` — `@deprecated` JSDoc only
- `<caller-file>` — repointed to v2 URL + `api` ky instance

## Decisions
- <Non-obvious schema or logic choices with rationale>

## Deviations
None — migration executed as specified.
<Or: description of what diverged and why>

## Verification

### Static
| Check | Result |
|---|---|
| `npx tsx scripts/generate-openapi.ts` | Pass — N supplements applied |
| `npx tsx scripts/merge-openapi-supplements.ts` | Pass — 1 new merged path |
| `pnpm lint` | Pass |
| `pnpm lint:knip` | Pass |
| `pnpm build` | Pass |

### E2E (`/recollect-api-tester`)
| # | Case | v1 Status | v2 Status | Match | Notes |
|---|---|---|---|---|---|
| 1 | Happy path | 200 | 200 | ✓ | v1 `.data` equals v2 bare body |
| 2 | Auth boundary | 401 | 401 | ✓ | |
| 3 | Validation error | 400 | 400 | ✓ | |
| ... | ... | ... | ... | ... | ... |

### Post-implementation audit (`/v2-route-audit`)
| # | Check | Status | Detail |
|---|---|---|---|
| 1 | getServerContext import | PASS | |
| 2 | Entity IDs before operations | PASS | |
| 3 | Outcome flags after operations | PASS | |
| 4 | Minimum 2 ctx.fields | PASS | |
| 5 | No PII in ctx.fields | PASS | |
| 6 | No console.* calls | PASS | |
| 7 | No Sentry in after() | PASS/N/A | |
| 8 | Error format in logger.warn | PASS/N/A | |
| 9 | Error cause propagation | PASS | |
| 10 | No raw throw new Error() | PASS | |

### Named examples
| # | Key | Type | Source case |
|---|---|---|---|
| 1 | `happy-path` | request | Case 1 |
| 2 | `toggled-in` | 200 | Case 1 |
| ... | ... | ... | ... |

## Pitfalls discovered
None new.
<Or: short description — also appended to `api-migration-pitfalls.md`>

## Self-check: PASSED
````
