# API Logging Rules

Guidelines for logging, error handling, and Sentry integration in API routes.

## App Router Authentication (Recommended)

Use `requireAuth`, `parseBody`, and response helpers for App Router API routes:

```typescript
import { type NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, apiWarn, parseBody } from "@/lib/api-response";
import { requireAuth } from "@/lib/supabase/api";

const ROUTE = "endpoint-name";

const InputSchema = z.object({
	param1: z.string(),
});

const OutputSchema = z.object({
	id: z.number(),
	name: z.string(),
});

export async function POST(request: NextRequest) {
	try {
		const auth = await requireAuth(ROUTE);
		if (auth.errorResponse) {
			return auth.errorResponse;
		}
		const { supabase, user } = auth;

		// Validate request body
		const body = await parseBody({
			request,
			schema: InputSchema,
			route: ROUTE,
		});
		if (body.errorResponse) {
			return body.errorResponse;
		}

		const { param1 } = body.data;
		const userId = user.id;

		console.log(`[${ROUTE}] API called:`, { userId, param1 });

		// Business logic...
		const { data, error } = await supabase.from("table").select();
		if (error) {
			return apiError({
				route: ROUTE,
				message: "Failed to fetch data",
				error,
				operation: "operation_name",
				userId,
				extra: { param1 },
			});
		}

		return apiSuccess({ route: ROUTE, data, schema: OutputSchema });
	} catch (error) {
		return apiError({
			route: ROUTE,
			message: "An unexpected error occurred",
			error,
			operation: "endpoint_name_unexpected",
		});
	}
}
```

### Response Helpers

| Helper       | Use For                                              | Sentry | Status Codes |
| ------------ | ---------------------------------------------------- | ------ | ------------ |
| `parseBody`  | Request body validation                              | No     | 400          |
| `apiWarn`    | User errors (not found, permission denied)           | No     | 4xx          |
| `apiError`   | System errors (database failures, unexpected issues) | Yes    | 500          |
| `apiSuccess` | Success with output validation                       | No     | 200          |

**`parseBody` props:**

- `request`: The incoming request object
- `schema`: Zod schema for validation
- `route`: Route name for logging prefix

**`apiWarn` props:**

- `route`: Route name for logging prefix
- `message`: User-friendly error message (sent to client)
- `status`: HTTP status code (400, 403, 404, etc.)
- `context?`: Optional debug data for server logs

**`apiError` props:**

- `route`: Route name for logging prefix
- `message`: User-friendly error message (sent to client)
- `error`: The error object to log and send to Sentry
- `operation`: Sentry tag for filtering (e.g., "fetch_bookmark")
- `userId?`: Optional user ID for Sentry tags
- `extra?`: Optional additional context for Sentry

**`apiSuccess` props:**

- `route`: Route name for logging prefix
- `data`: The response data
- `schema`: Zod schema for output validation
- `status?`: HTTP status code (default: 200)

### Response Types

All helpers return typed `NextResponse` for proper type inference:

```typescript
type ApiSuccessResponse<T> = { data: T; error: null };
type ApiErrorResponse = { data: null; error: string };
export type ApiResponse<T> = ApiErrorResponse | ApiSuccessResponse<T>;
```

### `requireAuth` Details

Returns discriminated union for type narrowing:

```typescript
type AuthResult =
	| { supabase: SupabaseClient; user: User; errorResponse: null }
	| {
			supabase: null;
			user: null;
			errorResponse: NextResponse<ApiErrorResponse>;
	  };
```

- `userError` → 400 (bad request)
- `!user` → 401 (unauthorized)

## Pages Router Authentication (Legacy)

For Pages API routes, use manual auth check:

```typescript
const supabase = apiSupabaseClient(request, response);
const { data: userData, error: userError } = await supabase.auth.getUser();

if (userError) {
	console.warn("[endpoint] Auth error:", userError);
	response.status(400).json({ data: null, error: userError.message });
	return;
}

if (!userData?.user) {
	console.warn("[endpoint] No user found");
	response.status(401).json({ data: null, error: "Not authenticated" });
	return;
}
```

## Critical Rules

### 1. Root-Level Try-Catch (Required)

Every handler MUST wrap all logic in try-catch:

```typescript
try {
	// ALL logic here including auth
} catch (error) {
	console.error("[endpoint] Unexpected:", error);
	Sentry.captureException(error, {
		tags: { operation: "endpoint_unexpected" },
	});
	// Return generic error
}
```

### 2. Never Expose Error Details

| Context          | Log (Server)            | Response (Client)       |
| ---------------- | ----------------------- | ----------------------- |
| Validation error | `parsed.error.issues`   | "Invalid request"       |
| Database error   | Full error object       | "Failed to [operation]" |
| Auth error       | Full `userError` object | `userError.message`     |
| Unexpected error | Full error object       | "An unexpected error"   |

### 3. Fail-Fast Pattern

Check errors immediately, return early:

```typescript
const { data, error } = await operation();
if (error) {
	console.error("[endpoint] Error:", error);
	Sentry.captureException(error, { tags: { operation: "name", userId } });
	return NextResponse.json(
		{ data: null, error: "User message" },
		{ status: 500 },
	);
}
// Continue with success path
```

### 4. Always Send Response Before Return

Never `return` without sending a response first (causes hanging requests).

## Log Levels

| Level           | Use For                                           | Example                        |
| --------------- | ------------------------------------------------- | ------------------------------ |
| `console.log`   | Entry points, success, flow decisions             | `"API called:", { userId }`    |
| `console.warn`  | User-caused issues (auth, validation, duplicates) | `"Duplicate entry:", { name }` |
| `console.error` | System/database errors                            | `"DB error:", error`           |

## Sentry Integration

```typescript
Sentry.captureException(error, {
	tags: {
		operation: "operation_name", // Always include
		userId, // Always include
	},
	extra: {
		contextualData, // Only non-indexed debug data
	},
});
```

- `tags`: Indexed, searchable (operation, userId, key identifiers)
- `extra`: Context only (paths, IDs), never `errorMessage`

## Using `vet` for Throwing Operations

Use `vet` for external APIs (axios, fetch) that throw on error. Returns `[error, result]` tuple.
Don't use for Supabase (already returns `{ data, error }` tuples).

```typescript
const [apiError, apiResponse] = await vet(() => axios.get(url));
if (apiError) {
	Sentry.captureException(apiError, {
		tags: { operation: "external_api", userId },
	});
	return NextResponse.json(
		{ data: null, error: "External API failed" },
		{ status: 500 },
	);
}
```

## Response Format

```typescript
// Success
return NextResponse.json({ data, error: null }, { status: 200 });

// Error - always user-friendly message
return NextResponse.json(
	{ data: null, error: "User-friendly message" },
	{ status: 500 },
);
```

Match the format to your API's response type.

## Key Principles

1. **Fail Fast** - Check errors immediately after operations
2. **Early Return** - Use `return` after errors, not else blocks
3. **No Raw Errors** - Send only user-friendly messages
4. **Consistent Format** - `"[endpoint] Message:", { data }`
5. **Appropriate Levels** - log (info), warn (user issues), error (system)
6. **Always Tag Operations** - Makes errors searchable in Sentry
