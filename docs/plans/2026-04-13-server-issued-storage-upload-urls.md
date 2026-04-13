# Server-Issued Storage Upload URLs

## Problem Statement

When I upload a file (image, audio, video, PDF) from the web app, the file silently never reaches storage in local development, and the bookmark row is created against a non-existent object. The downstream enrichment pipeline then errors out (image-caption fetch returns 400, blurhash throws "unsupported file type", video uploads hard-fail with "thumbnailPath is missing"). The browser console shows the file looks "uploaded" optimistically, but no actual binary made it across.

In production the upload itself works, but the browser bundle currently ships full Cloudflare R2 credentials (account ID, access key ID, secret access key). Anyone reading my deployed JavaScript bundle has admin-level access to my entire R2 bucket — I can add, modify, list, or delete arbitrary objects belonging to any user. This is a credential exposure I should not be making.

The two issues share one root cause: the web client constructs storage signed URLs by itself, which forces it to either possess a service-role / R2-secret key in the browser, or fail. There is no scenario where shipping those credentials to every visitor's browser is the right answer.

## Solution

The browser stops generating storage URLs entirely. Instead, when the client wants to upload a file, it asks the server "give me a signed upload URL for a file of this kind, with this filename, of this size and content-type." The server validates the request, derives the storage path itself, and returns a short-lived signed URL plus the public URL the client can save with its bookmark. The client PUTs the file binary directly to storage using that signed URL — the file never tunnels through Next.js — then calls the existing upload-file endpoint with the metadata.

After this lands, no Cloudflare R2 credential and no Supabase service-role key is reachable from any browser bundle. Local development uses the same code path as production; the local-dev environment-variable patch shipped today (`NEXT_PUBLIC_DEV_SUPABASE_SERVICE_KEY`) is removed.

## User Stories

1. As a web user uploading a JPEG bookmark, I want the file to actually reach storage on my first attempt, so that the bookmark page shows a real thumbnail instead of a broken image.
2. As a web user uploading an MP3, I want the file to reach storage and the bookmark to show the audio waveform fallback art, so that I can recognize the bookmark in my library.
3. As a web user uploading an MP4 video, I want both the video and its generated thumbnail to reach storage, so that the bookmark card shows a poster frame instead of failing the whole upload.
4. As a web user uploading a PDF, I want the document and the auto-generated page-1 thumbnail to reach storage, so that I see a recognizable preview in my library.
5. As a web user, I want the client to refuse to attempt an upload outside my own user folder, so that a buggy or malicious page script cannot trick me into clobbering another user's storage.
6. As an authenticated user, I want the server to reject any signed-URL request whose target path is not under my own user prefix, so that even if a request bypasses the client guard, the storage layer remains tenant-isolated.
7. As an authenticated user, I want each issued upload URL to expire within an hour, so that a leaked URL has a short window of abuse.
8. As a security-conscious operator, I want the production browser bundle to contain zero credentials capable of mutating storage, so that an attacker reading my JavaScript cannot impersonate the application against R2 or Supabase.
9. As a security-conscious operator, I want the local-development bundle to also contain zero credentials capable of mutating storage, so that the security model in dev mirrors production and we never normalize service-key exposure during demos or screen-shares.
10. As a developer working locally, I want file upload to work without setting any new browser-exposed environment variable, so that onboarding a fresh `pnpm install` + `pnpm dev` produces a working upload flow against local Supabase storage.
11. As a developer reading the codebase, I want the storage-helpers module to be impossible to import from a client component or browser-runtime hook, so that I cannot accidentally reintroduce credential exposure.
12. As a developer touching upload code, I want a single helper hook on the client that handles "fetch signed URL → PUT → return public URL," so that I do not have to recopy the three-step dance for every new upload feature.
13. As a developer writing a new upload feature (e.g. a new file kind), I want to add the kind by extending one server-side enum and one server-side path builder, so that I do not have to change client code to support it.
14. As an iOS engineer, I want the new server route to live under a dedicated `v3` namespace separate from v1 and v2, so that I can adopt it on my own schedule with a clearly versioned contract and without coordinating my release with the web team's cutover.
15. As an iOS engineer, I want v1 and v2 storage routes to remain functional but be marked deprecated in OpenAPI, so that the web cutover does not break my app and I have unambiguous migration guidance.
16. As a web user attempting to upload a 200MB file when the bucket limit is 50MB, I want the failure to surface as a clear toast on first click (server rejects URL issuance), so that I do not wait through a long PUT only to see it fail at the storage edge.
17. As a web user with flaky network, I want the upload pipeline to fail fast and surface a meaningful toast if any of {URL issuance, storage PUT, metadata POST} fails, so that I know whether to retry, refresh, or give up.
18. As a web user, I want the optimistic bookmark card to roll back if the actual upload fails, so that my library does not show ghost entries that disappear on refresh.
19. As a developer, I want the new POST route's input schema, output schema, and OpenAPI supplement to follow the same conventions as every other v2/v3 route, so that the public Scalar UI documentation stays consistent.
20. As a developer, I want the path-derivation logic to be a pure function with no I/O, so that I can read it once and confidently predict storage layout for every kind of upload.
21. As a developer, I want the new server route to populate Axiom wide-event fields (`user_id`, `kind`, `derived_key`, `content_type`, `declared_size`, plus issuance outcome flags), so that I can debug malformed upload requests in production without reproducing them.
22. As a developer, I want known errors (forbidden path, kind-not-allowed, validation failure) to use `RecollectApiError` with appropriate codes and to never reach Sentry, while unknown errors (R2/Supabase outages) to surface in Sentry, so that the alerting signal stays clean.
23. As an operator removing R2 credentials from the browser, I want server-side R2 client initialization to read non-`NEXT_PUBLIC_` environment variables, so that the bundle no longer leaks them and CI/Vercel env config explicitly distinguishes server-only from client-public.
24. As a developer, I want an automated check (in the verification step before commit) that grep-confirms `NEXT_PUBLIC_CLOUDFLARE_ACCESS_KEY_ID` and `NEXT_PUBLIC_CLOUDFLARE_SECRET_ACCESS_KEY` are absent from the production client bundle, so that a future regression cannot silently re-leak the credentials.
25. As a developer, I want `useFileUploadOptimisticMutation`, `handlePdfThumbnailAndUpload`, and the inline video-thumbnail upload to all funnel through the same upload helper, so that fixing a bug in one place fixes it everywhere.
26. As a developer, I want the new helper hook's interface (input arguments, return shape, error type) to mirror upstream React Query mutation conventions, so that callers do not learn a bespoke vocabulary for storage uploads.

