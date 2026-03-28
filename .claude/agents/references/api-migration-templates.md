# API Migration Templates

Code templates and SUMMARY format for the `recollect-api-migrator` agent. Read this file in Step 2 (code gen) and Step 6 (output).

---

## Route Handler Templates

**Standard factory route (`route.ts`):**

```typescript
import { createGetApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { MyInputSchema, MyOutputSchema } from "./schema";

const ROUTE = "v2-domain-endpoint-name";

export const GET = createGetApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: MyInputSchema,
	outputSchema: MyOutputSchema,
	handler: async ({ data, supabase, user }) => {
		// business logic
		return result;
	},
});
```

**Schema file (`schema.ts`):**

```typescript
import { z } from "zod";

export const MyInputSchema = z.object({
	id: z.string(),
});

export const MyOutputSchema = z.object({
	id: z.string(),
	created_at: z.string(), // NOT z.iso.datetime() — Supabase returns +00:00 offset
});
```

**`ROUTE` naming:** `"v2-<domain>-<endpoint>"` in kebab-case.

**Secret-token POST handler template (`route.ts`):**

```typescript
import { createPostApiHandlerWithSecret } from "@/lib/api-helpers/create-handler";
import { MyInputSchema, MyOutputSchema } from "./schema";

const ROUTE = "v2-domain-endpoint";

export const POST = createPostApiHandlerWithSecret({
	route: ROUTE,
	inputSchema: MyInputSchema,
	outputSchema: MyOutputSchema,
	secretEnvVar: "MY_SECRET_TOKEN",
	handler: async ({ input, route }) => {
		// No supabase client provided — create service client if needed
		// const supabase = createServiceClient();
		return result;
	},
});
```

**Binary response template (factory with NextResponse passthrough):**

```typescript
import { NextResponse } from "next/server";
import { createGetApiHandler } from "@/lib/api-helpers/create-handler";
import { InputSchema, OutputSchema } from "./schema";

const ROUTE = "v2-domain-endpoint";

export const GET = createGetApiHandler({
	route: ROUTE,
	inputSchema: InputSchema,
	outputSchema: OutputSchema,
	handler: async ({ input }) => {
		const buffer = await result.arrayBuffer();
		// Return NextResponse (not Response) — factory passes it through unchanged
		return new NextResponse(buffer, {
			headers: { "Content-Type": "application/pdf" },
		});
	},
});
```

Factory handles input validation and error wrapping. Handler returns `NextResponse` for binary data — factory detects `instanceof NextResponse` and passes through without JSON wrapping.

**Object.assign template (for routes that genuinely can't use a factory, e.g., multipart, SSE streaming):**

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { type HandlerConfig } from "@/lib/api-helpers/create-handler";
import { InputSchema, OutputSchema } from "./schema";

const ROUTE = "v2-domain-endpoint";

async function handlePost(request: NextRequest) {
	// Custom auth / business logic
	return NextResponse.json({ data: result, error: null });
}

export const POST = Object.assign(handlePost, {
	config: {
		factoryName: "createPostApiHandler",
		inputSchema: InputSchema,
		outputSchema: OutputSchema,
		route: ROUTE,
	} satisfies HandlerConfig,
});
```

**v2 factory route template (`route.ts`):**

```typescript
import { createGetApiHandlerV2WithAuth } from "@/lib/api-helpers/create-handler-v2";
export const GET = createGetApiHandlerV2WithAuth({
  handler: async ({ error, route, supabase, user }) => {
    // ... business logic ...
    if (dbError) return error({ cause: dbError, message: "...", operation: "..." });
    return result;
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  route: "v2-route-name",
});
```

---

## SUMMARY.md Template

Write a per-route summary file inside the phase directory, named by the v2 route:
`.planning/phases/{phase-dir}/SUMMARY-v2-{endpoint-name}.md`

Examples:
- `.planning/phases/07-wave-1-simple-read-only-gets/SUMMARY-v2-check-gemini-api-key.md`
- `.planning/phases/07-wave-1-simple-read-only-gets/SUMMARY-v2-fetch-user-profile-pic.md`

The `{endpoint-name}` is derived from the v2 route path (e.g., `/api/v2/tags/fetch-user-tags` → `fetch-user-tags`). If the route is nested under a domain prefix (e.g., `/api/v2/profiles/fetch-user-profile-pic`), use the leaf segment only: `fetch-user-profile-pic`.

The `{phase-dir}` is determined from `.planning/REQUIREMENTS.md` based on which phase the MIG-XX ticket belongs to. Default to `07-wave-1-simple-read-only-gets` for Phase 7 routes.

**File format:**

````
---
phase: {phase-dir}
route: v2-{endpoint-name}
status: complete
started: {YYYY-MM-DD}
completed: {YYYY-MM-DD}
---

## What was built
[1-3 sentence narrative: what was migrated, source → target, factory used]

## Key files

### Created
- `src/app/api/v2/.../route.ts` — v2 route handler using {factory}
- `src/app/api/v2/.../schema.ts` — Zod input/output schemas
- `src/lib/openapi/endpoints/{domain}/v2-{name}.ts` — OpenAPI supplement

### Modified
- `src/lib/openapi/endpoints/{domain}/index.ts` — barrel export added

## Decisions
- [Non-obvious schema/logic decisions with rationale]

## Deviations
None — plan executed exactly as written.
[Or: description of what diverged from the plan and why]

## Migration summary

| Field | Value |
|-------|-------|
| Source | `src/pages/api/...` |
| Target | `src/app/api/v2/.../route.ts` |
| Factory | `createXxxApiHandler` |
| HTTP Method | GET/POST |
| Auth | User JWT / Service-role / Public |
| Scalar Test URL | `http://localhost:3000/api-docs#tag/{Tag}/GET/api/v2/{path}` |

## Verification

### Static checks
| Check | Result |
|-------|--------|
| OpenAPI spec generates | 36/36 supplements applied |
| TypeScript types | Pass |
| pnpm fix | Pass (or: pre-existing failure in X — unrelated) |

### E2E verification (Supabase MCP + Chrome MCP)
| # | Case | Old Route | v2 Route | Match | Notes |
|---|------|-----------|----------|-------|-------|
| 1 | Happy path | 200 | 200 | ✓ | Identical JSON |
| ... | ... | ... | ... | ... | ... |

### Named examples in supplement
| # | Key | Type | Source Case | Click-to-Test |
|---|-----|------|-------------|---------------|
| 1 | `google-provider` | 200 | Happy path | Send `?email=user@example.com` |
| ... | ... | ... | ... | ... |

### DB schema verification
| Column | DB Type | Nullable | Zod Schema | Match |
|--------|---------|----------|------------|-------|
| ... | ... | ... | ... | ✓ |

## Pitfalls discovered
None new.
[Or: new pitfall description — also append to pitfalls reference file]

## Self-check: PASSED
````
