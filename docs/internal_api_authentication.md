# Internal API Authentication

## Overview

The Recollect application uses internal API key authentication to secure background job endpoints that should not be publicly accessible. These endpoints are used by queue consumers and internal services to process bookmarks asynchronously.

## Protected Endpoints

The following endpoints require internal API key authentication:

### Bookmark Processing

1. **`/api/v1/bookmarks/add/tasks/remaining`** - Processes remaining bookmark data including images and metadata
2. **`/api/v1/bookmarks/add/tasks/screenshot`** - Captures and stores screenshots of bookmarked URLs
3. **`/api/v1/bookmarks/add/tasks/queue-consumer`** - Processes messages from the bookmark queue

### File Upload Processing

1. **`/api/v1/file/upload/tasks/remaining`** - Processes uploaded files (blurhash, OCR, AI captions)
2. **`/api/v1/file/upload/tasks/queue-consumer`** - Processes messages from the file upload queue

## Authentication Method

These endpoints use a shared secret key passed via HTTP headers. The authentication is checked at the start of each handler function before any processing occurs.

### Header Format

You can provide the API key in one of two ways:

1. **Using `x-api-key` header:**

   ```http
   x-api-key: your-internal-api-key-here
   ```

2. **Using `Authorization` header with Bearer token:**

   ```http
   Authorization: Bearer your-internal-api-key-here
   ```

## Setup

### 1. Generate a Secure API Key

For production, generate a strong random key using one of these methods:

**Using OpenSSL:**

```bash
openssl rand -hex 32
```

**Using Node.js:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Using Python:**

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 2. Add to Environment Variables

#### Local Development (.env.local)

```env
INTERNAL_API_KEY=your-secure-random-key-here
```

#### Production

Add the `INTERNAL_API_KEY` to your production environment variables in your hosting platform (Vercel, AWS, etc.).

**Important:** Never commit the actual API key to version control!

### 3. Environment Schema

The `INTERNAL_API_KEY` is already configured in `scripts/env/schema.js` as a required server-side environment variable:

```javascript
export const serverSchema = z.object({
	// ... other variables
	INTERNAL_API_KEY: z.string(),
});
```

## Usage Examples

### Calling Protected Endpoints

#### Using axios

```typescript
import axios from "axios";

const response = await axios.post(
	"http://localhost:3000/api/v1/bookmarks/add/tasks/remaining",
	{
		id: bookmarkId,
		url: bookmarkUrl,
		userId: userId,
		favIcon: favIconUrl,
	},
	{
		headers: {
			"x-api-key": process.env.INTERNAL_API_KEY,
		},
	},
);
```

#### Using fetch

```typescript
const response = await fetch(
	"http://localhost:3000/api/v1/bookmarks/add/tasks/screenshot",
	{
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-api-key": process.env.INTERNAL_API_KEY,
		},
		body: JSON.stringify({
			id: bookmarkId,
			url: bookmarkUrl,
			userId: userId,
		}),
	},
);
```

## Response Codes

- **200**: Success
- **400**: Invalid request payload
- **401**: Unauthorized - Invalid or missing API key
- **500**: Internal server error

### 401 Unauthorized Response Example

```json
{
	"data": null,
	"error": "Unauthorized - Invalid API key",
	"message": null
}
```

## Security Best Practices

1. **Keep the API key secret** - Never expose it in client-side code or commit it to version control
2. **Use environment variables** - Always store the key in environment variables
3. **Rotate regularly** - Change the API key periodically (quarterly recommended)
4. **Use HTTPS** - In production, ensure all API calls use HTTPS
5. **Monitor usage** - Log and monitor failed authentication attempts
6. **Different keys per environment** - Use different keys for local, staging, and production environments

## Implementation Details

### Authentication Check

Each protected endpoint includes this authentication check at the start of the handler:

```typescript
// Authenticate internal API key
const apiKey =
	request.headers["x-api-key"] ||
	request.headers.authorization?.replace("Bearer ", "");

if (apiKey !== process.env.INTERNAL_API_KEY) {
	response.status(401).json({
		data: null,
		error: "Unauthorized - Invalid API key",
		message: null,
	});
	return;
}
```

### Why These Endpoints Need Protection

These endpoints:

- Use service role clients that bypass Row Level Security (RLS)
- Accept `userId` in the request body to operate on behalf of any user
- Are designed for internal background jobs, not direct user access
- Could be abused to modify any user's bookmarks if left unprotected

Without authentication, an attacker could:

- Modify other users' bookmarks by sending requests with arbitrary `userId` values
- Overload the system by repeatedly calling expensive operations (screenshots, AI processing)
- Access internal queue processing functionality

## Troubleshooting

### "Unauthorized - Invalid API key" Error

**Possible causes:**

1. `INTERNAL_API_KEY` environment variable is not set
2. The API key in the request doesn't match the environment variable
3. Extra whitespace or newlines in the environment variable
4. Using the wrong environment variable (e.g., using production key in local development)

**Solutions:**

1. Verify the environment variable is set: `echo $INTERNAL_API_KEY`
2. Check for typos or extra whitespace
3. Restart your development server after changing environment variables
4. Ensure you're using the correct `.env.local` file

### Environment Variable Not Loading

If the environment variable isn't being recognized:

1. **Check the file location**: `.env.local` should be in the project root
2. **Restart the dev server**: Environment variables are loaded at startup
3. **Verify the schema**: Make sure `INTERNAL_API_KEY` is in `scripts/env/schema.js`
4. **Check for syntax errors**: Ensure proper format in the `.env.local` file

## Related Documentation

- [Environment Configuration](./.github/DEVELOPMENT.md#configuration)
- [Supabase Local Development](./supabase_local_development.md)
- [Bookmark Queue Implementation](./bookmark-queue-implementation.md)
- [API Logging Rules](./api_logging_rules.md)