## Implementation Decisions

### Storage backend boundary

- All `utils/storageClient.ts` and `utils/r2Client.ts` exports become server-only. They are never imported by any file that ends up in the browser bundle.
- The Cloudflare R2 environment variables (`NEXT_PUBLIC_CLOUDFLARE_ACCESS_KEY_ID`, `NEXT_PUBLIC_CLOUDFLARE_SECRET_ACCESS_KEY`, `NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID`) are renamed to drop the `NEXT_PUBLIC_` prefix and are migrated from the client env schema to the server env schema. The bucket _name_ and the public-bucket _URL_ remain client-public because the client needs to resolve `getStoragePublicBaseUrl()` for read-only display, and neither value grants any mutation capability.
- The local-dev workaround introduced today (`NEXT_PUBLIC_DEV_SUPABASE_SERVICE_KEY` exposed to the browser, and the matching client-side `createServiceClient()` fallback) is removed as part of this work. Once the client no longer constructs signed URLs at all, the browser has no reason to hold any service key.

### New v3 route

- Endpoint: `POST /api/v3/storage/upload-url`.
- Auth: required (`withAuth`). The handler reads the requesting user from the auth context, never from input.
- Input contract: a `kind` discriminator (`"file" | "video-thumbnail" | "pdf-thumbnail"`), the original `fileName`, the declared `contentType`, and the declared `size`. The client never sends a storage `key` or `bucket`.
- Output contract: `{ signedUrl, key, publicUrl, expiresAt }`. The client uses `signedUrl` for the PUT, persists `key` for later metadata calls (e.g. as the `thumbnailPath` field of the upload-file endpoint), and uses `publicUrl` for optimistic UI.
- Expiration: 1 hour, fixed.
- The route lives in the App Router under `src/app/api/v3/storage/upload-url/`, follows the existing v2 conventions (Zod input/output schemas in colocated `schema.ts`, OpenAPI supplement in `src/lib/openapi/endpoints/storage/`, `RecollectApiError` for known failures, Axiom wide-event fields populated before any throw).

### Path derivation and authorization

