# API Migration Pitfalls

Known pitfalls discovered during production API migrations. Read by the `recollect-api-migrator` agent at Step 1. Append new discoveries at the end.

---

1. **Timestamp coercion:** Use `z.string()` for output timestamps, NOT `z.iso.datetime()`. Supabase returns a `+00:00` offset. Only use `z.iso.datetime()` for input schemas where the client sends `Z`-suffix via `toISOString()`.

2. **Sub-requests keep v1 URLs:** When migrating a route, don't also update URLs of unrelated sub-requests the handler makes. Only repoint the caller that fetches the exact route being migrated.

3. **`withRawBody` schema source of truth:** Handler MUST use the same Zod schemas from `schema.ts` that the config references. Two sources of truth = spec drift.

4. **Service-role client:** Use `createServerServiceClient()` from `src/lib/supabase/service.ts` (App Router, synchronous — don't `await`). Never `createServiceClient` from `src/utils/supabaseClient.ts` (legacy).

5. **`z.looseObject` incompatible with Supabase `Json`:** Infers `{ [x: string]: unknown }`. Use `z.object`.

6. **Schema source of truth:** Build output schemas from `src/types/database-generated.types.ts`, never from `src/types/apiTypes.ts`. Old types use `as unknown as` casts with phantom fields.

7. **Nullable columns:** If `database-generated.types.ts` shows `field: string | null`, Zod MUST use `z.string().nullable()`. Using `z.string()` alone triggers output validation → 500.

8. **DB type grep patterns:** Never search `tableName.*Row` in `database-generated.types.ts` — the `Row` type is on a different line. Search for just the table name (e.g., `tags:`) with `-A 20` context lines.

9. **Supplement example timestamps:** Use `+00:00` offset in example data (e.g., `"2024-03-15T10:30:00+00:00"`), not `Z` (`"2024-03-15T10:30:00Z"`). Matches actual Supabase output.

10. **Two-pass supplement creation:** Step 3 creates metadata-only (no examples). Step 4c adds named examples from real E2E results. Don't fabricate examples in Step 3. If `/recollect-api-tester` cannot run (Chrome MCP or Supabase MCP unavailable), E2E is skipped — report to the user so the dependency can be fixed.

11. **No PII in examples:** Never real emails, names, or user IDs. Use `user@example.com`, `another@example.com`, `550e8400-e29b-41d4-a716-446655440000`.

12. **Lodash ESM incompatibility in the scanner:** Importing from `@/utils/helpers` (which imports `{ isEmpty } from "lodash"`) causes the OpenAPI scanner (`tsx`) to fail with ESM named-export errors. Inline small utility functions in the route file, or use the `withRawBody` pattern. Prefer remeda (`isEmpty`, `isNullish`, etc.) in v2 code.

13. **Binary responses use the wrapping factory, not `withRawBody`:** Routes returning binary data (e.g., PDF streaming) with JSON input CAN use `withAuth`/`withPublic`. Return `new NextResponse(buffer, { headers })` — the factory detects `instanceof NextResponse` and passes through without JSON wrapping. Reserve `withRawBody` for non-JSON *input* (multipart, FormData, SSE, queue messages).

14. **ISR revalidation in App Router:** `res.revalidate(path)` is Pages Router only. Use `revalidatePath(path)` from `next/cache`. The v2 revalidate route demonstrates this pattern.

15. **CORS headers in App Router:** Unlike Pages Router's `res.setHeader()`, App Router returns `new NextResponse()` with headers in the constructor. When preserving CORS headers from v1, set them on the Response object: `NextResponse.json(data, { headers: { 'Access-Control-Allow-Origin': '*' } })`.

16. **Service-role in `withPublic` handlers:** `withPublic` doesn't provide a Supabase client. Handlers create their own via `createServerServiceClient()` from `@/lib/supabase/service` — for endpoints that need service-role access without user auth (process-queue, fetch-public-category-bookmarks).

17. **Drop lodash in v2 migrations:** Replace `isNull`/`isNil` with `isNullish` from `remeda`, `isEmpty` with `array.length === 0` or `remeda`'s `isEmpty`, `omit` with destructuring rest (`const { removed, ...rest } = obj`).

18. **Output schema parity across endpoints:** When a write endpoint (PATCH/PUT/DELETE) returns the full record via `.select()`, its output schema MUST match the corresponding read endpoint's output schema for the same table: same field set, same `z.int()` vs `z.number()` choice. `z.int()` adds a `Number.isInteger()` refinement and will 500 if the sibling read schema uses `z.number()`. Omit any column the read schema omits. Discovered via parity testing: a write endpoint included `favorite_categories` (absent from the GET schema) and used `z.int()` where GET used `z.number()` — 500 on every write call.

19. **`after()` + ALS context loss:** `getServerContext()` uses AsyncLocalStorage. Code inside `after(() => ...)` runs outside the original ALS context. Only populate `ctx.fields` in the handler body before returning — never inside `after()` callbacks. The logger flush in `after()` reads from a closure, not ALS. For async-tail logging inside `after()`, import `logger` from `@/lib/api-helpers/axiom` directly.

20. **Returning error response instead of throwing:** v2 handlers must `throw new RecollectApiError(...)`, not `return NextResponse.json({ error: ... })`. The factory catch block handles response formatting. Returning a response directly bypasses Axiom structured logging and may return the wrong HTTP status.

21. **No `console.log` / `warn` / `error` in v2 handlers:** Wide events (`getServerContext()?.fields`) are the only channel for business context. Direct console calls bypass Axiom structured logging and create duplicate, unstructured log noise. Same rule applies to direct `logger.info()` — use `ctx.fields` instead.

22. **Duplicate logging in v2 error paths:** Do NOT log an error before throwing `RecollectApiError`. The factory catch block logs it with full `cause_*` context. Pre-logging creates duplicate Axiom entries for the same failure.

23. **OpenAPI supplement envelope mismatch after v2 migration:** Success examples use bare `T` (e.g. `value: { status: "completed" }`), not `value: { data: { status: "completed" }, error: null }`. Error examples use `{ error: "message" }`, not `{ data: null, error: "message" }`. The scanner handles schemas automatically via `contract: "v2"`, but examples are manually curated and do NOT auto-update. Also strip any `description` strings that reference the old envelope.

24. **V2 URL constants have no leading slash:** `export const V2_X_API = "v2/..."` — the `api` ky instance (`src/lib/api-helpers/api-v2.ts`) prefixes `/api`. Adding a leading slash produces `/api//v2/...` and 404s. v1 constants still carry the leading slash (they use `postApi` / `getApi` from `api.ts`); don't mix the two styles.

25. **No inline `@sentry/nextjs` in v2 routes:** Unknown errors propagate to `onRequestError`, which Sentry is wired to. Inline `Sentry.captureException` duplicates the capture and bypasses the error-code → HTTP-status mapping.

26. **`timingSafeEqual` in `withSecret` is built-in:** Don't reimplement secret comparison. Pass `secretEnvVar: "MY_TOKEN"` and the factory handles timing-safe comparison against `Authorization: Bearer <value>`. Length pre-check is required by `timingSafeEqual` — the factory does this too; hand-rolled comparisons that skip it throw on mismatched lengths.

27. **`withPublic` handler context uses `input`, not `data`:** Unlike `withAuth` which destructures `{ data, ... }`, `withPublic` and `withSecret` destructure `{ input, route }`. Mismatching these silently binds `undefined`.

28. **v1 routes that manually call `createApiClient()` are still `withPublic`:** When a v1 `createGetApiHandler` / `createPostApiHandler` route creates its own Supabase client inside the handler, the correct v2 mapping is `withPublic` — not `withAuth`. OpenAPI marks the route as unauthenticated (no `bearerAuth`), and the handler keeps doing its own auth work. Check `.config.auth` on the scanner output after migration to confirm.

29. **Never `void (async () => {...})()` for fire-and-forget:** Breaks React / Next.js transition tracking and trips the `no-floating-promises` lint rule. Use `after(async () => { try ... catch { logger.warn(...) } })` from `next/server` instead. Import `logger` from `@/lib/api-helpers/axiom`.

30. **Every Zod field needs `.meta({ description })`:** Required on every field — flows to the OpenAPI spec and Scalar UI. Missing descriptions surface as warnings in `npx tsx scripts/generate-openapi.ts`. Reuse the sibling GET's schema and its descriptions when building an output schema for a write endpoint that returns the same row.

31. **Agent scope fence:** Per-route migration touches exactly these files — new v2 `route.ts` + `schema.ts`, new OpenAPI supplement, one constant appended to `src/utils/constants.ts`, barrel update, one JSDoc hunk on the v1 route, and the caller hook(s) that fetch this exact route. Don't touch any other route, any other caller, `apiTypes.ts`, `supabaseCrudHelpers` (except removing a single entry whose last consumer just repointed), or caller-migration batch prompts. No git operations.

32. **Schema alignment for Supabase `Json` columns:** Fields like `ai_features_toggle`, `bookmarks_view`, `category_order` store JSON shapes. On input schemas use `z.unknown()` (let Supabase accept the shape). On output schemas, prefer `z.unknown()` unless every consumer of the existing sibling schema depends on a stricter shape — matching the sibling is more important than tightening.

33. **No production builds during iteration:** `npx tsx scripts/generate-openapi.ts` is the fast spec check. `pnpm build` runs OpenAPI gen + `next build` + serwist and is only needed at end-of-migration verification. The dev server is always running — use it for E2E testing via `/recollect-api-tester`.
