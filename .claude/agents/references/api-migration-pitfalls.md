# API Migration Pitfalls

Known pitfalls discovered during production API migrations. Read by the `recollect-api-migrator` agent at Step 1. Append new discoveries at the end.

---

1. **Timestamp coercion:** Use `z.string()` for output timestamps, NOT `z.iso.datetime()`. Supabase returns `+00:00` offset. Only use `z.iso.datetime()` for input schemas where client sends `Z`-suffix.

2. **Chain ordering:** Migrate callee before caller. But v2 handlers still call OLD URLs — caller URL updates happen in Phase 13.

3. **Object.assign schema mismatch:** Handler MUST use the same Zod schemas from `schema.ts` as in the config. Two sources of truth = spec drift.

4. **Service-role client:** Use `createServerServiceClient()` from `src/lib/supabase/service.ts` (App Router), NOT `createServiceClient` from `src/utils/supabaseClient.ts` (legacy).

5. **z.looseObject:** Infers `{ [x: string]: unknown }`, incompatible with Supabase `Json` type. Use `z.object`.

6. **Scanner WithServiceRole guard:** When migrating first service-role route, add guard to `isAuthRequired()` in `scripts/generate-openapi.ts` — "WithServiceRole" contains "WithAuth" substring.

7. **Schema source of truth:** Build output schemas from `src/types/database-generated.types.ts`, never from `src/types/apiTypes.ts`. Old types use `as unknown as` casts with phantom fields.

8. **Nullable columns:** If `database-generated.types.ts` shows `field: string | null`, Zod MUST use `z.string().nullable()`. Using `z.string()` alone causes output validation → 500.

9. **No production builds:** Never run `pnpm build` or `npx next build` — the dev server is always running and build verification is handled by CI during PRs. Use Chrome MCP against the dev server for E2E testing instead.

10. **DB type grep patterns:** Never use `tableName.*Row` to search `database-generated.types.ts` — the `Row` type is on a different line. Search for just the table name (e.g., `tags:`) with `-A 20` context lines.

11. **Supplement example timestamps:** Use `+00:00` offset format in example data (e.g., `"2024-03-15T10:30:00+00:00"`), not Z-suffix (`"2024-03-15T10:30:00Z"`), to match actual Supabase output format.

12. **Two-phase supplement creation:** Step 3 creates metadata-only (no examples). Step 4c adds examples after E2E. Do NOT fabricate examples in Step 3. If `/recollect-api-tester` skill cannot execute (Chrome MCP or Supabase MCP unavailable), E2E is skipped — report this to the user so they can fix the dependency and run E2E separately. Supplement will have no examples until E2E passes.

13. **No PII in examples:** Never use real email addresses, names, or user IDs in supplement examples. Use placeholders: `user@example.com`, `another@example.com`, `550e8400-e29b-41d4-a716-446655440000`. The developer substitutes real values when testing in Scalar.

14. **HTTP method semantics:** Never blindly copy v1's HTTP method. v1 uses POST for everything (reads, updates, deletes). v2 must use GET/POST/PUT/PATCH/DELETE based on the actual operation. See HTTP Method Semantics in reference file for decision rules.

15. **Lodash ESM incompatibility in scanner:** Importing from `@/utils/helpers` (which imports `{ isEmpty } from "lodash"`) causes the OpenAPI scanner (`tsx`) to fail with ESM named-export errors. Workaround: inline small utility functions in the route file or use the `Object.assign` pattern. This is a scanner limitation, not a runtime issue.

16. **Binary responses use factory with NextResponse passthrough:** Routes returning binary data (e.g., PDF streaming) CAN use factories. Return `new NextResponse(buffer, { headers })` (not `Response`) — the factory detects `instanceof NextResponse` and passes through without JSON wrapping. Only use `Object.assign` for routes that genuinely can't use a factory (multipart, SSE).

17. **ISR revalidation in App Router:** `res.revalidate(path)` is Pages Router only. App Router equivalent is `revalidatePath(path)` from `next/cache`. The revalidate v2 route must import from `next/cache`, not call `res.revalidate()`.

18. **CORS headers in App Router:** Unlike Pages Router's `res.setHeader()`, App Router returns `new NextResponse()` or `Response()` with headers in the constructor. When preserving CORS headers from v1, set them on the Response object: `NextResponse.json(data, { headers: { 'Access-Control-Allow-Origin': '*' } })`.

19. **Service-role client in public factory handlers:** `createGetApiHandler` / `createPostApiHandler` don't provide a Supabase client — the handler must create its own via `createServiceClient()` from `@/utils/supabaseClient` or `createServerServiceClient()` from `@/lib/supabase/service`. This is correct for endpoints needing service-role access without user auth (e.g., process-queue, fetch-public-category-bookmarks).

20. **Caller URL exceptions:** `revalidation-helpers.ts` is updated to v2 URL in Phase 9 (not Phase 13) because it's a server-to-self internal call. Document this exception in the SUMMARY so Phase 13 doesn't double-update. All other callers (Chrome extension, Cypress tests, frontend hooks) wait for Phase 13.

21. **Drop lodash in v2 migrations:** Replace `isNull`/`isNil` with `isNullable()` from `@/utils/`, replace `isEmpty` with `array.length === 0`, replace `omit` with destructuring rest `const { removed, ...rest } = obj`.

22. **Output schema parity with read endpoints:** When a write endpoint (PATCH/PUT/DELETE) returns the full record via `.select()`, its output schema MUST match the corresponding GET endpoint's proven output schema for the same table. Three rules: (a) Don't include fields in the write output schema that aren't in the read output schema — Zod silently strips extra fields on read but fails validation on write. (b) Use `z.number()` not `z.int()` for numeric output fields — `z.int()` adds a `Number.isInteger()` refinement that provides no benefit for output validation and creates unnecessary failure risk. (c) When a column exists in `database-generated.types.ts` but the read schema omits it, the write schema should also omit it. Discovered via parity testing: `update-user-profile` included `favorite_categories` (absent from `fetch-user-profile` GET schema) and used `z.int()` where GET used `z.number()` — caused 500 on every PATCH call.

23. **`after()` + ALS context loss:** `getServerContext()` uses AsyncLocalStorage. Code inside `after(() => ...)` runs outside the original ALS context. Only populate `ctx.fields` in the handler body before returning — never inside `after()` callbacks. The logger flush in `after()` reads from a closure, not ALS.

24. **Wrong Axiom formatter subpath:** `@axiomhq/nextjs` exports multiple formatter functions. Route handlers must use `withAxiom` from `@axiomhq/nextjs` (not `@axiomhq/nextjs/edge` or `@axiomhq/nextjs/rsc`). Using the wrong subpath causes silent log drops or type errors.

25. **Returning error response instead of throwing:** v2 handlers must `throw new RecollectApiError(...)`, NOT `return NextResponse.json({error: ...})` or `return error(...)`. The factory catch block handles response formatting. Returning a response directly bypasses Axiom logging and may return incorrect HTTP status.

26. **No console.log in v2 handlers:** v2 handlers use wide events (`getServerContext()?.fields`) for business context, not `console.log`/`console.warn`/`console.error`. Direct console calls bypass Axiom structured logging and create duplicate, unstructured log noise.

27. **Duplicate logging in v2 error paths:** Do NOT log an error before throwing `RecollectApiError`. The factory catch block logs the error with full context. Pre-logging creates duplicate Axiom entries for the same failure.