- A new pure module owns the entire mapping from `(kind, userId, fileName)` to a storage `key`. It is the single source of truth for where files live in the bucket. Both URL issuance and (where needed) downstream consumers import from it.
- The same module exposes a pure ownership predicate: given a `key` and a `userId`, does the key belong to that user under any allowed kind? The route handler calls this predicate after derivation as a defense-in-depth check, even though the derivation already constructs the path from the authenticated `userId`.
- Allowed prefixes (per existing convention): `files/public/{userId}/...` for primary file uploads and PDF/video thumbnails. New kinds extend the module's enum + path table; nothing else changes.
- Filename sanitization is applied inside the path-derivation module using the existing `parseUploadFileName` helper, so the client cannot smuggle path traversal characters via `fileName`.

### Server modules

- **StorageKeyBuilder** (server-only, pure): `buildKey({kind, userId, fileName})` → `key`. Owns the storage layout convention.
- **StoragePathAuthorizer** (server-only, pure): `assertOwnsKey({key, userId})` — throws `RecollectApiError("forbidden", …)` on mismatch. Cheap, no I/O.
- **SignedUploadUrlIssuer** (server-only): `issueUploadUrl({kind, userId, fileName, contentType, size})` → `{signedUrl, key, publicUrl, expiresAt}`. Internally calls KeyBuilder, then storageHelpers, then constructs the public URL. The route handler is a ~20-line wrapper around this.

### Client modules

- **`useStorageUpload` hook** (client): exposes `uploadToStorage({file, kind, fileName?})` returning `{key, publicUrl}` on success, throwing on failure. Internally: POSTs to the new v3 route via the `api` ky instance, performs the storage PUT with the returned `signedUrl` and the file's content-type, and surfaces a typed error on any non-2xx. All three current upload sites (`useFileUploadOptimisticMutation` main + video-thumbnail branch, `handlePdfThumbnailAndUpload`) consume this hook.
- The optimistic mutation continues to own its own React Query cache updates and toast messaging — `useStorageUpload` is purely the "get URL → PUT → return URL" pipe.

### Deprecation of existing routes

- `GET /api/v2/bucket/get/signed-url` is marked `@deprecated` in its OpenAPI supplement with a pointer to the v3 endpoint. The route remains functional for one release cycle, then is removed. (It currently has zero callers in `src/`, so deprecation is a paper trail rather than a behavior change.)
- `GET /api/v1/bucket/get/signed-url` is treated identically: deprecation note added, route left functional, removed in a follow-up release once mobile clients have migrated. Web does not reference it.
- The `pages/api/v1/bucket/get/signed-url.tsx` file may be referenced by iOS — coordinate before deletion.

### V3 namespace conventions

- `v3` is introduced as a sibling of `v2` under `src/app/api/v3/`. It adopts every v2 convention (`createAxiomRouteHandler` + `withAuth` factory, Zod schemas, OpenAPI supplements, `RecollectApiError` routing, Axiom wide events). The only difference is the URL prefix, which signals to mobile clients that the contract is a clean break from v2 storage routes.
- A v3 URL constants block is added to `src/utils/constants.ts` (no leading slash, matching v2 convention) and a v3 ky instance is provided if the existing v2 `api` instance does not already prepend a configurable prefix. (Need to verify during implementation — if the v2 ky instance is path-agnostic, no new ky setup is required.)

### Observability

- The route's Axiom wide event includes: `user_id`, `kind`, `file_name`, `content_type`, `declared_size`, `derived_key`, and on outcome: `signed_url_issued: true | false`, plus error-typed fields per the existing v2 patterns.
- The client hook does not log directly — failures bubble up to the calling mutation's existing toast and Sentry breadcrumb logic.

## Testing Decisions

A good test in this codebase asserts external behavior of a route or pure helper through its public interface (HTTP request → HTTP response, function input → function output) without reaching into internals. It does not mock the storage backend at the unit level and pretend that proves the integration; integration assertions go against the real local Supabase storage.

The repo currently has no test runner configured (`pnpm test` exits 0 with "no test specified"), so the practical testing strategy is a mix of (a) reusable HTTP test routes under `src/app/api/v3/tests/storage/` mirroring the existing `src/app/api/v2/tests/file/post/upload/route.ts` precedent, and (b) manual verification through `/agent-browser` against the local dev server.

