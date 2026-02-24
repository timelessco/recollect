# OpenAPI Reference: Edge Functions & Complex Examples

## Edge Function Endpoints

Edge functions (Deno) use manual `registerPath()` with raw `SchemaObject` instead of Zod. They run as Supabase Edge Functions, not under `/api`.

### Existing edge functions

| Domain    | File                                                          |
| --------- | ------------------------------------------------------------- |
| Instagram | `src/lib/openapi/endpoints/instagram/edge-process-imports.ts` |
| Raindrop  | `src/lib/openapi/endpoints/raindrop/edge-process-imports.ts`  |
| Twitter   | `src/lib/openapi/endpoints/twitter/edge-process-imports.ts`   |

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

export function registerEdgeProcessDomainImports() {
	// GET — health check (no auth)
	registry.registerPath({
		method: "get",
		path: "/process-domain-imports",
		servers: edgeFunctionServers,
		tags: ["Domain"],
		security: [],
		summary: "Health check for domain import worker",
		description:
			"Returns the worker status.\n\n**Note:** Runs as a Supabase Edge Function, not under `/api`.",
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
						examples: {
							"health-check": {
								summary: "Worker healthy",
								value: { status: "ok", queue: "domain_imports" },
							},
						},
					},
				},
			},
		},
	});

	// POST — process queue (service role auth)
	registry.registerPath({
		method: "post",
		path: "/process-domain-imports",
		servers: edgeFunctionServers,
		tags: ["Domain"],
		summary: "Process domain import queue",
		description:
			"Processes pending pgmq messages. Requires service role token.\n\n**Note:** Runs as a Supabase Edge Function.",
		security: [{ [serviceRoleAuth.name]: [] }],
		request: {
			body: {
				required: true,
				content: {
					"application/json": {
						schema: { type: "object" as const },
						examples: {
							"invoke-worker": {
								summary: "Invoke worker",
								description: "Empty body triggers queue processing",
								value: {},
							},
						},
					},
				},
			},
		},
		responses: {
			200: {
				description: "Queue processed",
				content: {
					"application/json": {
						schema: { $ref: "#/components/schemas/WorkerResponse" },
						examples: {
							"queue-empty": {
								summary: "Queue empty",
								value: {
									processed: 0,
									archived: 0,
									skipped: 0,
									retry: 0,
									message: "Queue empty",
								},
							},
							"batch-processed": {
								summary: "Batch processed",
								value: { processed: 3, archived: 1, skipped: 0, retry: 1 },
							},
						},
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
const { registerEdgeProcessDomainImports } =
	await import("../src/lib/openapi/endpoints/domain/edge-process-imports");
registerEdgeProcessDomainImports();
```

### Server overrides

Edge functions use per-path server overrides from `src/lib/openapi/endpoints/edge-function-servers.ts` so Scalar sends requests to the correct Supabase host instead of the Next.js origin.

### Shared schema components

The `WorkerResponse` schema is registered in `src/lib/openapi/registry.ts` as a `$ref` component. All 3 edge function POST endpoints share it.

For raw `SchemaObject` schemas (non-Zod), register with:

```typescript
registry.registerComponent("schemas", "Name", {
	type: "object",
	properties: {
		/* ... */
	},
	required: ["field1", "field2"],
});
```

Do NOT use `as const` on `required` arrays in raw schema objects — creates `readonly` tuple incompatible with `SchemaObject`'s `string[]`.

## Complex Supplement Example

When a supplement has many named examples, extract them to a colocated `-examples.ts` file:

```typescript
// src/lib/openapi/endpoints/twitter/sync-examples.ts
export const twitterSyncRequestExamples = {
	"single-tweet": {
		summary: "Sync single tweet",
		description: "Sync a single Twitter/X bookmark.",
		value: {
			bookmarks: [
				{
					url: "https://x.com/SawyerMerritt/status/1986170355535286529",
					title: "Sawyer Merritt",
					description: "BREAKING: SpaceX has announced...",
					type: "tweet",
					ogImage: "https://pbs.twimg.com/media/example.jpg",
					meta_data: {
						favIcon: "https://...",
						twitter_avatar_url: "https://...",
					},
					inserted_at: "2026-01-20T08:53:32.394Z",
					sort_index: "1848019423856806627",
				},
			],
		},
	},
} as const;
```

Then import in the supplement:

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

Example data objects in `-examples.ts` files use `as const` (per frontend rules). Supplement files use `satisfies EndpointSupplement`.
