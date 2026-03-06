# OpenAPI Endpoint Guide

How to add and update OpenAPI documentation for Recollect API endpoints.

**Architecture**: The spec is generated in two passes — (1) a filesystem scanner auto-infers schemas from handler factories, (2) a merge script overlays human-authored metadata from supplement files. See `.planning/phases/` for the full milestone history.

---

## Quick Reference (Agent Checklist)

### New App Router Endpoint

1. Create `src/app/api/<path>/route.ts` using a handler factory
2. Create `src/app/api/<path>/schema.ts` with `InputSchema` + `OutputSchema`
3. Create `src/lib/openapi/endpoints/<domain>/<endpoint-name>.ts` (supplement)
4. Export supplement from `src/lib/openapi/endpoints/<domain>/index.ts`
5. Run `npx tsx scripts/generate-openapi.ts`
6. Verify at `http://localhost:3000/api-docs`

### Update Existing Endpoint

1. Modify schema in `schema.ts` → auto-captured by scanner
2. Update supplement metadata/examples in `src/lib/openapi/endpoints/<domain>/`
3. Run `npx tsx scripts/generate-openapi.ts`
4. Verify at `http://localhost:3000/api-docs`

### New Edge Function Endpoint

1. Create registration function in `src/lib/openapi/endpoints/<domain>/edge-process-imports.ts`
2. Use `registry.registerPath()` with raw `SchemaObject` (not Zod)
3. Import and call from `scripts/generate-openapi.ts`
4. Run `npx tsx scripts/generate-openapi.ts`
5. Verify at `http://localhost:3000/api-docs`

---

## New App Router Endpoint: Step by Step

### 1. Create the route handler

Use one of the 4 handler factories from `src/lib/api-helpers/create-handler.ts`:

| Factory                        | Auth     | Method |
| ------------------------------ | -------- | ------ |
| `createGetApiHandlerWithAuth`  | Required | GET    |
| `createPostApiHandlerWithAuth` | Required | POST   |
| `createGetApiHandler`          | None     | GET    |
| `createPostApiHandler`         | None     | POST   |

```typescript
// src/app/api/bookmarks/check-url/route.ts
import { createGetApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { CheckUrlInputSchema, CheckUrlOutputSchema } from "./schema";

const ROUTE = "bookmarks-check-url";

export const GET = createGetApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: CheckUrlInputSchema,
	outputSchema: CheckUrlOutputSchema,
	handler: async ({ data, supabase, user, route }) => {
		// ... business logic
		return { exists: true as const, bookmarkId: "42" };
	},
});
```

The scanner reads `.config` from the exported `GET`/`POST` to infer schemas automatically.

### 2. Create the schema file

Colocate Zod schemas next to `route.ts`:

```typescript
// src/app/api/bookmarks/check-url/schema.ts
import { z } from "zod";

export const CheckUrlInputSchema = z.object({
	url: z.string(),
});

export const CheckUrlOutputSchema = z.discriminatedUnion("exists", [
	z.object({ exists: z.literal(true), bookmarkId: z.string() }),
	z.object({ exists: z.literal(false) }),
]);
```

### 3. Create the supplement file

Supplements provide metadata the scanner can't infer: tags, summary, description, examples.

```typescript
// src/lib/openapi/endpoints/bookmarks/check-url.ts
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";
import { bearerAuth } from "@/lib/openapi/registry";

export const checkUrlSupplement = {
	path: "/bookmarks/check-url",
	method: "get",
	tags: ["Bookmarks"],
	summary: "Check if a URL is already bookmarked",
	description:
		"Checks whether the authenticated user has already saved a given URL.",
	security: [{ [bearerAuth.name]: [] }, {}],
	responseExample: {
		data: { exists: true, bookmarkId: "42" },
		error: null,
	},
} satisfies EndpointSupplement;
```

**Important rules:**

- `path` must match the route path relative to `/api` (e.g., `/bookmarks/check-url` not `/api/bookmarks/check-url`)
- `method` is lowercase: `"get"` or `"post"`
- Tags are capitalized: `"Bookmarks"`, `"Categories"`, `"Twitter"`
- Security `[{ [bearerAuth.name]: [] }, {}]` — the empty `{}` means cookie auth also accepted
- Naming: export as `<camelCaseName>Supplement`

### 4. Export from barrel

Add the supplement to the domain's barrel file:

```typescript
// src/lib/openapi/endpoints/bookmarks/index.ts
export { checkUrlSupplement } from "./check-url";
// ... other exports
```

The merge script auto-discovers all supplements through these barrel imports.

### 5. Regenerate and verify

```bash
npx tsx scripts/generate-openapi.ts
```

Then open `http://localhost:3000/api-docs` and verify the endpoint appears with correct tags, description, and examples.

### Complete example: complex POST with 400 examples

For endpoints with multiple named examples, extract example data to a colocated `-examples.ts` file:

