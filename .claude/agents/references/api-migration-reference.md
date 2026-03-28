# API Migration Reference

Reference data for the `recollect-api-migrator` agent. Read this file in Step 1 of the migration workflow.

---

## Handler Factories

Factories in `/src/lib/api-helpers/create-handler.ts`:

| Function                       | Auth     | Method | Use Case               |
| ------------------------------ | -------- | ------ | ---------------------- |
| `createGetApiHandler`          | Public   | GET    | Public read endpoints  |
| `createPostApiHandler`         | Public   | POST   | Public write endpoints |
| `createGetApiHandlerWithAuth`  | Required | GET    | Authenticated reads    |
| `createPostApiHandlerWithAuth` | Required | POST   | Authenticated creates  |
| `createPatchApiHandlerWithAuth` | Required | PATCH  | Authenticated updates  |
| `createPutApiHandlerWithAuth` | Required | PUT    | Authenticated upserts  |
| `createDeleteApiHandlerWithAuth` | Required | DELETE | Authenticated deletes  |
| `createGetApiHandlerWithSecret` | Secret   | GET    | Secret-token protected GETs (cron)  |
| `createPostApiHandlerWithSecret` | Secret  | POST   | Secret-token protected POSTs (ISR, cron) |

**Handler factory config:**

| Prop           | Type        | Description                                  |
| -------------- | ----------- | -------------------------------------------- |
| `route`        | `string`    | Route name for logging prefix                |
| `inputSchema`  | `z.ZodType` | Zod schema for request body/query validation |
| `outputSchema` | `z.ZodType` | Zod schema for response validation           |
| `handler`      | `function`  | Async handler receiving context              |

**Handler context for auth handlers:**

| Prop       | Type             | Description                  |
| ---------- | ---------------- | ---------------------------- |
| `data`     | `TInput`         | Validated request body/query |
| `supabase` | `SupabaseClient` | Authenticated client         |
| `user`     | `User`           | Authenticated user           |
| `route`    | `string`         | Route name                   |

**Handler context for public handlers:**

| Prop    | Type     | Description                  |
| ------- | -------- | ---------------------------- |
| `input` | `TInput` | Validated request body/query |
| `route` | `string` | Route name                   |

**Handler context for secret handlers:**

| Prop    | Type     | Description                  |
| ------- | -------- | ---------------------------- |
| `input` | `TInput` | Validated request body/query |
| `route` | `string` | Route name                   |

Secret handlers check `Authorization: Bearer <secret>` against `process.env[secretEnvVar]`. The handler does NOT receive a Supabase client — create one internally if needed.

**Handler return behavior:**

- Return raw data → wrapped in `apiSuccess` automatically
- Return `NextResponse` (via `apiWarn`/`apiError`) → passed through directly

**v2 factories** (`create-handler-v2.ts`) inject `error()`/`warn()` into handler context. Return `T` directly (no `apiSuccess` wrapping). Import from `create-handler-v2`, not `create-handler`.

**Response Helpers:**

| Helper       | Use For                                       | Sentry | Status |
| ------------ | --------------------------------------------- | ------ | ------ |
| `parseBody`  | Request body validation                       | No     | 400    |
| `apiWarn`    | User errors (not found, permission denied)    | No     | 4xx    |
| `apiError`   | System errors (database failures, unexpected) | Yes    | 500    |
| `apiSuccess` | Success with output validation                | No     | 200    |

**`apiWarn` props:** `route`, `message`, `status`, `context?`
**`apiError` props:** `route`, `message`, `error`, `operation`, `userId?`, `extra?`
**`apiSuccess` props:** `route`, `data`, `schema`, `status?`

**`requireAuth` discriminated union:**

```typescript
type AuthResult =
	| { supabase: SupabaseClient<Database>; user: User; errorResponse: null }
	| {
			supabase: null;
			user: null;
			errorResponse: NextResponse<ApiErrorResponse>;
	  };
```

Auth error responses: `userError` → 400, `!user` → 401

**Critical Rules:**

1. **Root-Level Try-Catch**: Every manual handler MUST wrap all logic in try-catch
2. **Never Expose Error Details**: Log full errors server-side, send generic messages to client
3. **Fail-Fast Pattern**: Check errors immediately, return early
4. **Log Levels**: `console.log` for entry/success, `console.warn` for user issues, `console.error` for system errors
5. **Sentry Integration**: Always include `tags: { operation, userId }` and optional `extra`

