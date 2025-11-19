# API Logging Rules

Guidelines for consistent logging, error handling, and Sentry integration in API routes.

## Import Requirements

```typescript
import * as Sentry from "@sentry/nextjs";
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
	response.status(500).json({
		data: null,
		error: { message: "User-friendly error message" },
	});
	return;
}

// 3. Continue with success path
console.log("Success message:", { relevantData });
response.status(200).json({ data, error: null });
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

Send user-friendly messages only, not raw error objects:

```typescript
// For APIs with { data, error } structure
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

## Complete API Template

```typescript
import { type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

export default async function handler(
	request: NextApiRequest<PayloadType>,
	response: NextApiResponse<ResponseType>,
) {
	const supabase = apiSupabaseClient(request, response);
	const userId = (await supabase?.auth?.getUser())?.data?.user?.id as string;

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
			error: { message: "Error performing first operation" },
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
			error: { message: "Error performing second operation" },
		});
		return;
	}

	// 7. Success log and response
	console.log("Operation completed successfully:", { id: result2?.[0]?.id });
	response.status(200).json({ data: result2, error: null });
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