```typescript
// src/lib/openapi/endpoints/twitter/sync-examples.ts
export const twitterSyncRequestExamples = {
	"single-tweet": {
		summary: "Sync single tweet",
		description: "Sync a single Twitter/X bookmark.",
		value: {
			bookmarks: [{ url: "https://x.com/user/status/123", title: "Tweet" }],
		},
	},
} as const;

export const twitterSyncResponse400Examples = {
	"empty-bookmarks": {
		summary: "Empty bookmarks array",
		description: "Fails when bookmarks array has no elements.",
		value: {
			data: null,
			error: "bookmarks: Array must contain at least 1 element(s)",
		},
	},
} as const;
```

Then reference from the supplement:

```typescript
// src/lib/openapi/endpoints/twitter/sync.ts
import {
	twitterSyncRequestExamples,
	twitterSyncResponse400Examples,
} from "./sync-examples";

export const twitterSyncSupplement = {
	path: "/twitter/sync",
	method: "post",
	tags: ["Twitter"],
	summary: "Sync Twitter/X bookmarks",
	description: "Enqueues a batch of Twitter/X bookmarks for async archiving.",
	security: [{ [bearerAuth.name]: [] }, {}],
	requestExamples: twitterSyncRequestExamples,
	response400Examples: twitterSyncResponse400Examples,
	additionalResponses: {
		400: { description: "Invalid request body or bookmark data" },
	},
} satisfies EndpointSupplement;
```

**When to extract examples**: When the supplement file exceeds 250 lines.

---

## Updating an Existing Endpoint

### Schema changes

Modify the Zod schema in `schema.ts` — the scanner picks it up automatically on next regeneration.

```bash
npx tsx scripts/generate-openapi.ts
```

The GitHub Actions changelog workflow (`.github/workflows/openapi-changelog.yml`) runs `oasdiff` on every push to `dev` and appends field-level changes to `docs/API_CHANGELOG.md`.

### Updating supplement metadata

Edit the supplement file directly. Common updates:

- `summary` / `description` — improve wording
- `tags` — re-categorize
- `additionalResponses` — add new error status codes (e.g., 403, 404)

### Adding or updating examples

**Single example** (simple endpoints):

```typescript
responseExample: {
  data: { id: 1, name: "Example" },
  error: null,
},
```

**Named examples** (endpoints with multiple scenarios):

```typescript
responseExamples: {
  "happy-path": {
    summary: "Successful response",
    description: "Returns the created resource.",
    value: { data: { id: 1 }, error: null },
  },
  "duplicate-detected": {
    summary: "Duplicate skipped",
    description: "Returns skipped count when URL already bookmarked.",
    value: { data: { inserted: 0, skipped: 1 }, error: null },
  },
},
```

---

## Edge Function Endpoints

Edge functions (Deno) use a different pattern — manual `registerPath()` with raw `SchemaObject` instead of Zod.

### Existing edge functions

| Domain    | File                                                          | Function                              |
| --------- | ------------------------------------------------------------- | ------------------------------------- |
| Instagram | `src/lib/openapi/endpoints/instagram/edge-process-imports.ts` | `registerEdgeProcessInstagramImports` |
| Raindrop  | `src/lib/openapi/endpoints/raindrop/edge-process-imports.ts`  | `registerEdgeProcessRaindropImports`  |
| Twitter   | `src/lib/openapi/endpoints/twitter/edge-process-imports.ts`   | `registerEdgeProcessTwitterImports`   |

### Key differences from App Router

| Aspect        | App Router                   | Edge Function                                  |
| ------------- | ---------------------------- | ---------------------------------------------- |
| Schema format | Zod schemas                  | Raw `SchemaObject` (`type: "object" as const`) |
| Registration  | Auto-inferred from `.config` | Manual `registry.registerPath()`               |
| Auth          | `bearerAuth` (user JWT)      | `serviceRoleAuth` (service role key)           |
| Servers       | Default `/api`               | Per-path override via `edgeFunctionServers`    |
| Supplements   | Separate file                | Inline in `registerPath()`                     |

### Registration pattern

```typescript
// src/lib/openapi/endpoints/<domain>/edge-process-imports.ts
import { edgeFunctionServers } from "../edge-function-servers";
import { registry, serviceRoleAuth } from "@/lib/openapi/registry";

export function registerEdgeProcess<Domain>Imports() {
  // GET — health check (no auth)
  registry.registerPath({
    method: "get",
    path: "/process-<domain>-imports",
    servers: edgeFunctionServers,
    tags: ["<Domain>"],
    security: [],
    summary: "Health check for <domain> import worker",
    description: "Returns the worker status. No authentication required.\n\n**Note:** This endpoint runs as a Supabase Edge Function, not under `/api`.",
    responses: {
      200: {
        description: "Worker is healthy",
        content: {
          "application/json": {
            schema: {
              type: "object" as const,
              properties: {
                status: { type: "string" as const },
                queue: { type: "string" as const },
              },
              required: ["status", "queue"],
            },
          },
        },
      },
    },
  });

  // POST — process queue (service role auth)
  registry.registerPath({
    method: "post",
    path: "/process-<domain>-imports",
    servers: edgeFunctionServers,
    tags: ["<Domain>"],
    summary: "Process <domain> import queue",
    security: [{ [serviceRoleAuth.name]: [] }],
    request: { /* ... */ },
    responses: {
      200: {
        description: "Queue processed",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/WorkerResponse" },
          },
        },
      },
      401: { $ref: "#/components/responses/Unauthorized" },
      500: { $ref: "#/components/responses/InternalError" },
    },
  });
}
```