---

## HTTP Method Semantics

When migrating a route, do NOT blindly copy the v1 HTTP method. v1 uses POST for everything. v2 must use the semantically correct HTTP method based on the operation:

| Operation | Method | Body | Example |
|-----------|--------|------|---------|
| Read data (no side effects) | GET | Query params only | fetch-user-profile, fetch-user-tags |
| Create new resource | POST | Required | (future: create-bookmark) |
| Idempotent replace/upsert | PUT | Required | api-key (singleton upsert) |
| Partial update | PATCH | Required | update-username, update-user-profile |
| Delete resource | DELETE | Optional (ID) | remove-profile-pic, delete-shared-categories-user |

**Decision rules:**

1. Handler calls `.select()` only → **GET** (use `createGetApiHandlerWithAuth`)
2. Handler calls `.insert()` → **POST** (use `createPostApiHandlerWithAuth`)
3. Handler calls `.update()` → **PATCH** (use `createPatchApiHandlerWithAuth`)
4. Handler calls `.upsert()` on singleton → **PUT** (use `createPutApiHandlerWithAuth`)
5. Handler calls `.delete()` or nullifies + removes storage → **DELETE** (use `createDeleteApiHandlerWithAuth`)
6. Empty input schema + auth-only = likely **GET** or **DELETE** (no body needed)

**Quick check:** If v1 is POST but the handler never writes to the DB → it's a GET.

---

## factoryName Decision Table

| Route Pattern           | factoryName                                                        | Why                         |
| ----------------------- | ------------------------------------------------------------------ | --------------------------- |
| User JWT auth           | `"createGetApiHandlerWithAuth"` / `"createPostApiHandlerWithAuth"` | Scanner adds `bearerAuth`   |
| Secret token (GET)      | `"createGetApiHandlerWithSecret"`                                  | Secret env var auth         |
| Secret token (POST)     | `"createPostApiHandlerWithSecret"`                                 | Secret env var auth (ISR)   |
| Service-role (no auth)  | `"createPostApiHandler"` + internal `createServiceClient()`        | Handler creates own client  |
| Multipart + user auth   | `"createPostApiHandler"` + `requireAuth` manually                  | Custom auth flow            |
| Public                  | `"createGetApiHandler"` / `"createPostApiHandler"`                 | No auth                     |
| Binary response         | `"createGetApiHandler"` with `NextResponse` passthrough            | Returns `new NextResponse(buffer)` |

---

## Non-Standard Route Taxonomy (Waves 3-6)

| Route                         | Wave | Pattern       | Notes                                |
| ----------------------------- | ---- | ------------- | ------------------------------------ |
| `revalidate`                  | 3    | Secret factory | `createPostApiHandlerWithSecret` + `revalidatePath()` |
| `get-media-type`              | 3    | Public factory | `createGetApiHandler` + CORS headers |
| `get-pdf-buffer`              | 3    | Public factory | Binary PDF via NextResponse passthrough |
| `bookmarks/insert`            | 3    | Auth factory   | Batch insert, `createPostApiHandlerWithAuth` |
| `bookmarks/delete/non-cascade`| 3    | Auth factory   | `createDeleteApiHandlerWithAuth`, test-only |
| `v1/process-queue`            | 3    | Public factory | `createPostApiHandler` + internal service client |
| `fetch-public-category-bookmarks` | 3 | Public factory | `createGetApiHandler` + service client, complex query |
| `settings/upload-profile-pic` | 4    | Object.assign | Multipart + user auth     |
| `v1/screenshot`               | 6    | Object.assign | Service-role queue worker |
| `v1/ai-enrichment`            | 6    | Object.assign | Service-role queue worker |

---

## Error Handling Patterns

**Duplicate Detection (Postgres 23505):**

```typescript
if (
	error.code === "23505" ||
	error.message?.includes("unique_constraint_name")
) {
	return apiWarn({
		route,
		message: "Duplicate name",
		status: 409,
		context: { name, userId },
	});
}
```

**Authorization (Ownership):**

```typescript
if (resourceData?.user_id !== userId) {
	return apiWarn({
		route,
		message: "User is not the owner",
		status: 403,
		context: { resourceId, userId },
	});
}
```

**Server Error with Sentry:**

```typescript
return apiError({
	route,
	message: "Error description",
	error,
	operation: "operation_name",
	userId,
	extra: { additionalContext },
});
```