- **StorageKeyBuilder**: pure-function tests would be the highest-leverage place to add Vitest if we choose to introduce a runner as part of this work. Inputs are small enums + strings, outputs are deterministic strings. Until a runner exists, treat the path-derivation logic as code-review-critical and document the layout in the module's leading comment.
- **StoragePathAuthorizer**: same as above. Pure, deterministic, easy to exhaust.
- **`/api/v3/storage/upload-url` route**: a smoke-test route under `src/app/api/v3/tests/storage/` exercises end-to-end issuance against the local Supabase backend, parallel to how `/api/v2/tests/file/post/upload` is structured today. Manual `/agent-browser` runs verify the happy paths for all three kinds.
- **`useStorageUpload` hook**: not unit tested at this stage. Verified through the existing manual upload flows in `/agent-browser` (image, mp3, mp4, pdf).

If the user decides to introduce Vitest as part of this work, the first three modules above are the priority targets. The PRD does not assume a runner is added — that is a separate decision.

## Out of Scope

- Adding a JavaScript test runner (Vitest/Jest/Playwright) to the project. If desired, that lands as a separate PR before this one so the new modules can ship with tests.
- Migrating any _non-upload_ storage operation. Server-side `uploadObject`, `getPublicUrl`, `listObjects`, `deleteObject(s)`, and download-signed-URL helpers continue to live inside server routes and helpers as today. No client code calls them.
- The profile-pic upload at `POST /api/v2/settings/upload-profile-pic` already uses a server-side proxy upload model (file binary tunnels through Next.js, no signed URL). It is not migrated to the new flow, because the proxy model already keeps credentials server-only and there is no security gain from changing it.
- The graceful-degradation work I flagged earlier (video upload should not hard-fail when thumbnail generation fails). Tracked separately.
- iOS app migration. The new route exists and is documented; iOS adopts on its own timeline.
- Cleaning up the now-unused `NEXT_PUBLIC_DEV_SUPABASE_SERVICE_KEY` env var on developer machines beyond removing it from `.env.example` and the schema. Each developer removes it from their own `.env.local` after pulling.

## Further Notes

- **Why v3 and not extend v2**: the existing `/v2/bucket/get/signed-url` is shaped wrong (GET, raw `filePath` input, no kind, no content-type, no size). Extending it would carry the awkward shape forward and force iOS to adopt two confusing variants of the same idea. A clean v3 route signals the contract change explicitly, lets the existing routes be deprecated with a clear sunset, and matches the repo's documented direction toward higher API versions.
- **Why path derivation lives server-side**: as long as the client constructs storage keys, every new upload feature has to coordinate path conventions across two boundaries, and a typo on the client can produce orphaned uploads (file lands in storage, key never persisted to DB) or cross-tenant collisions. Centralizing on the server collapses both risks.
- **Why no Content-Type baking right now**: keeping the first version of the route minimal. The bucket already enforces an `allowed_mime_types` whitelist at the storage layer, and the client always sends a content-type on PUT. Baking content-type into the signed URL is an obvious follow-up if we observe abuse, and the route's input already accepts `contentType` for that reason.
- **Why no rate limiting right now**: Supabase/R2 each enforce their own quotas, and there is no Upstash or Redis integration in the current stack to lean on. Adding it is its own decision; out of scope here.
- **Local-dev cleanup**: the `NEXT_PUBLIC_DEV_SUPABASE_SERVICE_KEY` env var, the `env.client.ts` schema entry, the `.env.example` line, and the corresponding fallback inside `supabaseClient.ts` are all reverted as part of this PRD's implementation, not in a follow-up.
- **R2 env rename**: the rename from `NEXT_PUBLIC_CLOUDFLARE_*` to `CLOUDFLARE_*` requires updating Vercel project env vars (preview + production scopes) before the cutover, otherwise the server-side R2 client fails to initialize. Coordinate the Vercel env update with the deployment.
- **Mobile coordination**: file a follow-up ticket targeted at the iOS owner (per the team-context memory, that's Karthik) describing the v3 contract, the deprecation timeline for v1/v2 storage routes, and a recommended migration path. The web cutover does not block on mobile sign-off, only on the shared deprecation note in OpenAPI.
- **Verification**: after implementation, the verification gate includes (a) `pnpm fix` → `pnpm lint` → `pnpm build` per the existing project rules, (b) a grep against the production bundle output to confirm `CLOUDFLARE_ACCESS_KEY_ID` and `CLOUDFLARE_SECRET_ACCESS_KEY` strings are absent, and (c) manual upload of one of each file kind (image / mp3 / mp4 / pdf) through `/agent-browser` against `http://localhost:3000`.