### Wiring into the generator

After creating the registration function, import and call it in `scripts/generate-openapi.ts`:

```typescript
const { registerEdgeProcess<Domain>Imports } =
  await import("../src/lib/openapi/endpoints/<domain>/edge-process-imports");
registerEdgeProcess<Domain>Imports();
```

---

## Supplement Reference

### EndpointSupplement fields

| Field                 | Type                              | Required | Description                              |
| --------------------- | --------------------------------- | -------- | ---------------------------------------- |
| `path`                | `string`                          | Yes      | Route path relative to `/api`            |
| `method`              | `string`                          | Yes      | `"get"` or `"post"` (lowercase)          |
| `tags`                | `string[]`                        | No       | Scalar sidebar grouping                  |
| `summary`             | `string`                          | No       | Short heading (one line)                 |
| `description`         | `string`                          | No       | Detailed explanation (supports markdown) |
| `security`            | `Array<Record<string, string[]>>` | No       | Auth requirements                        |
| `requestExample`      | `Record<string, unknown>`         | No       | Single request example                   |
| `requestExamples`     | Named examples object             | No       | Multiple request examples                |
| `responseExample`     | `Record<string, unknown>`         | No       | Single 200 response example              |
| `responseExamples`    | Named examples object             | No       | Multiple 200 response examples           |
| `response400Example`  | `Record<string, unknown>`         | No       | Single 400 response example              |
| `response400Examples` | Named examples object             | No       | Multiple 400 response examples           |
| `additionalResponses` | `Record<number, { description }>` | No       | Extra response codes (400, 403, 404)     |

### Naming conventions

- **Export name**: `<camelCaseName>Supplement` (e.g., `checkUrlSupplement`)
- **Example keys**: kebab-case (`"single-tweet"`, `"validation-error"`)
- **Example files**: `<endpoint-name>-examples.ts` (e.g., `sync-examples.ts`)
- **Tags**: Capitalized (`"Bookmarks"`, `"Categories"`, `"iPhone"`)

### Named example format

Every named example must have both `summary` and `description`:

```typescript
"example-key": {
  summary: "Short title for dropdown",          // Required
  description: "What this example demonstrates", // Required
  value: { /* the actual payload */ },
}
```

**Ordering**: Happy paths first, then validation errors.

### additionalResponses

Override the default 400 response description (set by the `ValidationError` component):

```typescript
additionalResponses: {
  400: { description: "Invalid domain format" },
  // Can also add: 403, 404, 409, etc.
},
```

The merge script resolves the scanner's `$ref` response inline and overrides the description while preserving the error schema.

---

## Agent Prompt Templates

### Create supplement for a new endpoint

> I just created a new App Router endpoint at `src/app/api/<path>/route.ts` with schema at `src/app/api/<path>/schema.ts`. Create the OpenAPI supplement file, export it from the barrel, regenerate the spec, and verify at `/api-docs`.
>
> Domain: `<bookmarks|categories|tags|twitter|instagram|raindrop|profiles|iphone>`
> Tag: `"<Tag>"`

### Update examples for an existing endpoint

> Update the OpenAPI examples for the `<endpoint-name>` endpoint. Read the current supplement at `src/lib/openapi/endpoints/<domain>/<endpoint-name>.ts`, add named examples for these scenarios: [describe scenarios]. Regenerate the spec and verify.

### Add 400 error examples

> Add `response400Examples` to the `<endpoint-name>` supplement. Include examples for: [list validation errors]. Also add `additionalResponses: { 400: { description: "<custom description>" } }`. Regenerate and verify.

### Document a new edge function

> I created a new Supabase Edge Function at `supabase/functions/<name>/`. Register it in the OpenAPI spec following the pattern in `src/lib/openapi/endpoints/instagram/edge-process-imports.ts`. Use `serviceRoleAuth`, `edgeFunctionServers`, and raw `SchemaObject`. Wire it into `scripts/generate-openapi.ts`.

---

## Troubleshooting

### Supplement not appearing in spec

1. Is the supplement exported from the domain's `index.ts` barrel?
2. Does `path` match the route path exactly (relative to `/api`, no trailing slash)?
3. Does `method` match the exported handler (`"get"` for `GET`, `"post"` for `POST`)?
4. Check the console output — `mergeSupplements` prints warnings for unmatched supplements

### 400 examples not showing

1. Does the supplement have `additionalResponses: { 400: { description: "..." } }`?
2. Are named examples using the `response400Examples` field (not `responseExamples`)?
3. The merge script initializes 400 content automatically when examples are provided

### Common mistakes

- Using `/api/bookmarks/check-url` instead of `/bookmarks/check-url` for the path
- Forgetting to add `as const` on example data objects in `-examples.ts` files
- Using `responseExample` (singular) when you need `responseExamples` (named/plural)
- Missing `summary` or `description` on named examples — both are required
