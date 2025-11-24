# API Logging Rules

Guidelines for consistent logging, error handling, and Sentry integration in API routes.

## Import Requirements

```typescript
import * as Sentry from "@sentry/nextjs";
```

## Root-Level Error Handler (CRITICAL)

**This is the most important rule.**
Every API handler MUST wrap its entire body in a try-catch to handle unexpected errors:

```typescript
export default async function handler(
	request: NextApiRequest<PayloadType>,
	response: NextApiResponse<ResponseType>,
) {
	try {
		const supabase = apiSupabaseClient(request, response);

		// Authentication check
		const { data: userData, error: userError } = await supabase.auth.getUser();
		const userId = userData?.user?.id;

		if (userError || !userId) {
			console.warn("User authentication failed:", {
				error: userError?.message,
			});
			response.status(401).json({ data: null, error: "Unauthorized" });
			return;
		}

		// All API logic goes here
		// ...
	} catch (error) {
		console.error("Unexpected error in api-name:", error);
		Sentry.captureException(error, {
			tags: {
				operation: "api_name_unexpected",
			},
		});
		response.status(500).json({
			data: null,
			error: "An unexpected error occurred",
		});
	}
}
```

### Requirements

- Wrap ALL logic including supabase client and auth check in try-catch
- Catch block handles any unexpected/unhandled errors
- Always log the error with `console.error`
- Always capture to Sentry with `operation` tag ending in `_unexpected`
- Return generic user-friendly message (don't expose error details)

## Authentication Check

Always verify user authentication before processing requests. Return 401 for auth failures:

```typescript
const supabase = apiSupabaseClient(request, response);

// Check for auth errors
const { data: userData, error: userError } = await supabase.auth.getUser();
const userId = userData?.user?.id;

if (userError || !userId) {
	console.warn("User authentication failed:", { error: userError?.message });
	response.status(401).json({
		// Response format must match the API's existing response type
		// Examples:
		// { data: null, error: { message: "Unauthorized" } }
		// { data: null, success: false, error: "Unauthorized" }
		// { success: false, error: "Unauthorized" }
	});
	return;
}
```

### Key Points

- Use `console.warn` (user-caused issue, not system error)
- Return 401 status code for unauthorized requests
- Response format must match the API's existing response type
- Always return early after sending the error response

## Using `vet` for Error-Throwing Operations

Within the root-level try-catch, use `vet` utility for operations that throw errors instead of returning them.

### When to Use `vet`

**✅ Use `vet` for:**

- External API calls (axios, fetch)
- Operations that throw errors on failure
- Any function that doesn't return errors in response

**❌ Don't use `vet` for:**

- Supabase operations (already return `{ data, error }` tuples)
- Operations that return errors in response structure

### Benefits

- Eliminates `let` usage - use `const` with destructuring
- Cleaner error handling with tuple destructuring
- Consistent error handling pattern

### Variable Naming Convention

**CRITICAL**: Name destructured variables uniquely based on the operation to prevent conflicts in the same scope.

**Pattern**: `const [operationError, operationResult] = await vet(...)`

```typescript
// ✅ Good - unique descriptive names
const [screenshotError, screenshotResponse] = await vet(() =>
	axios.get(`${SCREENSHOT_API}/try?url=${url}`),
);

const [uploadError, uploadResult] = await vet(() => axios.post(apiUrl, data));

// ❌ Bad - generic names conflict with other vet calls
const [error, response] = await vet(() => axios.get(url1));
const [error, response] = await vet(() => axios.get(url2)); // Name conflict!
```

### Example

```typescript
// Before: using let with try-catch
let screenShotResponse;
try {
	screenShotResponse = await axios.get(url, options);
	console.log("Success:", { status: screenShotResponse.status });
} catch (error_) {
	console.error("API error:", error_);
	Sentry.captureException(error_, {
		tags: { operation: "screenshot_api", userId },
	});
	response.status(500).json({ data: null, error: "Error message" });
	return;
}

// After: using vet with const
const [screenshotError, screenShotResponse] = await vet(() =>
	axios.get(url, options),
);

if (screenshotError) {
	console.error("API error:", screenshotError);
	Sentry.captureException(screenshotError, {
		tags: { operation: "screenshot_api", userId },
	});
	response.status(500).json({ data: null, error: "Error message" });
	return;
}

console.log("Success:", { status: screenShotResponse.status });
```

## Flow Structure (Fail-Fast Pattern)

Always check for errors immediately after operations and return early:

```typescript
// 1. Get data
const { data, error } = await someOperation();

// 2. Check error immediately - fail fast
if (error) {
	console.error("Descriptive error message:", error);
	Sentry.captureException(error, {
		tags: { operation: "operation_name", userId },
		extra: { contextualData },
	});
	// Use error format that matches the API's response type
	response.status(500).json({
		data: null,
		error: "User-friendly error message",
	});
	return;
}

// 3. Continue with success path
console.log("Success message:", { relevantData });
response.status(200).json({ data, error: null });
```

## Early Return Response Rule

**CRITICAL**: Every `return` statement in an API handler MUST be preceded by a response.

### Why This Matters

- Plain `return` without `response.status().json()` causes the HTTP request to hang
- Client will timeout waiting for a response that never comes
- This applies to ALL code paths, including "skip" scenarios

### Correct Pattern

Always send response before return:

```typescript
if (shouldSkipOperation) {
	console.log("Skipping operation because:", { reason });
	response.status(200).json({ data, success: true, error: null });
	return;
}
```

### Incorrect Pattern

Never return without response:

```typescript
if (shouldSkipOperation) {
	console.log("Skipping operation");
	return; // BUG: Client will hang!
}
```

## Log Levels Usage

### `console.log` - Debug/Info

Use for normal flow and debugging:

- API entry point with key parameters
- Operation results
- Success confirmations
- Flow decisions (e.g., "skipping X because Y")

```typescript
// Entry point
console.log("api-name API called:", { userId, param1, param2 });

// Operation result
console.log("Operation result:", { id: data?.[0]?.id });

// Success
console.log("Operation completed successfully:", { id });

// Flow decision
console.log("File type is pdf, so not calling the remaining upload api");
```

### `console.warn` - User-Caused Issues

Use for expected issues caused by user actions (not system errors):

- Duplicate entries
- Authorization failures
- Validation failures

```typescript
console.warn("Duplicate category name attempt:", { categoryName: name });
console.warn("User authorization failed for category:", { categoryId });
```

### `console.error` - System Errors

Use for unexpected system/database errors:

- Database operation failures
- External API failures
- Unexpected exceptions

```typescript
console.error("Error inserting category:", error);
console.error("Error getting public URL:", publicUrlError);
```

## Sentry Integration

### Structure

```typescript
Sentry.captureException(error, {
	tags: {
		operation: "operation_name", // Always include
		userId, // Always include
		// Other indexed values (searchable)
	},
	extra: {
		// Contextual data only (not indexed)
		// NO errorMessage - redundant with error object
	},
});
```

### Tags (Indexed, Searchable)

- `operation`: Name of the operation (e.g., "insert_category", "get_public_url")
- `userId`: User ID for filtering errors by user
- Other frequently searched values (e.g., `categoryName`)

### Extra (Contextual, Not Indexed)

Only include data helpful for debugging:

- `storagePath`, `bookmarkId`, `fileName`, `fileType`
- DO NOT include `errorMessage` - the error object already has it

### Examples

```typescript
// Database insert error
Sentry.captureException(error, {
	tags: {
		operation: "insert_category",
		userId,
		categoryName: name,
	},
});

// File operation error
Sentry.captureException(error, {
	tags: {
		operation: "get_public_url",
		userId,
	},
	extra: {
		storagePath,
	},
});
```

## Response Format

### Success Response

```typescript
response.status(200).json({ data, error: null });
// or
response.status(200).json({ data, success: true, error: null });
```

### Error Response

Send user-friendly messages only, not raw error objects. **Match the format to the API's existing response type**:

```typescript
// For APIs where error type is string
response.status(500).json({
	data: null,
	error: "User-friendly error message",
});

// For APIs where error type is { message: string }
response.status(500).json({
	data: null,
	error: { message: "User-friendly error message" },
});

// For APIs with { success, error } structure
response.status(500).json({
	success: false,
	error: "User-friendly error message",
});
```

**Important**: Check the API's response type definition and use the matching error format. Do not change the type to accommodate a different format.

## Complete API Template

```typescript
import { type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

export default async function handler(
	request: NextApiRequest<PayloadType>,
	response: NextApiResponse<ResponseType>,
) {
	try {
		const supabase = apiSupabaseClient(request, response);

		// Authentication check
		const { data: userData, error: userError } = await supabase.auth.getUser();
		const userId = userData?.user?.id;

		if (userError || !userId) {
			console.warn("User authentication failed:", {
				error: userError?.message,
			});
			response.status(401).json({ data: null, error: "Unauthorized" });
			return;
		}

		// Extract request data
		const { param1, param2 } = request.body;

		// 1. Entry point log
		console.log("api-name API called:", { userId, param1, param2 });

		// 2. First operation
		const { data: result1, error: error1 } = await firstOperation();

		// 3. Check error immediately
		if (error1) {
			console.error("Error in first operation:", error1);
			Sentry.captureException(error1, {
				tags: {
					operation: "first_operation",
					userId,
				},
				extra: {
					param1,
				},
			});
			response.status(500).json({
				data: null,
				error: "Error performing first operation",
			});
			return;
		}

		// 4. Log intermediate result
		console.log("First operation result:", { id: result1?.[0]?.id });

		// 5. Second operation
		const { data: result2, error: error2 } = await secondOperation();

		// 6. Check error immediately
		if (error2) {
			console.error("Error in second operation:", error2);
			Sentry.captureException(error2, {
				tags: {
					operation: "second_operation",
					userId,
				},
			});
			response.status(500).json({
				data: null,
				error: "Error performing second operation",
			});
			return;
		}

		// 7. Success log and response
		console.log("Operation completed successfully:", { id: result2?.[0]?.id });
		response.status(200).json({ data: result2, error: null });
	} catch (error) {
		console.error("Unexpected error in api-name:", error);
		Sentry.captureException(error, {
			tags: {
				operation: "api_name_unexpected",
			},
		});
		response.status(500).json({
			data: null,
			error: "An unexpected error occurred",
		});
	}
}
```

## External API Calls (Fire-and-Forget)

When calling external APIs after sending the response:

```typescript
// Send response first
console.log("Operation completed successfully:", { id });
response.status(200).json({ data, success: true, error: null });

// Then call external API (fire-and-forget)
if (shouldCallExternalApi) {
	const requestBody = {
		id: data[0]?.id,
		publicUrl: storageData?.publicUrl,
		mediaType: meta_data?.mediaType,
	};
	console.log("Calling external API:", { requestBody });

	try {
		await axios.post(externalApiUrl, requestBody, config);
	} catch (error) {
		console.error("External API error:", error);
		Sentry.captureException(error, {
			tags: {
				operation: "external_api_call",
				userId,
			},
			extra: {
				bookmarkId: data[0]?.id,
			},
		});
	}
} else {
	console.log("Skipping external API call because condition not met");
}
```

### Key Points for External API Calls

1. **Log before calling**: Include URL/endpoint and request body
2. **Keep the await**: In serverless environments, ensures the call completes before function terminates
3. **Catch and log errors**: Don't let external API failures crash the function
4. **No response needed**: Response was already sent to client
5. **Log skip reasons**: When not calling the API, log why

## Key Principles

1. **Fail Fast**: Check errors immediately after each operation
2. **Early Return**: Use `return` after error responses, not else blocks
3. **No Raw Errors to Client**: Send only user-friendly messages
4. **Consistent Log Format**: `"Description:", { data }`
5. **Appropriate Log Levels**: log for info, warn for user issues, error for system failures
6. **Minimal Sentry Extra**: Only contextual data, no redundant messages
7. **Always Include Operation Tag**: Makes errors searchable in Sentry
8. **Log External API Calls**: Always log URL and body before calling external APIs

## APIs Following These Rules

The following APIs have been migrated to follow all rules in this document:

### File Operations

- `file/upload-file.ts`
- `file/upload-file-remaining-data.ts`

### Bookmark Operations

- `bookmark/add-bookmark-min-data.ts`
- `bookmark/add-url-screenshot.ts`

### Category Operations

- `category/create-user-category.ts`

### Share Operations

- `share/send-collaboration-email.ts`
- `share/fetch-shared-categories-data.ts`

### Profile Operations

- `profiles/update-user-profile.tsx`

### Storage Operations

- `v1/bucket/get/signed-url.tsx`
