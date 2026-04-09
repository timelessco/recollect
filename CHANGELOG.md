# Changelog

## [0.5.0](https://github.com/timelessco/recollect/compare/v0.4.0...v0.5.0) (2026-04-09)

### 👀 Notable Changes


#### `bookmarks` — 🐛 re-render card when categories swap during drag-drop

> <sub>BookmarkCard's memo comparator checked addedCategories by length only. When a bookmark is dragged from category A into category B, the array length stays at 1, so the memo returned true and the card skipped the re-render — leaving the category chip visually stuck on the old category until the next unrelated update.
> 
> Compare by joined category ids instead so a swap at the same index forces a re-render while refetched-but-unchanged bookmarks still bail the memo as intended.</sub>

<sub>Introduced in [`98dad5c2`](https://github.com/timelessco/recollect/commit/98dad5c254d8dba5dba0b8ff38eecdcafcef0d1a)</sub>


---


#### `favorites` — 🐛 harden drop target resolution in useHandleBookmarksDrop

> <sub>Two related fixes to the drop handler:
> 
> - Guard against NaN categoryId from Number.parseInt on non-numeric   target.key values, aborting the drop early. - Remove the silent fallback to the current route's CATEGORY_ID when   the drop-target category is missing from the cache. The fallback was   subtly wrong: access was checked against the route's category, but   the mutation still wrote to the original drop-target ID — meaning   a bookmark could be added to category X based on edit access of   category Y. Now we abort when the target isn't found.
> 
> useGetCurrentCategoryId is no longer needed here and is removed.</sub>

<sub>Introduced in [`0a9a4766`](https://github.com/timelessco/recollect/commit/0a9a4766bb102b18c7a8e554864b789a59ec2725)</sub>


---


#### `favorites` — 🐛 restore drag-and-drop of bookmarks onto favourites

> <sub>The Favourites sidebar section accepted card drops but never moved the bookmark into the target category. When `ReorderableListBox` was</sub>

<sub>Introduced in [`b7641ae7`](https://github.com/timelessco/recollect/commit/b7641ae7d005d427fc37eaba88b2b50c8dba291d)</sub>


---


#### `ci` — 🐛 prevent noise entries in API changelog

> <sub>- Add paths filter to only trigger on OpenAPI-relevant files - Pin oasdiff to v1.13.1 to prevent output format surprises - Strip "No changes" lines before whitespace guard check</sub>

<sub>Introduced in [`22fd9013`](https://github.com/timelessco/recollect/commit/22fd90131f071fcc9bca606fb615e34be0b15bec)</sub>


---


#### `seo` — 🔍️ restrict robots to public routes and simplify sitemap

> <sub>- Disallow all routes by default, allow only /discover, /login, /public - Remove homepage from sitemap since it redirects to /everything (auth-gated) - Add TODO for dynamic /public/[user_name]/[id] sitemap generation</sub>

<sub>Introduced in [`4e27f818`](https://github.com/timelessco/recollect/commit/4e27f8188b7a537f74fdde7172cdf3640007ac16)</sub>


---


#### `pwa` — ✨ add Serwist service worker and PWA assets

> <sub>- Replace next-pwa with @serwist/next for service worker management - Add manifest.ts, robots.ts, sitemap.ts as App Router metadata files - Remove next-sitemap.config.cjs in favor of native Next.js sitemap - Generate PWA icons, splash screens, and apple-icon from icon.svg - Add offline fallback page at /~offline with reload button - Wire SerwistProvider into Pages Router _app.tsx - Add dev:pwa script for concurrent serwist watch + next dev</sub>

<sub>Introduced in [`060e20c8`](https://github.com/timelessco/recollect/commit/060e20c88ae4dad9e441d8a0bed5d931339810cc)</sub>


---


#### `api` — extract cause fields in RecollectApiError.toLogContext for Axiom

> <sub>toLogContext() now reads cause.message, cause.code, cause.details, and cause.hint from the inner error (e.g. Supabase PostgrestError) and logs them as cause_* fields in Axiom wide events. Previously the cause was stored in memory but never serialized — inner error details were lost.
> 
> Works automatically for all v2 routes that throw RecollectApiError with a cause parameter. No per-route changes needed.
> 
> Also reverts redundant manual ctx.fields RPC error logging from the search-bookmarks route — the framework handles it now.</sub>

<sub>Introduced in [`c3989810`](https://github.com/timelessco/recollect/commit/c39898107f13956c22848ede32f7a9a0c9b1d3aa)</sub>


---


#### `api` — 🔀 migrate fetch-bookmarks-count caller to v2 ky client

> <sub>- Replace axios crud helper with ky api.get() and v2 field mapping - Remove session from queryFn (cookie-based auth), keep in queryKey - Update 4 direct consumers and 4 indirect cache readers - Flatten optionsMenuListArray param type (remove .data envelope) - Remove getBookmarksCount crud helper and FETCH_BOOKMARKS_COUNT constant - Deprecate Pages Router route</sub>

<sub>Introduced in [`493f9a30`](https://github.com/timelessco/recollect/commit/493f9a3091cdd4f9c450792b94412c5e5ad5dcd9)</sub>


---


#### `api` — 🗑️ remove stale useFetchBookmarkById.ts

> <sub>- Old PascalCase file wasn't deleted during git mv + content rewrite - CI failed: supabaseCrudHelpers import of removed fetchBookmarkById</sub>

<sub>Introduced in [`1dd94a90`](https://github.com/timelessco/recollect/commit/1dd94a9096700ebbd7f0d137994d4fa46a57640e)</sub>


---


#### `api` — 🔀 migrate fetch-bookmark-by-id caller to v2 ky client

> <sub>- Rewrite useFetchBookmarkById hook from axios crud helper to ky api-v2 - Rename hook file to kebab-case (use-fetch-bookmark-by-id.ts) - Update 3 consumers: preview/[id].tsx, LightBoxPlugin.tsx, use-bookmark-relation.ts cache reader - Remove fetchBookmarkById from supabaseCrudHelpers and orphaned constants - Deprecate v1 Pages Router route with @deprecated JSDoc - Add SingleListData type gap gotcha and update caller-migration skill with BCALL-02 learnings</sub>

<sub>Introduced in [`51e673ce`](https://github.com/timelessco/recollect/commit/51e673ce261f18c8a2b956d5a881cae0ea998719)</sub>


---


#### `db` — merge pre-existing additional_keywords instead of overwriting

> <sub>jsonb || gives right-hand side precedence — if features had both numeric keys and an existing additional_keywords array, the old array would overwrite the newly aggregated one. Now merges both arrays and excludes additional_keywords from the non-numeric key preservation pass.</sub>

<sub>Introduced in [`39f4ef7c`](https://github.com/timelessco/recollect/commit/39f4ef7cefcacc8c13bf0931a57b73f4ce789f98)</sub>


---


#### `db` — migrate image_keywords numeric-keyed features to additional_keywords array

> <sub>The 20260324 migration incorrectly converted legacy array image_keywords into `{"features": {"0": "kw1", "1": "kw2"}}` with numeric index keys. This migration converts those to `{"features": {"additional_keywords": [...]}}` and handles any remaining legacy arrays.</sub>

<sub>Introduced in [`6c060e05`](https://github.com/timelessco/recollect/commit/6c060e05e4358ac06300d27de70e9603e12c61b5)</sub>


---


#### `api` — ✨ add v2 bucket/get/signed-url route

> <sub>- Create GET /api/v2/bucket/get/signed-url with withAuth factory - Register new "Bucket" OpenAPI tag and supplement domain - Add caller migration tracker doc for remaining route work</sub>

<sub>Introduced in [`0fb8d109`](https://github.com/timelessco/recollect/commit/0fb8d109c297a55ae4a7d2b9a8a62deb7691e685)</sub>


---


#### `api` — add enrichment audit script, fix PII flag in public bookmarks

> <sub>Create scripts/verify-enrichment.sh — one-shot audit of all 41 v2 routes for ctx.fields completeness, PII violations, console calls, and Sentry-in-after. Advisory output only (exit 0). Rename ctx.fields.username → user_slug in fetch-public-category-bookmarks (public URL slug, not PII — avoids false positive).
> 
> Phase 21 Plan 06 — STND-01, STND-02, STND-03, STND-04</sub>

<sub>Introduced in [`35d9fd01`](https://github.com/timelessco/recollect/commit/35d9fd016266ce20bc26a88801028b14fbc01b6c)</sub>


---


#### `skill` — add wide-event-enrichment audit skill

> <sub>Post-implementation audit for v2 API route ctx.fields patterns. 8-point checklist: getServerContext import, entity-before-operation, outcome flags, minimum fields, PII compliance, no console.*, no Sentry in after(), proper error formatting. Includes references/patterns.md with canonical examples from Phase 21 enrichment work.</sub>

<sub>Introduced in [`1c4756b2`](https://github.com/timelessco/recollect/commit/1c4756b2ca2cab29e0a29f2b009711f6dc6fa38d)</sub>


---


#### `api` — enrich queue and file routes with wide event context

> <sub>Apply entity-before-operation pattern to 3 routes. process-queue: queue_name before, processed_count after. upload-file-remaining-data: entity IDs before, enrichment_completed after. upload-profile-pic: profile_pic_uploaded outcome. ai-enrichment (21 fields) and screenshot (9 fields) verified already rich.
> 
> Phase 21 Plan 05 — QUEUE-01, QUEUE-02, FILE-01</sub>

<sub>Introduced in [`1228b142`](https://github.com/timelessco/recollect/commit/1228b1427dc94f89425a8652d7fb3b82a6967c77)</sub>


---


#### `api` — enrich share, API key, utility routes with wide event context

> <sub>Apply entity-before-operation pattern to 11 routes. PII fixes: replaced recipient_email with recipient_count, collaboration_email with has_collaboration_email, provider email with has_email. Added outcome flags: email_sent, role_updated, key_deleted, key_upserted, revalidated, pdf_fetched, invite_accepted, category_found. pdf-buffer gets content_type + pdf_size_bytes.
> 
> Phase 21 Plan 04 — SHARE-01, KEY-01, UTIL-01</sub>

<sub>Introduced in [`d4669832`](https://github.com/timelessco/recollect/commit/d4669832d647d4091dde4a35fd442f348473db78)</sub>


---


#### `api` — enrich profile, category, tag routes with wide event context

> <sub>Apply entity-before-operation pattern to all 8 routes. Profile routes: profile_updated, profile_pic_removed, username_updated+username_length (PII fix: removed raw username), has_profile_pic (PII fix: removed raw email), user_deleted. Category routes: reorder_success, shared_categories_count, returned_count. Tags: user_id moved before query.
> 
> Phase 21 Plan 03 — PROF-01, CAT-01, CAT-02</sub>

<sub>Introduced in [`310ffa42`](https://github.com/timelessco/recollect/commit/310ffa425500c5b58762cee2467c9337dd9095fc)</sub>


---


#### `api` — enrich 7 bookmark routes with wide event business context

> <sub>Add result counts, outcome flags, and parsed search params to bookmark route wide events: total_count/trash_count on fetch-bookmarks-count, bookmarks_returned on fetch-bookmarks-view, enrichment_completed on add-remaining-bookmark-data, deleted on non-cascade, found on fetch-by-id. Replace raw search_query with parsed search_text/tag_name/url_scope on search-bookmarks. bookmarks/insert already complete (bookmark_count).
> 
> Phase 21 Plan 02 — BKMK-01, BKMK-02</sub>

<sub>Introduced in [`b6e66c15`](https://github.com/timelessco/recollect/commit/b6e66c157b31edafc98f5cd4f8c156fbcf9506a4)</sub>


---


#### `color` — smarter color matching — skip achromatic stored colors

> <sub>- Threshold: 170 (RGB distance) - Saturation filter: skip stored colors with max-min channel diff <= 50   (black, gray, white) when searching for chromatic colors - Allows color:black/gray to still match achromatic colors - Fixes: color:green no longer matches red/black bookmarks - Keeps: color:blue matches steel blue, color:red matches dark reds</sub>

<sub>Introduced in [`85623806`](https://github.com/timelessco/recollect/commit/85623806d1220ffed388f635611030808597942f)</sub>


---


#### `color` — strip bare color: prefix from search text

> <sub>color: with no value was left in search text as literal "color:" causing empty results. Now stripped via \S* (zero or more).</sub>

<sub>Introduced in [`f36f336f`](https://github.com/timelessco/recollect/commit/f36f336f5fe7d5ff36c68063c67e2886a30886f1)</sub>


---


#### `color` — drop old RPC overloads so PostgREST resolves color_hex

> <sub>PostgREST was matching the 4-param overload (without color_hex) instead of the 5-param version. Drop the 3 and 4 param overloads so only the 5-param version with color_hex exists.</sub>

<sub>Introduced in [`38d25cbd`](https://github.com/timelessco/recollect/commit/38d25cbd71ab6110e9bf4d46885bfee226e7efb2)</sub>


---


#### `color` — increase color distance threshold from 80 to 200

> <sub>RGB distance 80 was too tight — muted/dark variants of the same</sub>

<sub>Introduced in [`9fa2fc03`](https://github.com/timelessco/recollect/commit/9fa2fc03a2e51f6882e03b9dae45c4169e722741)</sub>


---


#### `color` — filter bookmarks by color distance, not just rank

> <sub>Added WHERE clause to exclude bookmarks without matching stored colors when color_hex is provided. Previously only affected ORDER BY.</sub>

<sub>Introduced in [`317cd77a`](https://github.com/timelessco/recollect/commit/317cd77a6f03676f8391288f2a3ecdd6325ff576)</sub>


---


#### `color` — regenerate DB types to include color_hex RPC parameter

> <sub>The Supabase JS client silently drops parameters not in the generated types — color_hex was being ignored.</sub>

<sub>Introduced in [`225f9ab3`](https://github.com/timelessco/recollect/commit/225f9ab3742badc3ec78206aa0c18f284f2258d3)</sub>


---


#### `color` — fix color search not working

> <sub>- Extract color: prefix from raw search BEFORE tag pattern strips #</sub>

<sub>Introduced in [`556f8f57`](https://github.com/timelessco/recollect/commit/556f8f571d4315d27f31f1dd2a76c0cf8ba2e6e1)</sub>


---


#### `color` — use color: prefix syntax for color search

> <sub>Changes auto-detect to explicit "color:#FF0000" or "color:brown"</sub>

<sub>Introduced in [`649b5093`](https://github.com/timelessco/recollect/commit/649b509301cf43842817c2e2cb0b95eb37cf16de)</sub>


---


#### `color` — fix tooltip not showing in lightbox

> <sub>Use Base UI Tooltip primitives directly to avoid nested button issue (Trigger IS the circle). Bump tooltip z-index to z-10000 to match lightbox overlay layer.</sub>

<sub>Introduced in [`75652692`](https://github.com/timelessco/recollect/commit/756526928b78401f6ad43eefc9a600206ec7047b)</sub>


---


#### `color` — add color distance search to bookmark search RPC

> <sub>Introduces hex_channel() and color_distance() SQL helpers, and updates search_bookmarks_url_tag_scope with an optional color_hex parameter that adds a continuous Euclidean RGB ranking signal (weight 0.12, threshold 80).</sub>

<sub>Introduced in [`e95bb02c`](https://github.com/timelessco/recollect/commit/e95bb02c036fdfe93b2f985d85107509564c104a)</sub>


---


#### `color` — add missing grey alias entries to DISPLAY_NAMES

> <sub>Adds 7 British-spelling grey aliases (darkgrey, dimgrey, grey, lightgrey, lightslategrey, darkslategrey, slategrey) to match all 148 CSS named colors in culori's colorsNamed.</sub>

<sub>Introduced in [`330be998`](https://github.com/timelessco/recollect/commit/330be998d84c129f9cccad4d297b6ff27eeaf22d)</sub>


---


#### `api` — enrich Axiom logger with branch, deployment_id, base_url

> <sub>Add branch (VERCEL_GIT_COMMIT_REF), deployment_id (VERCEL_DEPLOYMENT_ID), and base_url (resolved from VERCEL_ENV + production/branch URL) to every log line. Enables filtering by branch for preview deploys and correlating logs to specific deployments.</sub>

<sub>Introduced in [`11c6d572`](https://github.com/timelessco/recollect/commit/11c6d572dd0b997db0ff454464940dafd5e58518)</sub>


---


#### `api` — add environment field to Axiom logger args

> <sub>Add VERCEL_ENV to logger args so every log line includes environment (production/preview/development). Enables filtering preview vs production issues in Axiom queries.</sub>

<sub>Introduced in [`ef35f8e5`](https://github.com/timelessco/recollect/commit/ef35f8e518f206f092045951073d2eb50714e028)</sub>


---


#### `api` — add withRawBody factory and migrate 3 raw body routes (Phase 19, Plan 03)

> <sub>Add withRawBody factory to create-handler-v2.ts with raw request passthrough, configurable auth flag (SCANNER-ONLY), and RecollectApiError catch.
> 
> Migrate ai-enrichment, screenshot, and upload-profile-pic from createRawPostHandler to createAxiomRouteHandler(withRawBody({...})). Replace all console.log/warn/error with ctx.fields wide events. Replace all Sentry calls — errors propagate to factory. Preserve storeQueueError() calls and two-stage parse pipelines.
> 
> Also fix test route (tests/file/post/upload) — replace console.error and Sentry with ctx.fields and logger.warn.
> 
> Strip v1 envelope from 3 supplements.</sub>

<sub>Introduced in [`a13aee9d`](https://github.com/timelessco/recollect/commit/a13aee9d85b2b8dd66cf977d648ec63efaff1d2f)</sub>


---


#### `api` — replace console.error with logger/ctx.fields in upload-file

> <sub>Use ctx.fields for in-handler errors (processVideo, junction) where ALS is available. Use logger.warn for getMediaType helper and after() catch where ALS is gone — gets errors into Axiom instead of just stdout.</sub>

<sub>Introduced in [`0aadeeaf`](https://github.com/timelessco/recollect/commit/0aadeeaf3311e95228941c822ac3bfe129732245)</sub>


---


#### `api` — migrate 3 Object.Assign routes to layered factory (Phase 19, Plan 04)

> <sub>Migrate get-media-type (CORS + OPTIONS), search-bookmarks (dual-auth), and upload-file (auth + after()) from Object.assign wrappers to createAxiomRouteHandler with appropriate factory layers.
> 
> get-media-type: withPublic with handler-level CORS (D-05 exception), wide event error fields for observability despite handler-level catch.
> 
> search-bookmarks: withPublic with inline conditional auth — discover page is public, non-discover requires user auth with manual ctx.user_id.
> 
> upload-file: withAuth with after() preserved, ctx.fields populated</sub>

<sub>Introduced in [`58aee236`](https://github.com/timelessco/recollect/commit/58aee2369a0bbed3d5de6ccc898388fdd8a5a89e)</sub>


---


#### `api` — add withSecret factory and migrate revalidate route (Phase 19, Plan 02)

> <sub>Add withSecret factory to create-handler-v2.ts with timing-safe bearer token validation (crypto.timingSafeEqual), empty-string env var guard, and scanner-compatible .config (auth: "required", factoryName: "withSecret").
> 
> Migrate revalidate route from createPostApiHandlerWithSecret to createAxiomRouteHandler(withSecret({...})) with bare response and wide events. Strip v1 envelope from supplement.</sub>

<sub>Introduced in [`39512af0`](https://github.com/timelessco/recollect/commit/39512af03a81d9d5b5c8fba57f1652b2abf93a92)</sub>


---


#### `api` — migrate 6 public routes to layered factory (Phase 19, Plan 01)

> <sub>Migrate all public routes (4 GET, 2 POST) from deprecated createGetApiHandler/createPostApiHandler to createAxiomRouteHandler(withPublic({...})) with bare T responses, RecollectApiError throws, and wide events via ctx.fields.
> 
> Routes: fetch-public-category-bookmarks, user/get/provider, bookmarks/get/get-pdf-buffer, invite, share/send-email, process-queue.
> 
> Strip v1 envelope from 5 OpenAPI supplements (bare response examples). Preserve escape hatches: invite redirect, pdf-buffer binary response.</sub>

<sub>Introduced in [`380f9219`](https://github.com/timelessco/recollect/commit/380f92195afb4b561a45ecc8c6fc5c1001ea6a52)</sub>


---


#### `api` — migrate final 4 auth routes to layered factory (Phase 18, Plan 06)

> <sub>Migrate add-url-screenshot (POST), fetch-bookmarks-data (GET), tests/file/post/upload (POST), add-bookmark-min-data (POST) — the after() hardening batch — to v2 createAxiomRouteHandler(withAuth({...})).</sub>

<sub>Introduced in [`d7a8c583`](https://github.com/timelessco/recollect/commit/d7a8c58374ffd48667e7efb995fe61915d8df386)</sub>


---


#### `api` — migrate 8 auth routes to layered factory (Phase 18, Plan 05)

> <sub>Migrate fetch-by-id (GET), delete-shared-categories-user (DELETE), get-gemini-api-key (GET), send-collaboration-email (POST), fetch-user-profile (GET), delete-user (POST), fetch-user-categories (GET), fetch-bookmarks-count (GET) to v2 createAxiomRouteHandler(withAuth({...})).
> 
> - Convert apiError/apiWarn returns to RecollectApiError throws - Remove all console.log/warn/error, add wide events via getServerContext() - Remove direct Sentry imports: best-effort cleanup → wide event fields,   captureMessage/captureException → RecollectApiError throws - fetch-user-profile: inner functions (syncProfilePic, assignUsername) now   throw RecollectApiError instead of returning apiError NextResponse;   instanceof NextResponse guards removed - delete-user: cascade delete throw new Error() preserved (→ Sentry via outer layer) - CryptoJS decrypt + JWT signing logic preserved byte-for-byte - Fix all 8 OpenAPI supplement examples: strip v1 {data, error} envelope to bare T</sub>

<sub>Introduced in [`acc00fbb`](https://github.com/timelessco/recollect/commit/acc00fbb934b25b065e47f2d469e45ba8a54361a)</sub>


---


#### `api` — migrate 8 auth routes to layered factory (Phase 18, Plan 04)

> <sub>Migrate remove-profile-pic (DELETE), update-shared-category-user-role (PATCH), non-cascade delete (DELETE), bookmarks insert (POST), fetch-shared-categories-data (GET), update-user-profile (PATCH), update-username (PATCH), api-key (PUT) to v2 layered factory.
> 
> - Convert apiWarn() to RecollectApiError with correct codes:   400→bad_request, 404→not_found, 409→conflict - Replace apiError() with RecollectApiError throws - Remove all console.log calls, add wide events via getServerContext() - CryptoJS encryption logic in api-key untouched, no key material in ctx.fields - Fix all 8 OpenAPI supplement examples: strip v1 envelope to bare T - Validates all 5 HTTP methods: GET, POST, PATCH, PUT, DELETE</sub>

<sub>Introduced in [`9481d35a`](https://github.com/timelessco/recollect/commit/9481d35af83a030a266378646bdd89fd341667ae)</sub>


---


#### `api` — migrate 4 auth routes to layered factory (Phase 18, Plan 03)

> <sub>Migrate fetch-user-profile-pic (GET), fetch-bookmarks-view (GET), update-category-order (PATCH), delete-api-key (DELETE) from v1 factories to v2 createAxiomRouteHandler(withAuth({...})) pattern.
> 
> - Replace apiError() returns with RecollectApiError throws - Remove console.log calls in favor of wide events via getServerContext() - Add business-relevant ctx.fields per route - Fix OpenAPI supplement examples: strip v1 {data, error} envelope to bare T - First batch with PATCH and DELETE methods validated</sub>

<sub>Introduced in [`f3b36b96`](https://github.com/timelessco/recollect/commit/f3b36b9626799abb64f72f9edd452d10f2a8b2bc)</sub>


---


#### `api` — migrate 3 auth routes to layered factory (Phase 18, Plans 01-02)

> <sub>Migrate add-remaining-bookmark-data (POST), upload-file-remaining-data (POST), and fetch-user-tags (GET) from v1 createXxxApiHandlerWithAuth to v2 createAxiomRouteHandler(withAuth({...})) pattern.
> 
> - Replace apiError() returns with RecollectApiError throws - Remove console.log calls in favor of wide events via getServerContext() - Add business-relevant ctx.fields (user_id, bookmark_id, tag_count, media_type) - Fix OpenAPI supplement examples: strip v1 {data, error} envelope to bare T</sub>

<sub>Introduced in [`ce345a90`](https://github.com/timelessco/recollect/commit/ce345a9067a71b30f54b3e51ed20d9d0a1428cbf)</sub>


---


#### `api` — ✨ production observability with Axiom logging and layered factory

> <sub>Phases 16-17 of v3.0 Production Observability milestone:
> 
> - Layered factory: createAxiomRouteHandler(withAuth/withPublic) with throw-only   RecollectApiError, wide events via ServerContext.fields, deferred flush via after() - Axiom server logging: AxiomJSTransport + ConsoleTransport, env context (commit/region),   status-based log levels (info/warn/error) - Axiom client logging: ProxyTransport to /api/axiom proxy route, useLogger hook,   WebVitals component in root layout - Middleware logging: transformMiddlewareRequest in proxy.ts with event.waitUntil - Sentry restructured: tracesSampler, onRequestError as sole Sentry entry for v2 routes - Pathfinder migration: check-gemini-api-key on new factory with wide events - OpenAPI scanner: dual-factory support, contract-based v2 detection, .config passthrough - Docs: 8 files updated (skills, rules, agent references) for new patterns</sub>

<sub>Introduced in [`0444af25`](https://github.com/timelessco/recollect/commit/0444af25834dfc2bc9125f59589837cfc8b3a977)</sub>


---


#### `api` — ✨ create v2 handler factory with error/warn context helpers

> <sub>Self-contained v2 handler factory (create-handler-v2.ts) that does its own auth and validation — no dependency on response.ts parse helpers. Handler context injects error() and warn() so route handlers never need to import Sentry, NextResponse, or apiError directly.
> 
> - Add create-handler-v2.ts with 7 exported factory functions - Add ky client (api-v2.ts) for frontend v2 callers - Migrate check-gemini-api-key to v2 factory + ky - Remove bare option from create-handler.ts (envelope-only) - Update OpenAPI scanner for v2 bare response schemas - Fix supplement examples to use bare shape - Update CLAUDE.md, skills, and agent references for v2 pattern</sub>

<sub>Introduced in [`465c70a7`](https://github.com/timelessco/recollect/commit/465c70a7048389e1a6e1004369d3bb0f351bd5a1)</sub>


---


#### `api` — ✨ migrate check-gemini-api-key caller to v2 and create caller migration skill

> <sub>Migrate the check-gemini-api-key frontend caller from v1 to v2 using the 4-layer pattern (constant URL, hook rewrite with getApi + Zod types, consumer double-unwrap removal, dead code cleanup). Create recollect-caller-migration skill encoding this proven pattern for future batch migration. Rename recollect-post-migration-cleanup to recollect-mutation-hook-refactoring with cross-references.</sub>

<sub>Introduced in [`2c1d2349`](https://github.com/timelessco/recollect/commit/2c1d23496a4578c1f229bb30ba49d02d1d1fd042)</sub>


---


#### `api` — 🐛 restore v1 error handling in upload-profile-pic and file upload

> <sub>- Remove try-catch around deleteProfilePic in upload-profile-pic to   match v1 where storage cleanup failures are fatal (500), not swallowed - Handle collaborator query errors in test file upload route: destructure   and check collaborationError (excluding PGRST116 "no rows") before   treating missing collaboration as 403</sub>

<sub>Introduced in [`d399b6c9`](https://github.com/timelessco/recollect/commit/d399b6c918488bf4c024d3fc8492867c8c510d47)</sub>


---


#### `api` — 🐛 address CodeRabbit review findings across v2 routes

> <sub>- Add response.ok checks before parsing fetch responses in screenshot   routes (add-url-screenshot, screenshot worker) to match v1 axios   throw-on-error behavior - Replace relative imports with @/ path alias in screenshot and   upload-profile-pic routes - Fix double-wrapped response envelope in test file upload route   (handler was returning { data, error, success } but factory already   wraps in apiSuccess) - Update output schema and OpenAPI supplement to match</sub>

<sub>Introduced in [`8b081050`](https://github.com/timelessco/recollect/commit/8b081050ad870825c673a778861c7f41335f497d)</sub>


---


#### `api` — ✨ migrate MIG-33 delete-user to App Router v2

> <sub>- cascade deletion across 7+ tables respecting FK constraints - R2 storage cleanup for 4 paths (og, screenshots, files, profile) - service-role admin API deleteUser() for auth table removal - factory pattern via createPostApiHandlerWithAuth (POST locked) - OpenAPI supplement with Profiles tag and named examples</sub>

<sub>Introduced in [`57d055ba`](https://github.com/timelessco/recollect/commit/57d055ba30e01ad07845d692867b71828e85fb5b)</sub>


---


#### `cron` — use z.strictObject() to enforce mutually exclusive retry modes

> <sub>Zod 4 z.object() strips unknown keys, so mixed payloads like { retry_all: true, count: 10 } silently match the first branch. z.strictObject() rejects extra keys and returns a 400 instead.</sub>

<sub>Introduced in [`a626c1cc`](https://github.com/timelessco/recollect/commit/a626c1cc61427e91b9b4d18194858489ca2a900c)</sub>


---


#### `api` — ✨ migrate MIG-36 upload-file to App Router v2

> <sub>Object.assign handler pattern with three processing paths: - PDF: insert + early return (no enrichment) - Video: inline blurhash + AI caption, then return - Other files: insert + after() → uploadFileRemainingData
> 
> Imports category-auth from Plan 04 (v2 signature), eliminates axios loopback to upload-file-remaining-data API.</sub>

<sub>Introduced in [`a782aaa4`](https://github.com/timelessco/recollect/commit/a782aaa4827506c9d69b97833b05194457b3426b)</sub>


---


#### `api` — 🐛 replace random slug in category supplement example

> <sub>- cspell flagged "mhamptcb" as unknown word in OpenAPI example data</sub>

<sub>Introduced in [`78ab5cd2`](https://github.com/timelessco/recollect/commit/78ab5cd2d721b11bceacc0de5ade180c7059c227)</sub>


---


#### `api` — ✨ migrate MIG-31 search-bookmarks to App Router v2

> <sub>- GET /api/v2/bookmark/search-bookmarks with conditional auth (discover=public, else=requireAuth) - Object.assign handler pattern with HandlerConfig for OpenAPI scanner - RPC field mapping: ogimage→ogImage, added_categories→addedCategories, added_tags→addedTags - Inlined isUserCollection + extractTagNames to avoid helpers.ts next/router import in App Router - Fix lodash named import in helpers.ts (subpath import for Turbopack ESM compat)</sub>

<sub>Introduced in [`b83b0c04`](https://github.com/timelessco/recollect/commit/b83b0c0409de60987607d9e847c2fa1187c6a9ae)</sub>


---


#### `api` — ✨ migrate MIG-32 fetch-bookmarks-data to App Router v2

> <sub>Multi-query data assembly route with tag/category stitching from junction tables via FK joins. Uses category-auth.ts instead of helpers.ts to avoid next/router import in App Router context.
> 
> Key decisions: - category_id is z.string() (not z.coerce.number()) — v1 compares   against string constants (trash, tweets, links, etc.) - Renamed addedTags→tags, addedCategories→categories for v2 - .overrideTypes<T>() for dynamic select string type inference - isNumericCategory() inlined from helpers.ts isUserInACategoryInApi - isUserOwnerOrAnyCollaborator from category-auth.ts (Wave 4) - Empty-page short-circuit before junction queries</sub>

<sub>Introduced in [`9ed37cdb`](https://github.com/timelessco/recollect/commit/9ed37cdbcfa0f4aac8abfad2816627e27c3902f4)</sub>


---


#### `api` — ✨ migrate MIG-38 add-bookmark-min-data to App Router v2

> <sub>Largest v1 route (457 lines) — OG scraping, URL media detection, iframe check, DB insert + junction table, conditional after() enrichment.
> 
> - Extract checkIfUserIsCategoryOwnerOrCollaborator to src/utils/category-auth.ts   with v2 signature (props object, returns boolean, throws on DB errors) - Optimize: single getMediaType call (v1 made 3 for the same URL) - Rewrite canEmbedInIframe with fetch (was axios) - Conditional after(): only media URLs trigger addRemainingBookmarkData   (non-media URLs use client-side screenshot API instead) - Eliminate axios loopback + lodash dependencies</sub>

<sub>Introduced in [`86538212`](https://github.com/timelessco/recollect/commit/865382127a95f04fc06de8cdd70e47750e157438)</sub>


---


#### `api` — ✨ migrate MIG-34 add-url-screenshot to App Router v2

> <sub>Extract collectAdditionalImages/collectVideo into server-safe module (collect-screenshot-media.ts) to avoid next/router transitive import. Dual-path handler: screenshot fail fires after() enrichment before returning error, success path uploads to R2 then fires after().</sub>

<sub>Introduced in [`bd98a03b`](https://github.com/timelessco/recollect/commit/bd98a03ba985c4471056853732d13d3813c4729e)</sub>


---


#### `api` — ✨ migrate MIG-41 test file upload to App Router v2

> <sub>createPostApiHandlerWithAuth with inline category ownership check (edit_access gate), after() for remaining-data with Sentry, zero legacy imports (lodash/apiTypes/axios). E2E verified 7/7 cases.</sub>

<sub>Introduced in [`7e47477a`](https://github.com/timelessco/recollect/commit/7e47477ab32ab0ae54b5d1fa32307aba086c5325)</sub>


---


#### `api` — ✨ migrate MIG-29 + extract upload-file-remaining-data

> <sub>MIG-29 collaboration email via createPostApiHandlerWithAuth with shared sendInviteEmail. Extracts upload-file-remaining-data as shared function at src/lib/files/ for Phase 12 MIG-41 dependency.</sub>

<sub>Introduced in [`f7b9de7d`](https://github.com/timelessco/recollect/commit/f7b9de7dc7121b5b3a504e647609b970f5c1e6b8)</sub>


---


#### `api` — ✨ migrate MIG-30 upload-profile-pic to App Router v2

> <sub>Uses createRawPostHandler factory (not Object.assign) for native FormData access with automatic OpenAPI scanner compatibility. Key changes from v1:
> 
> - Native request.formData() — no custom parseFormData() utility - Direct Uint8Array from arrayBuffer — no base64 round-trip - crypto.randomUUID() replaces uniqid dependency - slugify imported directly — avoids helpers.ts lodash transitive dep   that breaks OpenAPI scanner ESM import - Reuses deleteProfilePic from Phase 8's remove-profile-pic - Delete-before-upload order preserved (same as v1) — deleteProfilePic   nukes the entire directory, so it must run before the new file lands - Empty file validation (0-byte check) added - OpenAPI supplement documents multipart/Scalar limitation</sub>

<sub>Introduced in [`7c265ad9`](https://github.com/timelessco/recollect/commit/7c265ad94c3e556ee667535d3d96d75368922efd)</sub>


---


#### `api` — ✨ migrate MIG-40 ai-enrichment queue worker to App Router v2

> <sub>Two-stage validation, platform-specific URL handling (Twitter/Instagram), Raindrop/Instagram image re-upload via uploadImageToR2, enrichMetadata for AI features, collection auto-assignment, pgmq lifecycle with faithful retry semantics. Public endpoint per D-07.</sub>

<sub>Introduced in [`44b94407`](https://github.com/timelessco/recollect/commit/44b944070a3349e3706140879598f7c5162abc14)</sub>


---


#### `api` — ✨ migrate MIG-39 screenshot queue worker to App Router v2

> <sub>Two-stage validation (malformed JSON → raw queue ID extraction → Zod), PDF/regular screenshot branching via fetch, imageToText + blurhash + autoAssignCollections as separate sequential ops, full pgmq lifecycle. Public endpoint per D-07. Also includes add-remaining-bookmark-data shared function from Phase 11.</sub>

<sub>Introduced in [`31820e3c`](https://github.com/timelessco/recollect/commit/31820e3cc06dfc6ceeaa054ef0d927274d85dbca)</sub>


---


#### `api` — ✨ migrate MIG-28 send-email to App Router v2

> <sub>Creates shared sendInviteEmail() at src/lib/email/send-invite-email.ts with HTML escaping and graceful RESEND_KEY-missing handling. V2 route is thin wrapper via createPostApiHandler (public). Dependency for MIG-29 send-collaboration-email.</sub>

<sub>Introduced in [`78cb6f2c`](https://github.com/timelessco/recollect/commit/78cb6f2ceb166cb93fe462714e15db161521e0db)</sub>


---


#### `api` — ✨ migrate MIG-27 invite to App Router v2

> <sub>Public GET with JWT decode, service-role client, 302 redirect to /everything on success. 5-case response matrix verified: invalid token 400, deleted invite 500, already accepted 500, FK violation 500, valid token 302. Test data seeded and cleaned up.</sub>

<sub>Introduced in [`0dcce756`](https://github.com/timelessco/recollect/commit/0dcce756c4632c2974419c7b4bb5eb62778ac8d9)</sub>


---


#### `api` — ✨ migrate MIG-26 fetch-bookmarks-count to App Router v2

> <sub>12 parallel count queries + per-category counts. Fixes D-14 bug where v1 returned error strings even on success. E2E verified: all 10 counts + 23 categoryCount entries match v1 exactly.</sub>

<sub>Introduced in [`1dcf15e4`](https://github.com/timelessco/recollect/commit/1dcf15e4f5c45cd6886fce97457bd24a2b87ae7f)</sub>


---


#### `api` — ✨ migrate MIG-25 fetch-user-categories to App Router v2

> <sub>4 parallel queries, collab data stitching, is_favorite computation, and public-category filter. Lodash replaced with native Array.find + isNonNullable. E2E verified: 21 categories, zero diffs against v1.</sub>

<sub>Introduced in [`1ac6f689`](https://github.com/timelessco/recollect/commit/1ac6f689176b21f594baabdaca118924f4c8cd32)</sub>


---


#### `animations` — 🐛 address code review findings

> <sub>- Guard recentlyAddedUrls.add() with hasCoverImg to prevent unbounded   Set growth for bookmarks without cover images - Remove displaySrc from preload effect deps to eliminate wasted   cleanup+setup cycle - Remove redundant recentlyAddedUrls cleanup effect from   AnimatedBookmarkImage — BookmarkImageWithAnimation is the sole   cleanup point</sub>

<sub>Introduced in [`909ec223`](https://github.com/timelessco/recollect/commit/909ec223153b30f300576710d1b7ace0a15e6b84)</sub>


---


#### `animations` — 🐛 add blur-up for placeholder→ogImage transition

> <sub>The placeholder→ogImage transition involves a React list key change (undefined→real ID) that remounts the component, losing ref state.
> 
> Fix: module-scoped recentlyAddedUrls Set in imageCard.tsx tracks URLs that were seen in optimistic state (isNil(id)). When the remounted component renders with an image and the URL is in the set, blur-up plays. Set entry is cleaned up after animation.
> 
> Now both transitions animate: - placeholder → ogImage: recentlyAddedUrls set detects across remounts - ogImage → screenshot: prevImgRef detects within same instance - Page-load images: never enter the set, no animation</sub>

<sub>Introduced in [`ec227852`](https://github.com/timelessco/recollect/commit/ec227852c7d2c856c45c94bbacb9bd5ae918a9a2)</sub>


---


#### `animations` — 🐛 fix ogImage→screenshot blur-up and remove text placeholder

> <sub>- Remove text crossfade (AnimatePresence) from bookmarkCard — the image   placeholder already shows "Fetching data...", no duplicate text needed - Fix image blur-up: use ref to detect when img prop actually changes   (ogImage → screenshot) instead of isLoading which is already false   when the new image renders - Page-load images don't animate (ref initialized to current img)</sub>

<sub>Introduced in [`8d631b06`](https://github.com/timelessco/recollect/commit/8d631b0680957ebfc859c9389f5267d7b4a26cc0)</sub>


---


#### `animations` — 🐛 simplify animation state to use existing conditions

> <sub>Remove the over-engineered animatingBookmarkUrls Zustand state and use the same conditions already in imageCard.tsx: - isNil(id) for optimistic entries (entry animation + text placeholder) - loadingBookmarkIds.has(id) for processing state (image blur-up)
> 
> Removed: - animatingBookmarkUrls Set + actions from Zustand store - getBookmarkAnimationState.ts utility - Mutation hook animation tracking - Route change cleanup logic - url prop threading through BookmarkOgImage
> 
> Simplified: - AnimatedBookmarkCard checks isNil(id) instead of Zustand Set - Image blur-up uses existing isLoading condition - Text crossfade uses isNil(post.id) directly</sub>

<sub>Introduced in [`8a83ffc9`](https://github.com/timelessco/recollect/commit/8a83ffc9b0235495dc628a700d86a6e6746d2420)</sub>


---


#### `animations` — ✨ add smooth transitions for bookmark upload states

> <sub>Add crossfade and blur-up animations to bookmark upload state transitions using Motion v12+. Only newly added URL bookmarks animate — existing cards have zero overhead.
> 
> - Entry: fade + slide down (300ms) on card mount - Text: crossfade placeholder to real title/description (~350ms) - Image: blur(20px) → sharp blur-up reveal (400ms) - Scoped via URL-keyed Zustand Set (animatingBookmarkUrls) - Respects prefers-reduced-motion - Self-cleans on animation complete, error, or route change
> 
> 🤖 Generated with [Claude Code](https://claude.com/claude-code)
> 
> Co-Authored-By: Claude <noreply@anthropic.com></sub>

<sub>Introduced in [`566abdba`](https://github.com/timelessco/recollect/commit/566abdbafbb34c63de7ed134da747c4178cebf5a)</sub>


---


#### `moodboard` — 🐛 prevent card position jumping during scroll

> <sub>Use cached measurements when scrolling backward to prevent TanStack Virtual from recalculating lane positions, which causes moodboard cards to visually jump around — especially for bookmarks without images.</sub>

<sub>Introduced in [`389a1c98`](https://github.com/timelessco/recollect/commit/389a1c986776b34a8c647356136f01ef61eeb6be)</sub>


---


#### `spelling` — add AI keyword terms to cspell dictionary

> <sub>Add instapost, redditpost, xpost to cspell words list — used as image classification types in AI enrichment prompts.</sub>

<sub>Introduced in [`62b685fc`](https://github.com/timelessco/recollect/commit/62b685fc7517bb952a737400a48f189aebe5e2fd)</sub>


---


#### `ai-enrichment` — structured keywords + human AI summary

> <sub>Replace flat string[] keywords with typed JSON object (Record<string, string>) using categories: type, person, object, place, color, brand, price, etc. AI uses 80% confidence filtering internally. Rewrote summary prompts to be concise and direct. Search function handles both legacy array and new object formats via jsonb_typeof() branching. Added Sentry reporting for JSON parse failures.</sub>

<sub>Introduced in [`5ece1e7b`](https://github.com/timelessco/recollect/commit/5ece1e7b1c26ab79ce2ee0206f20e74ec396c485)</sub>


---


#### `openapi` — 🐛 add SKIP_ENV_VALIDATION to scanner scripts

> <sub>- prebuild:next and openapi-changelog CI need SKIP_ENV_VALIDATION=1   since route files now import @/env/client which validates at import time - Remove bogus API changelog entries from failed scanner run (0/61 routes) - Add env cascade and db:types freshness gotchas</sub>

<sub>Introduced in [`a0a8a7f3`](https://github.com/timelessco/recollect/commit/a0a8a7f3d9f88b4d0569b4e496fccc47e1e3ce39)</sub>


---


#### `env` — 🐛 restore ProcessEnv types + regenerate DB types

> <sub>- Add src/env/process-env.d.ts augmentation for server secrets still   using raw process.env (shared client/server files can't use @/env/server) - Regenerate database-generated.types.ts after local DB reset - Revert .filter() workaround back to .eq() now types resolve correctly</sub>

<sub>Introduced in [`3bb80987`](https://github.com/timelessco/recollect/commit/3bb8098787847486d121ca73198152573bbf5fa0)</sub>


---


#### `lint` — 🐛 remove redundant tanstack query rule overrides + document perfectionist oscillation

> <sub>Tanstack query property-order rules had 0 violations — disabled override was unnecessary. Perfectionist sort-objects/sort-union-types kept off with documented reason: jsPlugin</sub>

<sub>Introduced in [`6a930f95`](https://github.com/timelessco/recollect/commit/6a930f9515a0577e0aa3ce7563c1f19815417575)</sub>


---


#### `lint` — 🐛 enable oxlint type-aware linting + fix ~800 violations

> <sub>- Enable typeAware + typeCheck flags, 15 new rules active (578 → 593) - Fix await-thenable: remove await from sync createServerServiceClient/fileUpload - Fix no-base-to-string: use .message on Supabase storage errors - Fix no-deprecated: migrate Zod v4 APIs, Supabase cookie getAll/setAll - Fix no-misused-promises: wrap async handlers with void IIFE pattern - Fix no-confusing-void-expression, restrict-template-expressions - Enable no-unsafe-* + no-non-null-assertion with scoped overrides - Legacy folders (pages/api, async, pageComponents) disabled via overrides - Add type guards, typed getQueryData generics, toJson/toDbType helpers</sub>

<sub>Introduced in [`328bde31`](https://github.com/timelessco/recollect/commit/328bde312a29f8db90a3e3b540da198eb88bbe66)</sub>


---


#### `lint` — 🐛 remove async from functions with nested await only

> <sub>The `await` calls were inside nested callbacks (startTransition, onBlur, onKeyUp), not in the outer function body — oxlint correctly flagged these as require-await violations.
> 
> Also remove unused vscode extension recommendations.</sub>

<sub>Introduced in [`db27c56e`](https://github.com/timelessco/recollect/commit/db27c56eced81b2cb20b7653ee9f1ea90ca5a470)</sub>


---


#### `lint` — 🐛 enable and fix remaining oxlint rules (~77 violations)

> <sub>Enable `no-nested-ternary`, `require-await`, `no-unused-vars`, `no-non-null-assertion` rules and fix all violations across 78 files.
> 
> - Convert nested ternaries to if/else blocks and IIFEs - Remove `async` from functions without `await` - Remove unused imports (CategoriesData, PostgrestError, etc.) - Remove non-null assertions (`!`) in favor of safe access - Add type generics to React Query `getQueryData` calls - Prefix unused variables with `_` in Cypress tests - Add `void` prefix for fire-and-forget promises - Clean up oxlintrc: remove `typeCheck`, add rule comments</sub>

<sub>Introduced in [`b133206d`](https://github.com/timelessco/recollect/commit/b133206d23d3365eafb711aca5185498c2535382)</sub>


---


#### `lint` — 🐛 enable and fix 13 medium oxlint rules (~148 violations)

> <sub>Enable rules with 6-18 violations each and fix ~148 violations across 86 files using 4 parallel sub-agents.
> 
> Rules enabled: prefer-destructuring, no-empty-function, no-useless-undefined, no-await-expression-member, prefer-template, prefer-await-to-callbacks, no-plusplus, prefer-tag-over-role, no-shadow, no-named-as-default, require-param-description, prefer-ternary, prefer-await-to-then
> 
> Notable changes: - div[role=button] → semantic <button> in 6 components - .catch() fire-and-forget → async IIFE in 5 App Router handlers - Default imports → named imports for imageToText, Lightbox, icons</sub>

<sub>Introduced in [`11da55de`](https://github.com/timelessco/recollect/commit/11da55ded5907c9a5532492890b1685416487a20)</sub>


---


#### `lint` — 🐛 enable and fix 30+ trivial oxlint rules

> <sub>Enable all disabled rules with ≤5 violations each and fix ~75 violations across 49 files using parallel sub-agents.
> 
> Rules enabled: no-else-return, no-useless-return, ban-ts-comment, ban-types, no-inferrable-types, no-empty-interface, no-namespace, no-empty-object-type, no-constant-binary-expression, default-case, class-methods-use-this, max-classes-per-file, no-warning-comments, const-comparisons, import/namespace, import/no-cycle, no-accumulating-spread, consistent-function-scoping, avoid-new, no-nesting, require-returns-description, no-anonymous-default-export, jsx-no-useless-fragment, prefer-dom-node-dataset, no-array-for-each, no-document-cookie, no-immediate-mutation, no-static-only-class, no-useless-spread, no-array-reduce, prefer-spread
> 
> Notable behavioral fixes: - add-remaining-bookmark-data.ts: fix dead ?? chain (false ?? x is no-op) - collectionsList.tsx: preserve concurrent drag-drop via Promise.all</sub>

<sub>Introduced in [`dc2b2cfe`](https://github.com/timelessco/recollect/commit/dc2b2cfe6452cbeb70c5c31f1c63f5e7096448c1)</sub>


---


#### `lint` — 🐛 revert unsafe || → ?? and optional chaining removals

> <sub>Revert auto-fix changes that altered business logic: - get-bookmark-icon: restore || for boolean startsWith fallback - desktop-sidepane/sidepane-content: restore || chains for AI metadata visibility - CloseOnSwipeDown: restore ?.removeAttribute null safety</sub>

<sub>Introduced in [`e77dd1ed`](https://github.com/timelessco/recollect/commit/e77dd1ed9190ac05cadd11c2c968ba9e99fa2149)</sub>


---


#### `lint` — 🐛 remove remaining unnecessary async keywords

> <sub>- Remove async from vet() callbacks (return Promises directly) - Remove async from .map() callbacks in revalidation and email - Remove async from mutateAsync wrapper and cancelQueries map</sub>

<sub>Introduced in [`be615be2`](https://github.com/timelessco/recollect/commit/be615be2711db6b951a074c818b6cd7310153c1b)</sub>


---


#### `lint` — 🐛 remove unnecessary async from non-awaiting functions

> <sub>- Disable promise-function-async (conflicts with require-await) - Remove auto-added async from mutationFn/queryFn callbacks - Remove async from route handlers and helpers with no await</sub>

<sub>Introduced in [`2758885f`](https://github.com/timelessco/recollect/commit/2758885f01c503d07a1124dfb51605edd02c2f0e)</sub>


---


#### `lint` — 🐛 fix spellcheck and lint-staged glob

> <sub>- Add "nums" to cspell dictionary (regexp jsPlugin rule name) - Narrow lint-staged glob to JS/TS/JSON files only (ultracite can't handle .txt)</sub>

<sub>Introduced in [`64002135`](https://github.com/timelessco/recollect/commit/640021356896f7ff1b7070c9b1ad6835cf645fe2)</sub>


---


#### `eslint` — 🔧 disable sort-collections for package.json

> <sub>- oxfmt sortPackageJson handles script ordering now - ESLint rule conflicts with oxfmt's alphabetical sorting</sub>

<sub>Introduced in [`9f59e8dd`](https://github.com/timelessco/recollect/commit/9f59e8dd0f5c962b69e610de4e0cb882f0211bbb)</sub>


---


#### `spelling` — 📝 add svgs to cspell dictionary

> <sub>- CI spellcheck flags "svgs" from app-svgs directory name</sub>

<sub>Introduced in [`a73f2042`](https://github.com/timelessco/recollect/commit/a73f2042f03c298eb930dca962bfe68ad8cc73a8)</sub>


---


#### `search` — 🐛 add isSharedCategory to query key

> <sub>- Include isSharedCategory in useSearchBookmarks queryKey - Fixes @tanstack/query/exhaustive-deps lint error - Ensures search refetches when shared category status changes</sub>

<sub>Introduced in [`dd263296`](https://github.com/timelessco/recollect/commit/dd263296aaf41e3d88d8d3b6cf33c165ee5f08f7)</sub>


---


#### `docs` — 🩹 fix duplicate H1 in solution doc

> <sub>- Demote body heading to H2 since frontmatter title serves as H1 - Fixes MD025 markdownlint violation blocking pnpm fix</sub>

<sub>Introduced in [`3c0ac87b`](https://github.com/timelessco/recollect/commit/3c0ac87b50656dbab1f19f8d859f362ab82bf9c0)</sub>


---


#### `upload` — 🐛 normalize uploaded MIME types

> <sub>- lower-case and validate accepted MIME values on the server - fall back unsupported or missing values to bookmark</sub>

<sub>Introduced in [`acae11da`](https://github.com/timelessco/recollect/commit/acae11dad302dca202748a071927165c524b124e)</sub>


---


#### `bookmarks` — 🐛 unify media category filters

> <sub>- share one media predicate helper across list search and count - keep metadata-backed media bookmarks visible in search and counts</sub>

<sub>Introduced in [`d6dfbfa8`](https://github.com/timelessco/recollect/commit/d6dfbfa8a011980d8a0575476f7a1f0f580e80df)</sub>


---


#### `upload` — add MOV video support with prefix-based MIME validation

> <sub>Add video/quicktime to accepted file types to support MOV files (iPhone/macOS recordings).
> 
> Refactored MIME type validation to use prefix-based checking: - New isAcceptedMimeType() function accepts any video/*, audio/*,   image/* type automatically - Future IANA-registered media types work without code changes - Maintains backward compatibility with DB queries via explicit array
> 
> Slack thread: https://timeless.slack.com/archives/C09139Z0Y75/p1774030172627459
> 
> https://claude.ai/code/session_01UDpErCBdCicixg6CeJjaFH</sub>

<sub>Introduced in [`398292d5`](https://github.com/timelessco/recollect/commit/398292d5b0d9eef973b110f8576f98709d38ff8d)</sub>


---


#### `release` — 🐛 use current branch for GraphQL enrichment

> <sub>- getGithubCommits() was hardcoded to query main branch - commits on dev were invisible to the enrichment pipeline - release-pr.sh now uses GraphQL fallback for PR number lookup - both changelog pipelines now correctly resolve PR associations</sub>

<sub>Introduced in [`2efc00ab`](https://github.com/timelessco/recollect/commit/2efc00aba7f5bf9b1a4952d10eabaab41ca646df)</sub>


---


#### `release` — 🔗 add PR links to changelog entries

> <sub>- extend GraphQL query with associatedPullRequests field - pass prNumber through transform to commit template</sub>

<sub>Introduced in [`408bba78`](https://github.com/timelessco/recollect/commit/408bba78b87f7b21b3905d75cd449ee7485b8601)</sub>


---


#### `db` — add plan and enrichment_status migrations

> <sub>Add billing columns (plan, subscription_status, subscription_current_period_end, polar_customer_id, plan_updated_at) to profiles table and enrichment_status to everything table.</sub>

<sub>Introduced in [`c4c7d312`](https://github.com/timelessco/recollect/commit/c4c7d312d4817a604b387dd9ba23365e705b2565)</sub>




### 📌 Other Notable Changes


#### `auth` — ♻️ migrate auth routes to axiom

> <sub>- Swap redirect() for NextResponse.redirect to stop NEXT_REDIRECT noise - Emit structured wide events for known and unknown error paths - Redact sensitive query params from all v2 wide events in axiom - Verified end-to-end via real google oauth login plus known-error curls</sub>

<sub>Introduced in [`21c8f6b6`](https://github.com/timelessco/recollect/commit/21c8f6b692c38c2f9cc48e7aa4b1991eaf15fa9e)</sub>


---


#### `ai` — rename imageToText.ts to image-analysis.ts

> <sub>The file handles much more than image-to-text conversion — it performs full AI image analysis including descriptions, structured keywords, OCR, color extraction, and collection matching. The new name better reflects its scope.</sub>

<sub>Introduced in [`b86c6769`](https://github.com/timelessco/recollect/commit/b86c6769fb6f0eb688b2299300eb561b7ac27f15)</sub>


---


#### `api` — 🔧 propagate error cause across v2 routes and split API rules

> <sub>- Propagate cause in RecollectApiError across all v2 routes so inner error   details flow to Axiom via extractCauseFields (catch {} → catch (error) +   cause: error in 8 routes, throw new Error → RecollectApiError in 3 helpers) - Split api-logging.md into api-v1.md (Pages Router + non-v2 App Router) and   api-v2.md (comprehensive v2 patterns: handler composition, error handling,   cause rules, wide events, after() patterns, schemas, queue/auth patterns) - Move v2 content out of sentry.md and gotchas.md into api-v2.md - Rename wide-event-enrichment skill to v2-route-audit with 10-check audit   (added Check 9: error cause propagation, Check 10: no raw throw new Error) - Fix check-gemini-api-key entity ID placement (ctx.fields before DB query)</sub>

<sub>Introduced in [`82768e3a`](https://github.com/timelessco/recollect/commit/82768e3a2cbb895494d565407fdec915891263e1)</sub>


---


#### `api` — move is_media_url before insert, add has_og_image

> <sub>Move is_media_url ctx.fields assignment before the DB insert so it appears in Axiom wide events even when insert throws. Add has_og_image boolean to show whether an OG image was resolved for the bookmark.
> 
> Phase 21 Plan 01 follow-up — entity-before-operation pattern</sub>

<sub>Introduced in [`d992b623`](https://github.com/timelessco/recollect/commit/d992b62339a4e06a59bd57a07e36b4ccc378d269)</sub>


---


#### `api` — migrate after() error handling from Sentry to logger.warn

> <sub>Replace Sentry.captureException with logger.warn in add-url-screenshot (2 catch blocks) and add-bookmark-min-data (1 catch block). Each logger.warn includes explicit entity context (bookmark_id, user_id) since ALS is unavailable inside after() callbacks. Unexpected errors still reach Sentry via onRequestError at the factory level.
> 
> Phase 21 Plan 01 — STND-05, BKMK-03, FILE-02</sub>

<sub>Introduced in [`3623ac68`](https://github.com/timelessco/recollect/commit/3623ac68edb299b3e30940ac01c94a697ecab8db)</sub>


---


#### `api` — replace console statements with ctx.fields in v2 routes

> <sub>Migrate all remaining console.error/warn in migrated v2 routes to ctx.fields wide events. Only exception: after() catch in upload-file</sub>

<sub>Introduced in [`e506741c`](https://github.com/timelessco/recollect/commit/e506741c61e63c002ad1b3779d1a4399154cfa78)</sub>


---


#### `api` — clean up v2 factory comments

> <sub>- Remove AXIO/FACT prefixed comment tags from axiom.ts (plain prose is clearer) - Add explanatory comment on output validation throw in create-handler-v2.ts</sub>

<sub>Introduced in [`55a59277`](https://github.com/timelessco/recollect/commit/55a5927785e20ec4fd656e2e77fba5816f04ab14)</sub>


---


#### `api` — add pitfall #28 — OpenAPI supplement envelope mismatch after factory migration

> <sub>Discovered during Phase 18 Plans 01-03: supplement examples must be updated from v1 {data: T, error: null} envelope to bare T when migrating routes to v2 factory. Scanner handles schemas automatically but examples are manually curated.</sub>

<sub>Introduced in [`54710050`](https://github.com/timelessco/recollect/commit/54710050b265f12cdab5f076163b4e848bfa22d9)</sub>


---


#### `api` — 📝 update upload-file-remaining-data supplement with E2E-derived examples

> <sub>Add empty-body validation case, update descriptions to click-to-test style based on actual E2E verification results via Chrome MCP.</sub>

<sub>Introduced in [`477807ef`](https://github.com/timelessco/recollect/commit/477807efb6a7c579a21f2e7f52ae5bc5abcb81ab)</sub>


---


#### `api` — ♻️ add structured logging and fix empty block in add-remaining-bookmark-data

> <sub>Add [add-remaining-bookmark-data] prefixed logs at every decision point for production debugging. Restructure empty if-block into positive hasImageForProcessing guard. Update supplement with E2E-verified error messages and click-to-test descriptions.</sub>

<sub>Introduced in [`2f01d5d7`](https://github.com/timelessco/recollect/commit/2f01d5d7a737469fc221bbdd0c6b98fc36ae0f83)</sub>


---


#### `bookmarks` — ♻️ replace type assertion with runtime filter

> <sub>- Use `isNonNullable` filter instead of `as SingleListData[]` cast - Remove unused `SingleListData` import</sub>

<sub>Introduced in [`6bf1f117`](https://github.com/timelessco/recollect/commit/6bf1f117185fe1fc55ca98363e9dab6c48a58469)</sub>


---


#### `cron` — 🛠️ implement POST handler for clear-trash route with authorization checks

> <sub>- Added a new POST handler to manage trash cleanup, including authorization via a service key. - Enhanced error handling and logging for better traceability. - Updated response structure to return JSON format for both success and error cases.</sub>

<sub>Introduced in [`6062a9ab`](https://github.com/timelessco/recollect/commit/6062a9ab6c9c7fce94a5046a1230fab3abe723b7)</sub>


---


#### `ai-enrichment` — combine base types with domain qualifiers

> <sub>Keep all original type values (movie, tvshow, xpost, product, etc.) and layer domain qualifiers on top (ecommerce, social media, streaming, etc.) so the AI produces labels like "ecommerce product" or "developer tools repo" instead of just "product" or "repo".</sub>

<sub>Introduced in [`b5645cdc`](https://github.com/timelessco/recollect/commit/b5645cdcd0299d41af684a1f8bd34dabde5d49da)</sub>


---


#### `ai-enrichment` — use domain-based type labels for keywords

> <sub>Guide the AI to classify by content domain (ecommerce, social media, streaming, developer tools, etc.) rather than generic format labels.</sub>

<sub>Introduced in [`dd023488`](https://github.com/timelessco/recollect/commit/dd0234884765821eda59fa2f725f9aff08aff705)</sub>


---


#### `ai-enrichment` — use descriptive type labels instead of enum

> <sub>Replace the closed type enum (image, website, etc.) with a prompt for short, specific labels like "cooking tutorial" or "movie poster" so keywords better describe what the content actually is.</sub>

<sub>Introduced in [`d2bab1b4`](https://github.com/timelessco/recollect/commit/d2bab1b43d289ef85ccafdc3ae7b235b2b9a291b)</sub>


---


#### `ai-enrichment` — simplify summary prompt, show OCR/keywords only on search match

> <sub>Summary prompt no longer describes colors, UI elements, or visual style — keywords handle that. Lightbox OCR and keywords sections now only appear when the active search text matches their content.</sub>

<sub>Introduced in [`5d5ce53b`](https://github.com/timelessco/recollect/commit/5d5ce53b2aea84a2cb5d41c47da494942edd7072)</sub>


---


#### `bookmarks-view` — remove legacy flat format support

> <sub>Migrate orphaned flat bookmarks_view records to keyed format ({ "everything": {...} }) and remove all frontend code that handled the legacy flat shape.</sub>

<sub>Introduced in [`235178a2`](https://github.com/timelessco/recollect/commit/235178a2004616d77b3c0c5c4ff7188ae9248855)</sub>


---


#### `env` — ♻️ typed env validation + agent restructuring

> <sub>- Migrate from scripts/env/ to src/env/ with Zod-validated typed imports - Replace raw process.env.NEXT_PUBLIC_* with @/env/client across 30+ files - Delete legacy scripts/env/ validation (client.js, server.js, schema.js) - Restructure api-migrator agent: 728→241 lines with 3 extracted reference files - Update api-logging rule with all 9 handler factories - Fix pre-existing TS errors in supabaseClient and revalidation-helpers</sub>

<sub>Introduced in [`a6c97264`](https://github.com/timelessco/recollect/commit/a6c97264add29ad4a370897dac37260a691bc44b)</sub>


---


#### `api` — 🔧 pre-Phase 10 audit fixes across all v2 routes

> <sub>- Fix process-queue service client import (createServerServiceClient) - Add last_synced_instagram_id and last_synced_twitter_id to profile output schemas - Add .meta({ description }) to 121 Zod fields across 22 schema files - Fix update-user-profile output schema (remove favorite_categories, z.int→z.number) - Remove clean.ts script, update knip config and dependencies</sub>

<sub>Introduced in [`9cfccef4`](https://github.com/timelessco/recollect/commit/9cfccef4352688a30e93bca189a66d64fcb1503b)</sub>


---


#### `rules` — 📝 remove redundant gotchas and rule duplicates

> <sub>- Drop 12 gotchas that are linter-enforced or visible in config - Remove rules duplicated in global ~/.claude/rules/ files - Remove supabase-migrations SQL/RLS sections (covered by dedicated files) - Update promise-function-async and lint-staged gotcha wording</sub>

<sub>Introduced in [`19065c88`](https://github.com/timelessco/recollect/commit/19065c88f55b551600290c3d42b2040f2bea6a8d)</sub>


---


#### `async` — 🛠️ replace void IIFE with direct async callbacks

> <sub>- Pass async directly to startTransition (React 19 supports it) - Extract named async functions in useEffect and event handlers - IIFE pattern broke React transition tracking by hiding async from React</sub>

<sub>Introduced in [`4de23005`](https://github.com/timelessco/recollect/commit/4de230053e0cce18f6be339db47509cd48b19830)</sub>


---


#### `rules` — 📝 restructure CLAUDE.md per claude-structure skill

> <sub>- Move ## Tooling content into ## Domain as a bullet - Remove obsolete Self-Improvement section from commands.md - Add ultracite lint type generation gotcha - Fix PostToolUse hook: pnpm dlx → pnpm exec</sub>

<sub>Introduced in [`867dd486`](https://github.com/timelessco/recollect/commit/867dd486c7eae298623b97d2b2e0a846162fba97)</sub>


---


#### `rules` — 📝 update oxlint rule-testing gotcha + add perfectionist oscillation warning

> <sub>Safe copy-config approach instead of editing .oxlintrc.json directly. Document sort-objects/sort-union-types oscillation with upstream reference.</sub>

<sub>Introduced in [`cb460f26`](https://github.com/timelessco/recollect/commit/cb460f2685fb6b7897118f406d93848a3cd4d229)</sub>


---


#### `claude` — 📝 update session learnings

> <sub>- Bump Next.js version reference to 16.2.1 - Fix stale node engine (^22.14.0, removed >=24.0.0) - Document .ncurc.cjs and renovate.json sync requirement - Document GitHub Actions SHA pinning workflow</sub>

<sub>Introduced in [`365bb70a`](https://github.com/timelessco/recollect/commit/365bb70ac939d9cbc6943e5812b9c821fff17c78)</sub>


---


#### `eslint` — 🔧 overhaul config with new plugins

> <sub>- Add @eslint/js recommended and eslint-comments plugin - Fix jsonc import to named export (no-named-as-default-member) - Allow whole-file eslint-disable without matching enable - Spread reactQuery flat config, add yml prettier config - Reorder config blocks for clarity</sub>

<sub>Introduced in [`cc4e498a`](https://github.com/timelessco/recollect/commit/cc4e498ac12b05d2790a2142114ff31bf613bdc0)</sub>


---


#### `solutions` — 📝 capture MIME drift fix

> <sub>- document the shared root cause behind media classification drift - record verification results and prevention guidance for follow-up</sub>

<sub>Introduced in [`4da2b054`](https://github.com/timelessco/recollect/commit/4da2b054a0ab463babb8c41b1bcb5f90ab30cba6)</sub>


---


#### `release` — 🔄 deduplicate changelog to one entry per PR

> <sub>Batch GraphQL query replaces N per-commit API calls with a single aliased query for commit→PR mapping. Both changelog pipelines (bash release-pr.sh and JS conventional-changelog-writer) now deduplicate multi-commit PRs into a single entry using the PR title, and filter out release commits.</sub>

<sub>Introduced in [`5200ba03`](https://github.com/timelessco/recollect/commit/5200ba0377a48e91a8fb64c99d890d1930af9561)</sub>




<details>
<summary>🗃️ Commits</summary>



#### ⭐ New Features

- **`ai-enrichment`** structured keywords + human AI summary — [`5ece1e7`](https://github.com/timelessco/recollect/commit/5ece1e7b1c26ab79ce2ee0206f20e74ec396c485)

- **`animations`** ✨ add smooth transitions for bookmark upload states — [`566abdb`](https://github.com/timelessco/recollect/commit/566abdbafbb34c63de7ed134da747c4178cebf5a)

- **`animations`** ✨ introduce AnimatedBookmarkImage component for enhanced bookmark image handling — [`424576c`](https://github.com/timelessco/recollect/commit/424576c62f2cd6e6653985e426e61cfe9eadd252)

- **`api`** ✨ add v2 bucket/get/signed-url route — [`0fb8d10`](https://github.com/timelessco/recollect/commit/0fb8d109c297a55ae4a7d2b9a8a62deb7691e685)

- **`api`** ✨ create v2 handler factory with error/warn context helpers — [`465c70a`](https://github.com/timelessco/recollect/commit/465c70a7048389e1a6e1004369d3bb0f351bd5a1)

- **`api`** ✨ migrate check-gemini-api-key caller to v2 and create caller migration skill — [`2c1d234`](https://github.com/timelessco/recollect/commit/2c1d23496a4578c1f229bb30ba49d02d1d1fd042)

- **`api`** ✨ migrate MIG-25 fetch-user-categories to App Router v2 — [`1ac6f68`](https://github.com/timelessco/recollect/commit/1ac6f689176b21f594baabdaca118924f4c8cd32)

- **`api`** ✨ migrate MIG-26 fetch-bookmarks-count to App Router v2 — [`1dcf15e`](https://github.com/timelessco/recollect/commit/1dcf15e4f5c45cd6886fce97457bd24a2b87ae7f)

- **`api`** ✨ migrate MIG-27 invite to App Router v2 — [`0dcce75`](https://github.com/timelessco/recollect/commit/0dcce756c4632c2974419c7b4bb5eb62778ac8d9)

- **`api`** ✨ migrate MIG-28 send-email to App Router v2 — [`78cb6f2`](https://github.com/timelessco/recollect/commit/78cb6f2ceb166cb93fe462714e15db161521e0db)

- **`api`** ✨ migrate MIG-29 + extract upload-file-remaining-data — [`f7b9de7`](https://github.com/timelessco/recollect/commit/f7b9de7dc7121b5b3a504e647609b970f5c1e6b8)

- **`api`** ✨ migrate MIG-30 upload-profile-pic to App Router v2 — [`7c265ad`](https://github.com/timelessco/recollect/commit/7c265ad94c3e556ee667535d3d96d75368922efd)

- **`api`** ✨ migrate MIG-31 search-bookmarks to App Router v2 — [`b83b0c0`](https://github.com/timelessco/recollect/commit/b83b0c0409de60987607d9e847c2fa1187c6a9ae)

- **`api`** ✨ migrate MIG-32 fetch-bookmarks-data to App Router v2 — [`9ed37cd`](https://github.com/timelessco/recollect/commit/9ed37cdbcfa0f4aac8abfad2816627e27c3902f4)

- **`api`** ✨ migrate MIG-33 delete-user to App Router v2 — [`57d055b`](https://github.com/timelessco/recollect/commit/57d055ba30e01ad07845d692867b71828e85fb5b)

- **`api`** ✨ migrate MIG-34 add-url-screenshot to App Router v2 — [`bd98a03`](https://github.com/timelessco/recollect/commit/bd98a03ba985c4471056853732d13d3813c4729e)

- **`api`** ✨ migrate MIG-36 upload-file to App Router v2 — [`a782aaa`](https://github.com/timelessco/recollect/commit/a782aaa4827506c9d69b97833b05194457b3426b)

- **`api`** ✨ migrate MIG-38 add-bookmark-min-data to App Router v2 — [`8653821`](https://github.com/timelessco/recollect/commit/865382127a95f04fc06de8cdd70e47750e157438)

- **`api`** ✨ migrate MIG-39 screenshot queue worker to App Router v2 — [`31820e3`](https://github.com/timelessco/recollect/commit/31820e3cc06dfc6ceeaa054ef0d927274d85dbca)

- **`api`** ✨ migrate MIG-40 ai-enrichment queue worker to App Router v2 — [`44b9440`](https://github.com/timelessco/recollect/commit/44b944070a3349e3706140879598f7c5162abc14)

- **`api`** ✨ migrate MIG-41 test file upload to App Router v2 — [`7e47477`](https://github.com/timelessco/recollect/commit/7e47477ab32ab0ae54b5d1fa32307aba086c5325)

- **`api`** ✨ production observability with Axiom logging and layered factory — [`0444af2`](https://github.com/timelessco/recollect/commit/0444af25834dfc2bc9125f59589837cfc8b3a977)

- **`api`** 🔀 migrate fetch-bookmark-by-id caller to v2 ky client — [`51e673c`](https://github.com/timelessco/recollect/commit/51e673ce261f18c8a2b956d5a881cae0ea998719)

- **`api`** 🔀 migrate fetch-bookmarks-count caller to v2 ky client — [`493f9a3`](https://github.com/timelessco/recollect/commit/493f9a3091cdd4f9c450792b94412c5e5ad5dcd9)

- **`api`** add enrichment audit script, fix PII flag in public bookmarks — [`35d9fd0`](https://github.com/timelessco/recollect/commit/35d9fd016266ce20bc26a88801028b14fbc01b6c)

- **`api`** add environment field to Axiom logger args — [`ef35f8e`](https://github.com/timelessco/recollect/commit/ef35f8e518f206f092045951073d2eb50714e028)

- **`api`** add withRawBody factory and migrate 3 raw body routes (Phase 19, Plan 03) — [`a13aee9`](https://github.com/timelessco/recollect/commit/a13aee9d85b2b8dd66cf977d648ec63efaff1d2f)

- **`api`** add withSecret factory and migrate revalidate route (Phase 19, Plan 02) — [`39512af`](https://github.com/timelessco/recollect/commit/39512af03a81d9d5b5c8fba57f1652b2abf93a92)

- **`api`** enhance bookmark addition with category validation — [`9028106`](https://github.com/timelessco/recollect/commit/90281063792ba6535a751ff18902a8a277c13dc5)

- **`api`** enrich 7 bookmark routes with wide event business context — [`b6e66c1`](https://github.com/timelessco/recollect/commit/b6e66c157b31edafc98f5cd4f8c156fbcf9506a4)

- **`api`** enrich Axiom logger with branch, deployment_id, base_url — [`11c6d57`](https://github.com/timelessco/recollect/commit/11c6d572dd0b997db0ff454464940dafd5e58518)

- **`api`** enrich profile, category, tag routes with wide event context — [`310ffa4`](https://github.com/timelessco/recollect/commit/310ffa425500c5b58762cee2467c9337dd9095fc)

- **`api`** enrich queue and file routes with wide event context — [`1228b14`](https://github.com/timelessco/recollect/commit/1228b1427dc94f89425a8652d7fb3b82a6967c77)

- **`api`** enrich share, API key, utility routes with wide event context — [`d466983`](https://github.com/timelessco/recollect/commit/d4669832d647d4091dde4a35fd442f348473db78)

- **`api`** extend image upload functionality to support Twitter bookmarks — [`ba454b7`](https://github.com/timelessco/recollect/commit/ba454b7b2ddb84b60c4319b2253e664a869bdb05)

- **`api`** migrate 3 auth routes to layered factory (Phase 18, Plans 01-02) — [`ce345a9`](https://github.com/timelessco/recollect/commit/ce345a9067a71b30f54b3e51ed20d9d0a1428cbf)

- **`api`** migrate 3 Object.Assign routes to layered factory (Phase 19, Plan 04) — [`58aee23`](https://github.com/timelessco/recollect/commit/58aee2369a0bbed3d5de6ccc898388fdd8a5a89e), closes [#23](https://github.com/timelessco/recollect/issues/23)

- **`api`** migrate 4 auth routes to layered factory (Phase 18, Plan 03) — [`f3b36b9`](https://github.com/timelessco/recollect/commit/f3b36b9626799abb64f72f9edd452d10f2a8b2bc)

- **`api`** migrate 6 public routes to layered factory (Phase 19, Plan 01) — [`380f921`](https://github.com/timelessco/recollect/commit/380f92195afb4b561a45ecc8c6fc5c1001ea6a52)

- **`api`** migrate 8 auth routes to layered factory (Phase 18, Plan 04) — [`9481d35`](https://github.com/timelessco/recollect/commit/9481d35af83a030a266378646bdd89fd341667ae)

- **`api`** migrate 8 auth routes to layered factory (Phase 18, Plan 05) — [`acc00fb`](https://github.com/timelessco/recollect/commit/acc00fbb934b25b065e47f2d469e45ba8a54361a)

- **`api`** migrate final 4 auth routes to layered factory (Phase 18, Plan 06) — [`d7a8c58`](https://github.com/timelessco/recollect/commit/d7a8c58374ffd48667e7efb995fe61915d8df386), closes [#23](https://github.com/timelessco/recollect/issues/23)

- **`api`** update bookmark schema to support multiple category IDs — [`eec2095`](https://github.com/timelessco/recollect/commit/eec2095f2e70cded41c8be65a9aafa0da5b8821e)

- **`api`** update image_keywords handling to use StructuredKeywords type — [`6b43e82`](https://github.com/timelessco/recollect/commit/6b43e8295b1b24dd71ee052521bcc199a44c24db)

- **`api`** update image_keywords schema to support structured object format — [`a59b623`](https://github.com/timelessco/recollect/commit/a59b6235899341f8434e0cff849915a19e46fa56)

- **`bookmarks`** enhance optimistic mutation for adding bookmarks — [`415a9d5`](https://github.com/timelessco/recollect/commit/415a9d530ee5cbed5c64757b369a7b69a4b6b10b)

- **`chrome-bookmarks`** add v2 import supplements for bookmarks — [`38b873d`](https://github.com/timelessco/recollect/commit/38b873dea1faa37d4d3729320330eb94983cb21f)

- **`chrome-bookmarks`** enhance import functionality with improved validation and schema description — [`29d1f48`](https://github.com/timelessco/recollect/commit/29d1f48107c977844b148479afbab51e904a7d19)

- **`color`** add color distance search to bookmark search RPC — [`e95bb02`](https://github.com/timelessco/recollect/commit/e95bb02c036fdfe93b2f985d85107509564c104a)

- **`color`** add color utilities for naming, search detection, and extraction — [`bd15d10`](https://github.com/timelessco/recollect/commit/bd15d10cd7f585a730e94ff092337e8eb4a3c617)

- **`color`** add ColorPalette component with hover expand and click-to-copy — [`7c627c3`](https://github.com/timelessco/recollect/commit/7c627c323f3c00668c84eaa8a94bdb5bc54b0cdc)

- **`color`** add Colors section to lightbox sidepanes — [`dd7e0b9`](https://github.com/timelessco/recollect/commit/dd7e0b965756cbf3a95fb556d937c4bd64eaaec2)

- **`color`** add culori dependency for color naming and distance — [`b480f72`](https://github.com/timelessco/recollect/commit/b480f724237a9ff5aab506bee770cec7c287f592)

- **`color`** add OKLAB color schema and integrate into bookmark metadata — [`743a5c9`](https://github.com/timelessco/recollect/commit/743a5c9271ea0d34999018496d8a794e67eee8af)

- **`color`** detect color terms in search and pass to RPC — [`2619bb8`](https://github.com/timelessco/recollect/commit/2619bb8911a11f2d5c9cd45ca458508724d0c489)

- **`color`** implement color filtering in bookmark search and enhance color extraction logic — [`2ea325d`](https://github.com/timelessco/recollect/commit/2ea325d6dfd6828f0b751d6694d95eb0b6a8aaf4)

- **`color`** implement OKLAB color conversion and enhance bookmark color handling — [`7366425`](https://github.com/timelessco/recollect/commit/7366425204148156ec4c6f5102640d89e1ab5f95)

- **`dashboard`** add preview reference to ListBox and ReorderableListBox components — [`37289ee`](https://github.com/timelessco/recollect/commit/37289ee82c5c42198ea28f2148358f6400f9c487)

- **`db`** add plan and enrichment_status migrations — [`c4c7d31`](https://github.com/timelessco/recollect/commit/c4c7d312d4817a604b387dd9ba23365e705b2565)

- **`file-upload`** enhance optimistic mutation handling and URL pre-generation — [`b305574`](https://github.com/timelessco/recollect/commit/b305574fabd2a537e6414a4f9ce5d18b6889959c)

- **`image-analysis`** enforce minimum color extraction in keywordsResponseSchema — [`e9fa746`](https://github.com/timelessco/recollect/commit/e9fa74636906de94adb2f56fd9accc3e03bf36b3)

- **`image-analysis`** introduce SYSTEM_INSTRUCTION for metadata extraction — [`26057ad`](https://github.com/timelessco/recollect/commit/26057ad45d9dc19ed7c759e950d0c44cd13eb988)

- **`imports`** add Chrome bookmark imports queue and corresponding function — [`f397633`](https://github.com/timelessco/recollect/commit/f39763324ddc98208315761ffd84aac96585dc1a)

- **`lightbox`** 🎛️ enhance pointer handling in PullEffect for improved swipe functionality — [`58a261f`](https://github.com/timelessco/recollect/commit/58a261f035deb92b21d4f9d0c9e5c91429a30210)

- **`lightbox`** add support for image_caption in metadata display logic — [`dd13972`](https://github.com/timelessco/recollect/commit/dd13972571440bd9c1a247793c908b36c2f474db)

- **`lightbox`** enhance clipboard functionality with reset capability — [`5f246d0`](https://github.com/timelessco/recollect/commit/5f246d0750865d5aa923b24654b8258d35ff3cbc)

- **`lightbox`** enhance pull-to-close functionality with pointer capture and threshold adjustments — [`b873a8c`](https://github.com/timelessco/recollect/commit/b873a8c8dba6744e946ab9cea22bea329ef3188e)

- **`lightbox`** refine metadata display logic in sidepane components — [`6e129db`](https://github.com/timelessco/recollect/commit/6e129db8baa652a6ea447eb4cc76a652fd64eec5)

- **`media-player`** 🎛️ integrate mobile view handling for media controls — [`b1acf82`](https://github.com/timelessco/recollect/commit/b1acf82c2ef548a40f43f8b5a86ded8fef2be186)

- migrate search-bookmarks to v2 ky client and restore secondaryQueryKey — [`8bd03a3`](https://github.com/timelessco/recollect/commit/8bd03a332ee15f3ad4b7c77867a847bbe11af138)

- **`migrations`** add default value and constraint to enrichment_status column — [`fc9fb49`](https://github.com/timelessco/recollect/commit/fc9fb49a8e49a268fa95a516d371ade37220f1d3)

- **`migrations`** enhance profiles and everything tables with new billing and enrichment columns — [`ccc2adc`](https://github.com/timelessco/recollect/commit/ccc2adc171999680fd24efd7e36eb5b1c2d96c73)

- **`pwa`** ✨ add Serwist service worker and PWA assets — [`060e20c`](https://github.com/timelessco/recollect/commit/060e20c88ae4dad9e441d8a0bed5d931339810cc)

- **`release`** 🔗 add PR links to changelog entries — [`408bba7`](https://github.com/timelessco/recollect/commit/408bba78b87f7b21b3905d75cd449ee7485b8601), closes [#NNN](https://github.com/timelessco/recollect/issues/NNN)

- **`safe-url`** add URL safety checks to enhance security in bookmark imports — [`c32be92`](https://github.com/timelessco/recollect/commit/c32be928d731b4a6aac3366d01ca9583c50d06d3)

- **`skill`** add wide-event-enrichment audit skill — [`1c4756b`](https://github.com/timelessco/recollect/commit/1c4756b2ca2cab29e0a29f2b009711f6dc6fa38d)

- **`types`** add enriched_at and polar_subscription_id fields to Database type — [`df65de3`](https://github.com/timelessco/recollect/commit/df65de3bcca144b14ee943ffe6ebfd82155a2694)

- **`useAddBookmarkMinDataOptimisticMutation`** enhance optimistic mutation by integrating category — [`36b04d9`](https://github.com/timelessco/recollect/commit/36b04d9be0304bf625b4f6676247a15572cf3731)

- **`vercel`** add cron job for clearing trash in Vercel configuration — [`b228da5`](https://github.com/timelessco/recollect/commit/b228da5939fd0f8d523e091d884ea195570412ae)



#### 🐞 Bug Fixes

- **`ai-enrichment`** adjust confidence threshold for key inclusion in imageToText function — [`b50717a`](https://github.com/timelessco/recollect/commit/b50717ac807695823d29f1606a82ffe6099f4271)

- **`animations`** 🐛 add blur-up for placeholder→ogImage transition — [`ec22785`](https://github.com/timelessco/recollect/commit/ec227852c7d2c856c45c94bbacb9bd5ae918a9a2)

- **`animations`** 🐛 address code review findings — [`909ec22`](https://github.com/timelessco/recollect/commit/909ec223153b30f300576710d1b7ace0a15e6b84)

- **`animations`** 🐛 enhance loading state handling and animation tracking — [`40adddb`](https://github.com/timelessco/recollect/commit/40adddbb1d88e6a7401d194080a2d0b31f2d25ce)

- **`animations`** 🐛 fix ogImage→screenshot blur-up and remove text placeholder — [`8d631b0`](https://github.com/timelessco/recollect/commit/8d631b0680957ebfc859c9389f5267d7b4a26cc0)

- **`animations`** 🐛 fix spelling (recognise → recognize) — [`27125b0`](https://github.com/timelessco/recollect/commit/27125b022dfc8ddbb6096ea63ee9cb00811cf726)

- **`animations`** 🐛 simplify animation state to use existing conditions — [`8a83ffc`](https://github.com/timelessco/recollect/commit/8a83ffc9b0235495dc628a700d86a6e6746d2420)

- **`api`** 🐛 address CodeRabbit review findings across v2 routes — [`8b08105`](https://github.com/timelessco/recollect/commit/8b081050ad870825c673a778861c7f41335f497d)

- **`api`** 🐛 replace random slug in category supplement example — [`78ab5cd`](https://github.com/timelessco/recollect/commit/78ab5cd2d721b11bceacc0de5ade180c7059c227)

- **`api`** 🐛 restore v1 error handling in upload-profile-pic and file upload — [`d399b6c`](https://github.com/timelessco/recollect/commit/d399b6c918488bf4c024d3fc8492867c8c510d47)

- **`api`** 🗑️ remove stale useFetchBookmarkById.ts — [`1dd94a9`](https://github.com/timelessco/recollect/commit/1dd94a9096700ebbd7f0d137994d4fa46a57640e)

- **`api`** extract cause fields in RecollectApiError.toLogContext for Axiom — [`c398981`](https://github.com/timelessco/recollect/commit/c39898107f13956c22848ede32f7a9a0c9b1d3aa)

- **`api`** replace console.error with logger/ctx.fields in upload-file — [`0aadeea`](https://github.com/timelessco/recollect/commit/0aadeeaf3311e95228941c822ac3bfe129732245)

- **`api`** update Google Generative AI integration to new package name and version — [`01389f6`](https://github.com/timelessco/recollect/commit/01389f6c868b4cbd135bb53091d5f3102a1493d2)

- **`api`** update retried_count in context fields for retry route handling — [`b9e8787`](https://github.com/timelessco/recollect/commit/b9e878776b00a08176832ef4d59924ede2992b36)

- **`audio-waveform-player, media-player`** 🐛 add captions track to audio and video — [`46211b7`](https://github.com/timelessco/recollect/commit/46211b79b9a0a7a88b1bf811e1fe77679e0fc370)

- **`audio-waveform-player`** 🐛 correct oxlint comment directive for accessibility rule — [`6370fef`](https://github.com/timelessco/recollect/commit/6370fef735acf11fc484f2f8a4837d09be12febf)

- **`auth`** restore login page layout, autofocus email fallback, and remove broken experimental flags — [`aa91ca0`](https://github.com/timelessco/recollect/commit/aa91ca0a2598ae80fe62ea240d70709808af5cd8)

- **`bookmarkOgImage`** 🐛 adjust className logic for audio and video conditions — [`8c771b1`](https://github.com/timelessco/recollect/commit/8c771b16b7139bc640926552e8835175bb80a898)

- **`bookmarks`** 🐛 re-render card when categories swap during drag-drop — [`98dad5c`](https://github.com/timelessco/recollect/commit/98dad5c254d8dba5dba0b8ff38eecdcafcef0d1a)

- **`bookmarks`** 🐛 unify media category filters — [`d6dfbfa`](https://github.com/timelessco/recollect/commit/d6dfbfa8a011980d8a0575476f7a1f0f580e80df)

- **`chrome-bookmarks`** correct title and URL for GitHub bookmark in import schema — [`ce34a64`](https://github.com/timelessco/recollect/commit/ce34a64b9cbac3233bdb0191f0c20019f19830c8)

- **`ci`** 🐛 prevent noise entries in API changelog — [`22fd901`](https://github.com/timelessco/recollect/commit/22fd90131f071fcc9bca606fb615e34be0b15bec)

- **`color`** add missing grey alias entries to DISPLAY_NAMES — [`330be99`](https://github.com/timelessco/recollect/commit/330be998d84c129f9cccad4d297b6ff27eeaf22d)

- **`color`** drop old RPC overloads so PostgREST resolves color_hex — [`38d25cb`](https://github.com/timelessco/recollect/commit/38d25cbd71ab6110e9bf4d46885bfee226e7efb2)

- **`color`** filter bookmarks by color distance, not just rank — [`317cd77`](https://github.com/timelessco/recollect/commit/317cd77a6f03676f8391288f2a3ecdd6325ff576)

- **`color`** fix color search not working — [`556f8f5`](https://github.com/timelessco/recollect/commit/556f8f571d4315d27f31f1dd2a76c0cf8ba2e6e1), closes [#FF0000](https://github.com/timelessco/recollect/issues/FF0000)

- **`color`** fix tooltip not showing in lightbox — [`7565269`](https://github.com/timelessco/recollect/commit/756526928b78401f6ad43eefc9a600206ec7047b)

- **`color`** fully controlled tooltip — survives click, closes on leave — [`52d771f`](https://github.com/timelessco/recollect/commit/52d771f6e2ff67f2016785ef7b3140f52fa030f7)

- **`color`** increase color distance threshold from 80 to 200 — [`9fa2fc0`](https://github.com/timelessco/recollect/commit/9fa2fc03a2e51f6882e03b9dae45c4169e722741), closes [#4F6AA1](https://github.com/timelessco/recollect/issues/4F6AA1) [#0000FF](https://github.com/timelessco/recollect/issues/0000FF)

- **`color`** keep tooltip open to show Copied! feedback on click — [`b7ac38c`](https://github.com/timelessco/recollect/commit/b7ac38c639bec6ac136379066512eab5eb5ceda3)

- **`color`** prevent color: hex values from being parsed as tags — [`adcec4a`](https://github.com/timelessco/recollect/commit/adcec4adb1e9da5ea80c4a4cc5288165ba3f0af2)

- **`color`** prevent mousedown focus change from closing tooltip — [`5e1b0ff`](https://github.com/timelessco/recollect/commit/5e1b0ff594a79d83bb58665569694a7fd577ac82)

- **`color`** regenerate DB types to include color_hex RPC parameter — [`225f9ab`](https://github.com/timelessco/recollect/commit/225f9ab3742badc3ec78206aa0c18f284f2258d3)

- **`color`** remove forced open prop, rely on natural hover behavior — [`1df19f3`](https://github.com/timelessco/recollect/commit/1df19f31df8362a257245275622f1ddde564265c)

- **`color`** remove timeout, reset Copied! on mouse leave instead — [`84f57e6`](https://github.com/timelessco/recollect/commit/84f57e6d9a5bdda1ff868816679ce976f5d3e03f)

- **`color`** smarter color matching — skip achromatic stored colors — [`8562380`](https://github.com/timelessco/recollect/commit/85623806d1220ffed388f635611030808597942f)

- **`color`** strip bare color: prefix from search text — [`f36f336`](https://github.com/timelessco/recollect/commit/f36f336f5fe7d5ff36c68063c67e2886a30886f1)

- **`color`** use closeOnClick={false} to keep tooltip open on click — [`2591871`](https://github.com/timelessco/recollect/commit/25918710164b271ebf67448422c4688e8d632f00)

- **`color`** use color: prefix syntax for color search — [`649b509`](https://github.com/timelessco/recollect/commit/649b509301cf43842817c2e2cb0b95eb37cf16de), closes [#tag](https://github.com/timelessco/recollect/issues/tag)

- **`colorUtils`** enhance bookmark color extraction by validating structured keywords format — [`9255f00`](https://github.com/timelessco/recollect/commit/9255f0014ac3c8b6f774673e024deb685bb713c4)

- **`config`** add Dribbble to cspell dictionary — [`d637baf`](https://github.com/timelessco/recollect/commit/d637baf914f799a4fbc78804a7974ee609118f18)

- **`cron`** 🐛 improve error handling in clear-trash route response — [`2995a7a`](https://github.com/timelessco/recollect/commit/2995a7abb0db5cf67cab648d3709134190b5b76d)

- **`cron`** 🛠️ update environment variable comment for clarity in clear-trash route — [`0d6771b`](https://github.com/timelessco/recollect/commit/0d6771bf380a2ca0d63f65d9d91d6d9893422d47)

- **`cron`** use z.strictObject() to enforce mutually exclusive retry modes — [`a626c1c`](https://github.com/timelessco/recollect/commit/a626c1cc61427e91b9b4d18194858489ca2a900c)

- **`dashboard`** enhance loading state handling in AnimatedBookmarkImage — [`ea8b9fc`](https://github.com/timelessco/recollect/commit/ea8b9fc946010f9b7ce5e7ba725c536213129bc8)

- **`dashboard`** update key prop in CardSection to use item.id directly — [`22990a4`](https://github.com/timelessco/recollect/commit/22990a4884e9c38e3842485a608392fab9eff1a5)

- **`db`** merge pre-existing additional_keywords instead of overwriting — [`39f4ef7`](https://github.com/timelessco/recollect/commit/39f4ef7cefcacc8c13bf0931a57b73f4ce789f98)

- **`db`** migrate image_keywords numeric-keyed features to additional_keywords array — [`6c060e0`](https://github.com/timelessco/recollect/commit/6c060e05e4358ac06300d27de70e9603e12c61b5)

- **`docs`** 🩹 fix duplicate H1 in solution doc — [`3c0ac87`](https://github.com/timelessco/recollect/commit/3c0ac87b50656dbab1f19f8d859f362ab82bf9c0)

- drop stale 3-param search RPC overload and fix NaN category ownership check — [`08fd5f6`](https://github.com/timelessco/recollect/commit/08fd5f611b86711b3d2de1da60f399f0e32edaa1)

- enhance color migration verification with lightness check and malformed array handling — [`3d0dc61`](https://github.com/timelessco/recollect/commit/3d0dc618056bd2eecdc54ad85edcf39daa76a117)

- **`env`** 🐛 restore ProcessEnv types + regenerate DB types — [`3bb8098`](https://github.com/timelessco/recollect/commit/3bb8098787847486d121ca73198152573bbf5fa0)

- **`eslint`** 🔧 disable sort-collections for package.json — [`9f59e8d`](https://github.com/timelessco/recollect/commit/9f59e8dd0f5c962b69e610de4e0cb882f0211bbb)

- **`favorites`** 🐛 harden drop target resolution in useHandleBookmarksDrop — [`0a9a476`](https://github.com/timelessco/recollect/commit/0a9a4766bb102b18c7a8e554864b789a59ec2725)

- **`favorites`** 🐛 restore drag-and-drop of bookmarks onto favourites — [`b7641ae`](https://github.com/timelessco/recollect/commit/b7641ae7d005d427fc37eaba88b2b50c8dba291d), closes [#849](https://github.com/timelessco/recollect/issues/849)

- **`favorites`** 🐛 use US spelling in hook comment to satisfy cspell — [`089aed9`](https://github.com/timelessco/recollect/commit/089aed9e249e1f52aafa3ce79c1f9652dd3e69c7)

- **`icons`** 🐛 update icon dimensions and improve formatting — [`dde5ba0`](https://github.com/timelessco/recollect/commit/dde5ba07bd7f0a093aedf6d39a018d6177abc561)

- **`imageToText`** dynamically set mimeType based on fetched image content type — [`3dc0e9f`](https://github.com/timelessco/recollect/commit/3dc0e9fa47c2ce4ffadaf7a2edefc7c6175aa64d)

- improve chromatic distance calculation with positional threshold gating — [`370b7f8`](https://github.com/timelessco/recollect/commit/370b7f8d68ece811debb5c100566d7274bd85de9)

- **`lightbox`** add additional line breaks for image captions in sidepane components — [`051e3a3`](https://github.com/timelessco/recollect/commit/051e3a3bb0c69bcb978f9cadad06c320769dbf72)

- **`lightbox`** improve pointer handling in PullEffect to prevent unintended interactions — [`beceada`](https://github.com/timelessco/recollect/commit/beceadaa4391ef5a553443bd6d4a3a2ed98dc741)

- **`lint`** 🐛 add 'nums' to cspell dictionary — [`1e91077`](https://github.com/timelessco/recollect/commit/1e91077a6312527c91f31a89a90149c1caa238d7)

- **`lint`** 🐛 add 'nums' to cspell dictionary (CI-only word) — [`d2a4e09`](https://github.com/timelessco/recollect/commit/d2a4e09c20588a56387cbd035d07e3cc6a147b0a)

- **`lint`** 🐛 enable and fix 13 medium oxlint rules (~148 violations) — [`11da55d`](https://github.com/timelessco/recollect/commit/11da55ded5907c9a5532492890b1685416487a20)

- **`lint`** 🐛 enable and fix 30+ trivial oxlint rules — [`dc2b2cf`](https://github.com/timelessco/recollect/commit/dc2b2cfe6452cbeb70c5c31f1c63f5e7096448c1)

- **`lint`** 🐛 enable and fix remaining oxlint rules (~77 violations) — [`b133206`](https://github.com/timelessco/recollect/commit/b133206d23d3365eafb711aca5185498c2535382)

- **`lint`** 🐛 enable oxlint type-aware linting + fix ~800 violations — [`328bde3`](https://github.com/timelessco/recollect/commit/328bde312a29f8db90a3e3b540da198eb88bbe66)

- **`lint`** 🐛 fix spellcheck and lint-staged glob — [`6400213`](https://github.com/timelessco/recollect/commit/640021356896f7ff1b7070c9b1ad6835cf645fe2)

- **`lint`** 🐛 remove async from functions with nested await only — [`db27c56`](https://github.com/timelessco/recollect/commit/db27c56eced81b2cb20b7653ee9f1ea90ca5a470)

- **`lint`** 🐛 remove redundant tanstack query rule overrides + document perfectionist oscillation — [`6a930f9`](https://github.com/timelessco/recollect/commit/6a930f9515a0577e0aa3ce7563c1f19815417575), closes [oxc#20210](https://github.com/timelessco/oxc/issues/20210)

- **`lint`** 🐛 remove remaining unnecessary async keywords — [`be615be`](https://github.com/timelessco/recollect/commit/be615be2711db6b951a074c818b6cd7310153c1b)

- **`lint`** 🐛 remove unnecessary async from non-awaiting functions — [`2758885`](https://github.com/timelessco/recollect/commit/2758885f01c503d07a1124dfb51605edd02c2f0e)

- **`lint`** 🐛 revert unsafe || → ?? and optional chaining removals — [`e77dd1e`](https://github.com/timelessco/recollect/commit/e77dd1ed9190ac05cadd11c2c968ba9e99fa2149)

- **`media-player`** 🐛 add playsInline attribute and remove default track — [`13a9eb1`](https://github.com/timelessco/recollect/commit/13a9eb12816b42681c44e2b3db8fdb09f39e7f4e)

- **`moodboard`** 🐛 prevent card position jumping during scroll — [`389a1c9`](https://github.com/timelessco/recollect/commit/389a1c986776b34a8c647356136f01ef61eeb6be), closes [TanStack/virtual#659](https://github.com/TanStack/virtual/issues/659)

- **`openapi`** 🐛 add SKIP_ENV_VALIDATION to scanner scripts — [`a0a8a7f`](https://github.com/timelessco/recollect/commit/a0a8a7f3d9f88b4d0569b4e496fccc47e1e3ce39)

- relax color search thresholds (0.30/0.25/0.18) — [`d0d8a80`](https://github.com/timelessco/recollect/commit/d0d8a806bdc96e9a8742bfd8e9213311d921c0ee)

- **`release`** 🐛 use current branch for GraphQL enrichment — [`2efc00a`](https://github.com/timelessco/recollect/commit/2efc00aba7f5bf9b1a4952d10eabaab41ca646df)

- **`release`** normalize stderr redirect spacing in release-pr.sh — [`a18dd5e`](https://github.com/timelessco/recollect/commit/a18dd5e2cfbf4e7200d45f6505ab20247aff1875)

- replace DOCUMENT_MIME_PREFIX with explicit DOCUMENT_MIME_TYPES — [`bf3c343`](https://github.com/timelessco/recollect/commit/bf3c3434bd33219c5a0770b619075798eb276fa5)

- **`search`** 🐛 add isSharedCategory to query key — [`dd26329`](https://github.com/timelessco/recollect/commit/dd263296aaf41e3d88d8d3b6cf33c165ee5f08f7)

- **`search`** 🛠️ enhance useSearchBookmarks with category data retrieval — [`5c40918`](https://github.com/timelessco/recollect/commit/5c40918cb3a93a1a2c9cc15941c45410afff8f3b)

- **`search`** replace String.prototype.match with RegExp.exec for color extraction — [`b6b4f5e`](https://github.com/timelessco/recollect/commit/b6b4f5e82e4f9bcbdce0e9bacc09c68171748283)

- **`seo`** 🔍️ restrict robots to public routes and simplify sitemap — [`4e27f81`](https://github.com/timelessco/recollect/commit/4e27f8188b7a537f74fdde7172cdf3640007ac16)

- **`spelling`** 📝 add svgs to cspell dictionary — [`a73f204`](https://github.com/timelessco/recollect/commit/a73f2042f03c298eb930dca962bfe68ad8cc73a8)

- **`spelling`** add AI keyword terms to cspell dictionary — [`62b685f`](https://github.com/timelessco/recollect/commit/62b685fc7517bb952a737400a48f189aebe5e2fd)

- **`spelling`** add culori-related terms to cspell dictionary — [`ed9f83b`](https://github.com/timelessco/recollect/commit/ed9f83bdc25779857c90618e9ae5b370842d8ba6)

- **`supabase`** improve error handling in validateApiKey function — [`5bb733a`](https://github.com/timelessco/recollect/commit/5bb733acd7be7ddcd81545c11cc9c00a61ba57eb)

- **`upload`** 🐛 normalize uploaded MIME types — [`acae11d`](https://github.com/timelessco/recollect/commit/acae11dad302dca202748a071927165c524b124e)

- **`upload`** add MOV video support with prefix-based MIME validation — [`398292d`](https://github.com/timelessco/recollect/commit/398292d5b0d9eef973b110f8576f98709d38ff8d)



#### ♻️  Code Refactoring

- add description metadata for colors in bookmark schemas — [`835aa12`](https://github.com/timelessco/recollect/commit/835aa1240415b19d2d0f46554d5a43e386bca421)

- add MIME prefix constants and use throughout codebase — [`66c7394`](https://github.com/timelessco/recollect/commit/66c7394f842f98a00b57925162e23ff8eb9382a0)

- **`ai-enrichment`** combine base types with domain qualifiers — [`b5645cd`](https://github.com/timelessco/recollect/commit/b5645cdcd0299d41af684a1f8bd34dabde5d49da)

- **`ai-enrichment`** enhance extract_keywords_text function — [`f71fdfd`](https://github.com/timelessco/recollect/commit/f71fdfdd4d7f39fb38eb9bcb08f48b4c0efcb8ef)

- **`ai-enrichment`** enhance structured keywords and features handling — [`3e2bbd1`](https://github.com/timelessco/recollect/commit/3e2bbd1f4df124ba006f62ed5d168348739bc166)

- **`ai-enrichment`** implement structured keywords for image analysis — [`4dba4e6`](https://github.com/timelessco/recollect/commit/4dba4e6c20dd53f2a367df37cf827f3d116045f3)

- **`ai-enrichment`** remove description from metadata context in imageToText function — [`1623988`](https://github.com/timelessco/recollect/commit/1623988528abe6d33ba4d378c35347711bce5367)

- **`ai-enrichment`** remove hardcoded site categories and enhance keyword instructions — [`2806842`](https://github.com/timelessco/recollect/commit/2806842bb1ad656806e11afe7a8d42e1ae682333)

- **`ai-enrichment`** restore description to metadata context in imageToText function — [`fecb3b2`](https://github.com/timelessco/recollect/commit/fecb3b25c950972ba8316d44ccbb993230aebab4)

- **`ai-enrichment`** simplify summary prompt, show OCR/keywords only on search match — [`5d5ce53`](https://github.com/timelessco/recollect/commit/5d5ce53b2aea84a2cb5d41c47da494942edd7072)

- **`ai-enrichment`** update allowed values for content types in imageToText function — [`3932edf`](https://github.com/timelessco/recollect/commit/3932edf5e9f566cbaef735d06ba343b4bf90bb4f)

- **`ai-enrichment`** use descriptive type labels instead of enum — [`d2bab1b`](https://github.com/timelessco/recollect/commit/d2bab1b43d289ef85ccafdc3ae7b235b2b9a291b)

- **`ai-enrichment`** use domain-based type labels for keywords — [`dd02348`](https://github.com/timelessco/recollect/commit/dd0234884765821eda59fa2f725f9aff08aff705)

- **`ai`** rename imageToText.ts to image-analysis.ts — [`b86c676`](https://github.com/timelessco/recollect/commit/b86c6769fb6f0eb688b2299300eb561b7ac27f15)

- **`ai`** update imports to use new image-analysis-schema — [`3ade46f`](https://github.com/timelessco/recollect/commit/3ade46f0cb18d9615fbe8b6203b22b05290e396e)

- **`animatedBookmarkImage`** improve error handling and loading logic with useRef — [`a9d406a`](https://github.com/timelessco/recollect/commit/a9d406a245b950eeea7309a6e46d45a494519d93)

- **`animatedBookmarkImage`** replace event listeners with HTMLImageElement.decode() — [`d3f932b`](https://github.com/timelessco/recollect/commit/d3f932b1c547523bd301036424f6c8f2032e1307)

- **`animation`** clean up old code — [`722463c`](https://github.com/timelessco/recollect/commit/722463c7e8f737dcdff75ab6c1b4f6904ac74d79)

- **`api`** ♻️ add structured logging and fix empty block in add-remaining-bookmark-data — [`2f01d5d`](https://github.com/timelessco/recollect/commit/2f01d5d7a737469fc221bbdd0c6b98fc36ae0f83)

- **`api`** 📝 update upload-file-remaining-data supplement with E2E-derived examples — [`477807e`](https://github.com/timelessco/recollect/commit/477807efb6a7c579a21f2e7f52ae5bc5abcb81ab)

- **`api`** 🔧 pre-Phase 10 audit fixes across all v2 routes — [`9cfccef`](https://github.com/timelessco/recollect/commit/9cfccef4352688a30e93bca189a66d64fcb1503b)

- **`api`** 🔧 propagate error cause across v2 routes and split API rules — [`82768e3`](https://github.com/timelessco/recollect/commit/82768e3a2cbb895494d565407fdec915891263e1)

- **`api`** clean up v2 factory comments — [`55a5927`](https://github.com/timelessco/recollect/commit/55a5927785e20ec4fd656e2e77fba5816f04ab14)

- **`api`** migrate after() error handling from Sentry to logger.warn — [`3623ac6`](https://github.com/timelessco/recollect/commit/3623ac68edb299b3e30940ac01c94a697ecab8db)

- **`api`** move is_media_url before insert, add has_og_image — [`d992b62`](https://github.com/timelessco/recollect/commit/d992b62339a4e06a59bd57a07e36b4ccc378d269)

- **`api`** replace console statements with ctx.fields in v2 routes — [`e506741`](https://github.com/timelessco/recollect/commit/e506741c61e63c002ad1b3779d1a4399154cfa78), closes [#23](https://github.com/timelessco/recollect/issues/23)

- **`api`** simplify bookmark multiple categories response structure and update output schema — [`0a60797`](https://github.com/timelessco/recollect/commit/0a607976ff3346a76ca972a26f7d4b836f3a5deb)

- **`api`** streamline bookmark addition process — [`9b87349`](https://github.com/timelessco/recollect/commit/9b8734918aeaa593fc7c56da707b2f96793852a0)

- **`api`** update Google AI integration and restructure image analysis schemas — [`b98c7cf`](https://github.com/timelessco/recollect/commit/b98c7cf19085b2a91a3885983bc1ffa55de98c8e)

- **`async`** 🛠️ replace void IIFE with direct async callbacks — [`4de2300`](https://github.com/timelessco/recollect/commit/4de230053e0cce18f6be339db47509cd48b19830)

- **`auth`** ♻️ migrate auth routes to axiom — [`21c8f6b`](https://github.com/timelessco/recollect/commit/21c8f6b692c38c2f9cc48e7aa4b1991eaf15fa9e)

- **`bookmarks-view`** remove legacy flat format support — [`235178a`](https://github.com/timelessco/recollect/commit/235178a2004616d77b3c0c5c4ff7188ae9248855)

- **`bookmarks`** ♻️ replace type assertion with runtime filter — [`6bf1f11`](https://github.com/timelessco/recollect/commit/6bf1f117185fe1fc55ca98363e9dab6c48a58469)

- **`chrome-imports`** enhance error handling and authorization in Chrome bookmark imports — [`d4ee605`](https://github.com/timelessco/recollect/commit/d4ee60510406a7aa694b6fa8c14fc1ea30edfaea)

- clarify color ordering description in prompt and schema — [`071dbc6`](https://github.com/timelessco/recollect/commit/071dbc60fb14cc84ce115c2723940f755a97d68a)

- **`color-palette`** enhance useCopyToClipboard hook — [`93801e1`](https://github.com/timelessco/recollect/commit/93801e1dae279b9e0688571d50d2b971927a4e4a)

- **`color-palette`** implement custom clipboard hook and streamline copy functionality — [`c7e019e`](https://github.com/timelessco/recollect/commit/c7e019e969db3bc9ff84c4d06a591c24dee59e71)

- **`color-palette`** move useCopyToClipboard hook to a separate file — [`c12ffcd`](https://github.com/timelessco/recollect/commit/c12ffcdbd6f22a8ea883155a180f434a48e80544)

- **`color-palette`** simplify margin handling and remove unnecessary state management — [`9de5236`](https://github.com/timelessco/recollect/commit/9de5236f4f3949de286ef284c4712632f14dbdf8)

- **`color`** enhance color distance search logic for achromatic and chromatic matching — [`c271edc`](https://github.com/timelessco/recollect/commit/c271edc98693ef090a620115c1c3724093f7c721)

- **`color`** refine color distance search logic with updated scoring for primary — [`36ab634`](https://github.com/timelessco/recollect/commit/36ab6348f355ea596519fe0bad021b2d5cca3142)

- **`color`** remove unused theme logic and simplify color handling in ColorPalette component — [`b5bd895`](https://github.com/timelessco/recollect/commit/b5bd89517bd5a7fa78d7b2d5402ded231aa974dc)

- **`color`** replace Euclidean RGB distance with perceptual OKLAB distance — [`2f391a7`](https://github.com/timelessco/recollect/commit/2f391a7744db463fb45199fcec578a29ce320498)

- **`color`** streamline color distance search logic and update function comments for clarity — [`3a703f1`](https://github.com/timelessco/recollect/commit/3a703f18d52d6d256f8d549762a1ab18e77a9160)

- **`color`** update color handling to remove hex from OklabColor — [`3e71064`](https://github.com/timelessco/recollect/commit/3e71064f73146360e986a0c51bc002a795147299)

- **`cron`** 🛠️ implement POST handler for clear-trash route with authorization checks — [`6062a9a`](https://github.com/timelessco/recollect/commit/6062a9ab6c9c7fce94a5046a1230fab3abe723b7)

- **`cron`** 🛠️ streamline clear-trash route with improved POST handler and schema validation — [`dd43a9c`](https://github.com/timelessco/recollect/commit/dd43a9cbbdbe38c793a53daaef9a28b72223d02e)

- **`cron`** streamline process-archived route with handler factory and schema validation — [`8a6a724`](https://github.com/timelessco/recollect/commit/8a6a724cc1a923edbf6a31b94e1007c91df498b5)

- deduplicate MIME type validation logic — [`1b51e95`](https://github.com/timelessco/recollect/commit/1b51e95250f7699774b5885a5862b2d1a23f688b)

- **`email-client`** 🛠️ improve async handling in EmailToOtpForm for better error management — [`618ba41`](https://github.com/timelessco/recollect/commit/618ba41a18f89434a731a0d91efa9f093ca3df47)

- **`env`** ♻️ typed env validation + agent restructuring — [`a6c9726`](https://github.com/timelessco/recollect/commit/a6c97264add29ad4a370897dac37260a691bc44b)

- **`eslint`** 🔧 overhaul config with new plugins — [`cc4e498`](https://github.com/timelessco/recollect/commit/cc4e498ac12b05d2790a2142114ff31bf613bdc0)

- **`file-upload`** streamline optimistic mutation logic and improve loading state handling — [`eaf8acf`](https://github.com/timelessco/recollect/commit/eaf8acfb47954ab2848df1cf32207cac9bc808ac)

- flatten color storage to sorted array with positional search weighting — [`5645288`](https://github.com/timelessco/recollect/commit/5645288d239f6face9c730a6bf00b8a2fc391d3e)

- **`hooks`** rename reset function to resetCopied for clarity — [`c43c675`](https://github.com/timelessco/recollect/commit/c43c675d247cc8970fb0b979a0056fafc3a76737)

- **`imageCard`** enhance bookmark image handling with smooth transitions — [`7df1f4e`](https://github.com/timelessco/recollect/commit/7df1f4e5a04d97af64c2653bf974e10acc03c7e6)

- **`imageCard`** streamline image handling by introducing BookmarkImageWithAnimation component — [`284de7d`](https://github.com/timelessco/recollect/commit/284de7dbfc1505546546b81bafc06af186ced84c)

- **`imageToText`** streamline empty result handling and improve error reporting — [`c581976`](https://github.com/timelessco/recollect/commit/c58197624aac58e17aaf74bc99152a2ace16895d)

- **`lightbox`** 🛠️ simplify pointer handling in PullEffect by removing unnecessary — [`f267fa0`](https://github.com/timelessco/recollect/commit/f267fa0fd92dd0f393676b471ca595fdd080d92b)

- **`lightbox`** display image keywords in sidepane regardless of environment — [`324cfe9`](https://github.com/timelessco/recollect/commit/324cfe968659797be493614381e3f227ea71cb40)

- **`lightbox`** improve conditional rendering for captions — [`32066b8`](https://github.com/timelessco/recollect/commit/32066b8b90316f54b08a5fe178370c64f3b000c3)

- **`lightbox`** simplify mouse enter behavior in ColorPalette component — [`2382152`](https://github.com/timelessco/recollect/commit/2382152c99b991fece617831d9622e4ae14393db)

- **`LoaderImgPlaceholder`** simplify loading state handling and remove unused props — [`c817029`](https://github.com/timelessco/recollect/commit/c8170292fd7eff7326305115dc14711cb7b79e43)

- **`media-player`** 🛠️ remove mobile view handling and clean up unused imports — [`a1669c6`](https://github.com/timelessco/recollect/commit/a1669c6b521ebff13f439e9c087ee46a7743b00b)

- **`migrations`** remove default value and update comment for enrichment_status column — [`6dbefad`](https://github.com/timelessco/recollect/commit/6dbefad42b17674b2b83507e61aa2c4bf64db03b)

- **`migrations`** standardize SQL syntax and comments in profile — [`0a9650f`](https://github.com/timelessco/recollect/commit/0a9650f06f7263d03e27113ff29d0b4c123467ca)

- **`prompt-builder`** modify ocr_text to conditionally append a comma based — [`431125b`](https://github.com/timelessco/recollect/commit/431125b5276b5fff0c38aaf6001c86f0d0b26e18)

- **`prompt-builder`** remove unnecessary whitespace in prompt builder functions — [`3def7a9`](https://github.com/timelessco/recollect/commit/3def7a91028f3ff030c0de831226570041ee4960)

- **`prompt-builder`** update example block to conditionally include collections line — [`4cfb28d`](https://github.com/timelessco/recollect/commit/4cfb28ddc74f8527568cd6957fc8380a7f6f0e89)

- **`react-query`** update query client configuration for improved data refetching — [`12c9215`](https://github.com/timelessco/recollect/commit/12c92156b8425712571e2a29f39faf05f60339e4)

- **`release`** 🔄 deduplicate changelog to one entry per PR — [`5200ba0`](https://github.com/timelessco/recollect/commit/5200ba0377a48e91a8fb64c99d890d1930af9561)

- **`schema`** remove unused fields from Chrome bookmark import schema — [`55211d7`](https://github.com/timelessco/recollect/commit/55211d793ded943e92a2e58d77c53951d61cc3d1)

- **`url-checks`** simplify URL safety comments in bookmark import function — [`38244b7`](https://github.com/timelessco/recollect/commit/38244b7ab33932b205e95c344c3c13b439e6d31c)

- use DOCUMENT_MIME_TYPES in isAcceptedMimeType for DRY — [`58dd07e`](https://github.com/timelessco/recollect/commit/58dd07e1218ba58ed9983a9eac9b9733ec2f2cb3)

- use MIME prefix constants in isBookmark type helpers — [`9d3c956`](https://github.com/timelessco/recollect/commit/9d3c956d9ce331d3e42f9a5b075a9def2aef17bd)

- use MIME type prefix matching for media type queries — [`af7a07a`](https://github.com/timelessco/recollect/commit/af7a07a0bcbf4a6dac591f6c5be5b99137d25873)

- **`useAddBookmarkMinDataOptimisticMutation`** remove unused category fetching logic — [`1a0babf`](https://github.com/timelessco/recollect/commit/1a0babf3d3fe8156839f13d2573a43c26a1381d4)

- **`useGetViewValue`** replace queryClient with custom hooks for fetching categories — [`cb823c1`](https://github.com/timelessco/recollect/commit/cb823c12f9c42d83dab7a89268be92d7b3392e3e)



#### 📔 Documentation Changes

- add design spec for image preload decode() migration — [`fbcdc9f`](https://github.com/timelessco/recollect/commit/fbcdc9f91650459b2a3cb0057da1220c6aac20f5)

- **`api`** add pitfall [#28](https://github.com/timelessco/recollect/issues/28) — OpenAPI supplement envelope mismatch after factory migration — [`5471005`](https://github.com/timelessco/recollect/commit/54710050b265f12cdab5f076163b4e848bfa22d9)

- **`api`** update API changelog [skip ci] — [`3366861`](https://github.com/timelessco/recollect/commit/336686180b39a23f5f1a29583769826f4730f2e9)

- **`api`** update API changelog [skip ci] — [`16f3e1d`](https://github.com/timelessco/recollect/commit/16f3e1d3edf2ac0a9ebfb7701ada7e898dc3e317)

- **`api`** update API changelog [skip ci] — [`6ff102f`](https://github.com/timelessco/recollect/commit/6ff102f7dc9b11adf65005b5f01373eef7d13012)

- **`api`** update API changelog [skip ci] — [`ea49eab`](https://github.com/timelessco/recollect/commit/ea49eab2a1c6c0ca06a0abc07b6bb9b965ab4057)

- **`api`** update API changelog [skip ci] — [`b02d5e0`](https://github.com/timelessco/recollect/commit/b02d5e010ad73caa81bdba5c59de1e86ae546485)

- **`api`** update API changelog [skip ci] — [`1058418`](https://github.com/timelessco/recollect/commit/10584185569c6cc9289f7ee4a59ed29151f50cdb)

- **`api`** update API changelog [skip ci] — [`16219a5`](https://github.com/timelessco/recollect/commit/16219a5c0da377423813bd0152d58650a34d95fe)

- **`api`** update API changelog [skip ci] — [`d32f1f9`](https://github.com/timelessco/recollect/commit/d32f1f98bb837e6448974f8062748e19a323e7d8)

- **`api`** update API changelog [skip ci] — [`eb5c63f`](https://github.com/timelessco/recollect/commit/eb5c63f52aab15bff95a5589b54c34012eb086a3)

- **`api`** update API changelog [skip ci] — [`9c0f918`](https://github.com/timelessco/recollect/commit/9c0f918b84a493037efc9d5bb65df2bb459596c0)

- **`api`** update API changelog [skip ci] — [`05295a6`](https://github.com/timelessco/recollect/commit/05295a6f1b971aac60b0fa3e89652bb7a37080a3)

- **`api`** update API changelog [skip ci] — [`2b14838`](https://github.com/timelessco/recollect/commit/2b14838daf14cd7b3110bee5c416c13d0ec8d1ac)

- **`api`** update API changelog [skip ci] — [`68f84c4`](https://github.com/timelessco/recollect/commit/68f84c4cf8746176a62d686bb7ea8cf444ec419e)

- **`api`** update API changelog [skip ci] — [`d23fdb6`](https://github.com/timelessco/recollect/commit/d23fdb622455050b2a52c3d8da3c1403575a7bb3)

- **`api`** update API changelog [skip ci] — [`3f4ce7e`](https://github.com/timelessco/recollect/commit/3f4ce7eb1c45374dd157a6318e180e67749d6a0c)

- **`api`** update API changelog [skip ci] — [`17aff9d`](https://github.com/timelessco/recollect/commit/17aff9ddbec1f67df799938d879a030488b48939)

- **`api`** update API changelog [skip ci] — [`54da6fa`](https://github.com/timelessco/recollect/commit/54da6fa82ea32a3bbda0aa1364c8356e67dd0ae9)

- **`api`** update API changelog [skip ci] — [`01f72ec`](https://github.com/timelessco/recollect/commit/01f72ec2ccc7a4e6dc799076d2cad8770cbd3a1e)

- **`api`** update API changelog [skip ci] — [`fe19a28`](https://github.com/timelessco/recollect/commit/fe19a282f4655469742e792e63d05f0907973930)

- **`api`** update API changelog [skip ci] — [`49cbe8a`](https://github.com/timelessco/recollect/commit/49cbe8aa0a867f9816cd64c540f43f35c3ced09e)

- **`api`** update API changelog [skip ci] — [`950f2c7`](https://github.com/timelessco/recollect/commit/950f2c7e57032c3ed58f160b2e3143932b5fd92c)

- **`api`** update API changelog [skip ci] — [`c188225`](https://github.com/timelessco/recollect/commit/c18822593a0ae01bb1073bef4facb23a70752c0d)

- **`api`** update API changelog [skip ci] — [`6fb3352`](https://github.com/timelessco/recollect/commit/6fb3352f60aa7fe424e6d8fa6158a95d21ff1be2)

- **`api`** update API changelog [skip ci] — [`65cb86f`](https://github.com/timelessco/recollect/commit/65cb86f7008ffc46e26953f24c880c38d4eecec5)

- **`api`** update API changelog [skip ci] — [`49c9042`](https://github.com/timelessco/recollect/commit/49c9042b4418cd8c7da184e496289bd66f4f9d3e)

- **`api`** update API changelog [skip ci] — [`7fdee22`](https://github.com/timelessco/recollect/commit/7fdee22970dc8705c1e3f5577f07de35e7a18b86)

- **`api`** update API changelog [skip ci] — [`4efe873`](https://github.com/timelessco/recollect/commit/4efe873baab30938198364e3b10119af5ac8ad62)

- **`api`** update API changelog [skip ci] — [`a014386`](https://github.com/timelessco/recollect/commit/a014386e31bbed07c524baaa422f94e7facc61cc)

- **`api`** update API changelog [skip ci] — [`88f00b2`](https://github.com/timelessco/recollect/commit/88f00b2e96357635a9d85f8e614e5bb215c937c5)

- **`api`** update API changelog [skip ci] — [`c153da2`](https://github.com/timelessco/recollect/commit/c153da242a76940d86717c97d0823aff0d80f70b)

- **`api`** update API changelog [skip ci] — [`475b980`](https://github.com/timelessco/recollect/commit/475b9803637194e77c54e4574d8fe8e49f5e2cac)

- **`api`** update API changelog [skip ci] — [`abeac76`](https://github.com/timelessco/recollect/commit/abeac764f63c90e6addadc51abdadb90abb6f2a2)

- **`api`** update API changelog [skip ci] — [`f50ddc6`](https://github.com/timelessco/recollect/commit/f50ddc60610bbedd61f14acf3a6e1a683165fab6)

- **`api`** update API changelog [skip ci] — [`3ba84e8`](https://github.com/timelessco/recollect/commit/3ba84e87f40714472f2feeeec8a1638b21cf17e9)

- **`api`** update API changelog [skip ci] — [`b2add5a`](https://github.com/timelessco/recollect/commit/b2add5affb8ec649eebe5255842debdc82f061c6)

- **`api`** update API changelog [skip ci] — [`c3a0dc3`](https://github.com/timelessco/recollect/commit/c3a0dc30607d05c387bdda329ea45fe6f6ad679a)

- **`api`** update API changelog [skip ci] — [`5741a4a`](https://github.com/timelessco/recollect/commit/5741a4a6c493cf286a9adf3e7d96cb648ad65eac)

- **`api`** update API changelog [skip ci] — [`ecf73d8`](https://github.com/timelessco/recollect/commit/ecf73d86d0cdec1c877e13a41746c64c03340ea0)

- **`api`** update API changelog [skip ci] — [`e4745d1`](https://github.com/timelessco/recollect/commit/e4745d1489a753d158a1f2afcb824f048624f653)

- **`api`** update API changelog [skip ci] — [`9323acf`](https://github.com/timelessco/recollect/commit/9323acf4312203114b7c664a3c871879ebf0a755)

- **`api`** update API changelog [skip ci] — [`6807d7b`](https://github.com/timelessco/recollect/commit/6807d7b72a597c8a4bf12ea399dce3326aee7592)

- **`api`** update API changelog [skip ci] — [`f73d5cf`](https://github.com/timelessco/recollect/commit/f73d5cf5d86b0dba9c8d454ffe35f54d4ef2ceb4)

- **`api`** update API changelog [skip ci] — [`5a1bb31`](https://github.com/timelessco/recollect/commit/5a1bb31d48b85a8529c84802cba570a60b1b2fca)

- **`api`** update API changelog [skip ci] — [`429a999`](https://github.com/timelessco/recollect/commit/429a999ec39a28d5e7d3504bc18c6f2f197df48d)

- **`claude`** 📝 update session learnings — [`365bb70`](https://github.com/timelessco/recollect/commit/365bb70ac939d9cbc6943e5812b9c821fff17c78)

- **`rules`** 📝 add require-await and oxlint CI coverage gotchas — [`25dd96f`](https://github.com/timelessco/recollect/commit/25dd96fc12bbe50c9701a29213175b8980c39b22)

- **`rules`** 📝 remove redundant gotchas and rule duplicates — [`19065c8`](https://github.com/timelessco/recollect/commit/19065c88f55b551600290c3d42b2040f2bea6a8d)

- **`rules`** 📝 restructure CLAUDE.md per claude-structure skill — [`867dd48`](https://github.com/timelessco/recollect/commit/867dd486c7eae298623b97d2b2e0a846162fba97)

- **`rules`** 📝 update oxlint rule-testing gotcha + add perfectionist oscillation warning — [`cb460f2`](https://github.com/timelessco/recollect/commit/cb460f2685fb6b7897118f406d93848a3cd4d229)

- **`solutions`** 📝 capture MIME drift fix — [`4da2b05`](https://github.com/timelessco/recollect/commit/4da2b054a0ab463babb8c41b1bcb5f90ab30cba6)

- **`sql`** update function comment for bookmark search to clarify achromatic — [`0f36ac4`](https://github.com/timelessco/recollect/commit/0f36ac4a07a6262fdac0436b97db822904673d41)

- **`structure`** 📝 remove stale app-svgs directory entry — [`5c04255`](https://github.com/timelessco/recollect/commit/5c04255ae1ddf36a523c485d3150186cd76283a3)



#### 🔨 Maintenance Updates

- **`.agents`** add axiom-sre skill with observability tooling and reference docs — [`284ecb6`](https://github.com/timelessco/recollect/commit/284ecb6fc8403c5a3d6ae8ecca2c55fbf5c68386)

- ⬆️ upgrade dev deps and fix oxlint 1.57 lint errors — [`8a73332`](https://github.com/timelessco/recollect/commit/8a733321103941f4f61ea37ea81fc068fa0a4924)

- 🔥 remove Cypress and non-cascade test route — [`acfef40`](https://github.com/timelessco/recollect/commit/acfef4015f1f0543fe1cf2490f9fefa79f6685e9)

- add upserted to cspell dictionary — [`0749dcf`](https://github.com/timelessco/recollect/commit/0749dcf7b77df8a548813b88c4a77ee2e8118fed)

- **`api`** 🏷️ deprecate v1 check-gemini-api-key route — [`b608655`](https://github.com/timelessco/recollect/commit/b608655e4a38249495826d9f6e0b638e4fdeea56)

- **`api`** remove dead createRawPostHandler, add Sentry exemption comments — [`d733932`](https://github.com/timelessco/recollect/commit/d73393238cd4ed399c105e4a25a08bfe8443b680)

- **`api`** remove redundant Axiom logger args already provided by Vercel — [`6c24748`](https://github.com/timelessco/recollect/commit/6c2474811c364e79bcaff80ddc1b4c87926f2efd)

- **`config`** 🔧 add version pins and update tooling — [`11d382a`](https://github.com/timelessco/recollect/commit/11d382a9141d6487602b29652036f2594aa91c25)

- **`cron`** remove ClearTrash schema definitions — [`9d39df6`](https://github.com/timelessco/recollect/commit/9d39df65ef60f06cea4aaed2d4d7d583d3876b1d)

- **`cspell`** add "genai" to the spell check dictionary — [`aee94a4`](https://github.com/timelessco/recollect/commit/aee94a4a91706cb76ff2b49ec60c0a9f82279efe)

- **`dependencies`** add @types/culori package and update lockfile — [`f783226`](https://github.com/timelessco/recollect/commit/f7832260360c1ab7a8d6ef4f5812f5a9a98356fd)

- **`deps`** ⬆️ upgrade dependencies — [`5565b37`](https://github.com/timelessco/recollect/commit/5565b371cee5a2dd896759ae4165570f283c35d0)

- **`deps`** ⬆️ upgrade deps and fix new lint rules — [`6ebf587`](https://github.com/timelessco/recollect/commit/6ebf587e67a7cfcf120bd15a71a8d50b50ad22e3)

- **`deps`** ⬆️ upgrade ky to v2 and drop fetchWithSchema — [`2721e51`](https://github.com/timelessco/recollect/commit/2721e51995a373fda4f1379006a30a3b66e3105d)

- **`deps`** bump node engine requirement to ^22.18.0 — [`3440b56`](https://github.com/timelessco/recollect/commit/3440b56bdfa7eab777b194bfcc1164cf557d99df)

- **`deps`** upgrade dependencies, patch ultracite 7.4.0, and fix supabase rpc compat — [`2d4ec3c`](https://github.com/timelessco/recollect/commit/2d4ec3c8bb86ba09db1807e7acf6f6d4c9e2b980)

- **`favicon`** update favicon and add SVG app icon — [`8783dea`](https://github.com/timelessco/recollect/commit/8783dea0891bd3380e14be0b5a71f8ce99abbda6)

- **`formatter`** 🔄 migrate from Prettier to Oxfmt — [`7bb2231`](https://github.com/timelessco/recollect/commit/7bb2231d9d1ef41764836471b688393e7557d88b)

- **`formatter`** 🔧 fix script ordering and dictionary — [`57b47e6`](https://github.com/timelessco/recollect/commit/57b47e6db4cf3f85daca719832ef6716f1e74859)

- **`git`** 🙈 ignore scheduled_tasks.lock — [`f2b01f4`](https://github.com/timelessco/recollect/commit/f2b01f4ed1c283c31dd4b5f02e3caf98f57825a6)

- **`lint`** 🔧 migrate from ESLint to Ultracite — [`a35e27e`](https://github.com/timelessco/recollect/commit/a35e27ebf78d4a908d074d10a9b450050454407e)

- **`lint`** 🔧 rebuild cspell dictionary and organize oxlintrc — [`8f58b85`](https://github.com/timelessco/recollect/commit/8f58b8507a283728d4a9666bb1d6e26de2946172)

- **`migrations`** remove obsolete Chrome bookmark imports and orphaned bookmarks view migrations — [`8df8040`](https://github.com/timelessco/recollect/commit/8df8040293aa6da3ba3453ad3a22f22609237662)

- **`pwa`** regenerate icons and favicon from updated icon.svg — [`b8d60b4`](https://github.com/timelessco/recollect/commit/b8d60b4a54697f0abc872aaa8063e515cdf15c90)

- remove deprecated Chrome bookmarks import API and related schemas — [`dd791c2`](https://github.com/timelessco/recollect/commit/dd791c27eb71281dd447bbb21bd761a4c8fc459c)

- remove legacy migration for wrapping orphaned flat bookmarks_view into keyed format — [`fff6a20`](https://github.com/timelessco/recollect/commit/fff6a2092d91167a97b7d047c77ebeff8058d82e)

- remove outdated color array refactor brainstorm document — [`465f2ec`](https://github.com/timelessco/recollect/commit/465f2ecf140134a9a680d1d636904f920d782ecd)

- rename useFetchPaginatedBookmarks to kebab-case — [`05a9ea6`](https://github.com/timelessco/recollect/commit/05a9ea6098976f223be22c53521e9d80ef493440)

- **`spelling`** 🔧 migrate cspell from dictionary file to inline words — [`3a2d555`](https://github.com/timelessco/recollect/commit/3a2d555b69c566dec435d3b6fb813259ed5370ae)

- **`tooling`** 🔧 improve turbo, lint-staged, and hook config — [`af85084`](https://github.com/timelessco/recollect/commit/af85084c5db59dc0e38a60050bb4bf7cd0bdb815)

- **`vercel`** remove cron job for clear-trash endpoint — [`f445089`](https://github.com/timelessco/recollect/commit/f44508935b6008caf9a15c37276a5fcd70a4dbcf)

- **`vercel`** remove cron job for clearing trash from Vercel configuration — [`c775ec0`](https://github.com/timelessco/recollect/commit/c775ec03714862e895eee6e29887bc99c8a63f75)



#### 💚 CI Changes

- **`actions`** ⬆️ upgrade GitHub Actions to Node 24 — [`4f3c55c`](https://github.com/timelessco/recollect/commit/4f3c55c5429f6d1b64d835aebe572b456d69c970)



#### 🎨 Code Style Changes

- **`api`** 💄 fix oxfmt formatting in search-bookmarks route — [`9068be3`](https://github.com/timelessco/recollect/commit/9068be3ca559d87898ef86c9186b3f4d40dc9b71)

- **`dashboard`** enhance button and input styles for better accessibility — [`00c107d`](https://github.com/timelessco/recollect/commit/00c107d5f1d2a75d6d9a82a2eb15c34c8f5625b4)




- Revert "Revert "feat(ai-enrichment): structured keywords + human AI summary"" — [`85afd2f`](https://github.com/timelessco/recollect/commit/85afd2f900a28a272355135f2fb82b16dbe54d4f)

- Revert "feat(ai-enrichment): structured keywords + human AI summary" — [`f7b9815`](https://github.com/timelessco/recollect/commit/f7b9815faa9da798fe3ec3ce2711815c1fac92f7)

- Update src/app/api/cron/process-archived/route.ts — [`c4a97a5`](https://github.com/timelessco/recollect/commit/c4a97a51e49af24534f5d86203b5d30091ec6fed)

- Update supabase/functions/process-chrome-bookmark-imports/index.ts — [`7ee9cd3`](https://github.com/timelessco/recollect/commit/7ee9cd3d20d2de269def9a10439e455204672011)

- Update supabase/migrations/20260324120000_chrome_bookmark_imports_queue.sql — [`1172b26`](https://github.com/timelessco/recollect/commit/1172b2631da0cabbbd175b31d55bc3253b2d164f)



</details>

## 0.4.0 (2026-03-20)

### 👀 Notable Changes


#### `lightbox` — add velocity-based swipe-to-close on mobile

> <sub>Desktop close-on-swipe was already velocity-based (wheel deltaY scales with speed), but mobile touch required dragging the full 200px threshold regardless of flick speed.
> 
> Add velocity tracking using an 80ms sample window during touch moves. On pointer up, if downward velocity exceeds 800px/s and the user has dragged at least 30px, close immediately.</sub>

<sub>Introduced in [`68510a93`](https://github.com/timelessco/recollect/commit/68510a93d399c5838a9f141067e3c943e875c0f5)</sub>


---


#### `release` — 🐛 use separate commit for API changelog clear

> <sub>- --amend rewrites the merge commit SHA, breaking   merge-base --is-ancestor check in release-pr.sh - Separate commit preserves the merge commit identity</sub>

<sub>Introduced in [`81b92e78`](https://github.com/timelessco/recollect/commit/81b92e78d771e21dd9c82afa42dc22495ac5c842)</sub>


---


#### `release` — 🚀 add timestamp to release PR titles

> <sub>- Include time (HHMM) in branch name for same-day uniqueness - Use conventional commit format with human-readable timestamp - Re-enable Semantic PR validation for release branches</sub>

<sub>Introduced in [`4900cc7b`](https://github.com/timelessco/recollect/commit/4900cc7bcb17789de7749f597ee9b2f8df4f8a34)</sub>


---


#### `deps` — update @base-ui/react to 1.3.0

> <sub>Fixes mobile drawer scroll by upgrading Base UI which adds cross-axis scroll detection for horizontal-swipe drawers. Also updates DrawerPreview import to Drawer (API graduated).</sub>

<sub>Introduced in [`6a05b57a`](https://github.com/timelessco/recollect/commit/6a05b57aafb9945318473a77bce18b94a8b4fbcb)</sub>


---


#### `ai` — contextual AI summaries based on content type

> <sub>Replace the one-size-fits-all image captioning prompt with content-type-aware prompts. A resolveContentType utility maps bookmark signals (type, mediaType, isPageScreenshot) to one of 8 content types: link, screenshot, image, video, audio, document, tweet, instagram.
> 
> Each type gets a tailored SENTENCE prompt that incorporates bookmark metadata (title, URL, description) for smarter summaries. Audio files skip AI enrichment entirely.
> 
> Also fixes a bug where title/description/url context was only passed to the AI when the user had collections.</sub>

<sub>Introduced in [`1ebababc`](https://github.com/timelessco/recollect/commit/1ebababcfe379fe08d5f0efbc376961a7e974bf0)</sub>




### 📌 Other Notable Changes


#### `release` — 📝 finalize Slack notification format

> <sub>- Use **double asterisks** for bold (headers, authors, PR title) - Remove :rocket: prefix from main message - Tag Karthik only in API changelog thread reply</sub>

<sub>Introduced in [`1fe9be25`](https://github.com/timelessco/recollect/commit/1fe9be25f80eea035529dd1a07d5f7c02a9c8635)</sub>


---


#### `release` — 📝 add Slack notification step to release skill

> <sub>- Add Step 2: notify Slack with single-line PR link, changelog in thread - Renumber subsequent steps 3-6 for sequential flow - Update release label references (Semantic PR now runs on releases)</sub>

<sub>Introduced in [`646e5f21`](https://github.com/timelessco/recollect/commit/646e5f21c19cdcca5fead899afff04698731835f)</sub>


---


#### `gotchas` — 📝 update release label behavior

> <sub>- Semantic PR validation now runs on release PRs</sub>

<sub>Introduced in [`273d600a`](https://github.com/timelessco/recollect/commit/273d600a5911502de7545d099cf04aeb183d74e3)</sub>


---


#### `gotchas` — 📝 add release pipeline learnings

> <sub>- Document --admin requirement for branch protection - Add backmerge SHA verification gotcha - Document API changelog lifecycle - Update pipeline description with current flow</sub>

<sub>Introduced in [`921bc8a8`](https://github.com/timelessco/recollect/commit/921bc8a89c3d8e8ccebd6101499899f7fd3ac393)</sub>


---


#### `release` — 📝 update skill with session learnings

> <sub>- Add --admin flag for branch protection bypass - Fix backmerge verification (check dev tip, not diff) - Document cleanup job timing and API changelog flow - Add prerequisite check commands</sub>

<sub>Introduced in [`4175675d`](https://github.com/timelessco/recollect/commit/4175675df86bffd65e3b9b3e8afc9fc698c51478)</sub>




<details>
<summary>🗃️ Commits</summary>



#### ⭐ New Features

- **`ai`** contextual AI summaries based on content type — [`1ebabab`](https://github.com/timelessco/recollect/commit/1ebababcfe379fe08d5f0efbc376961a7e974bf0) · @rogerantony-dev

- **`api`** add isOgImagePreferred option for enhanced image processing — [`e32d344`](https://github.com/timelessco/recollect/commit/e32d344e47e15ec95612a61793e2b2ba4ea921f0) · @rogerantony-dev

- **`imageToText`** enhance image processing with isOgImage option — [`befc6d6`](https://github.com/timelessco/recollect/commit/befc6d6f5d98dbfcd6dd34fdf67bfd1cc79f5915) · @rogerantony-dev

- **`release`** 🚀 add timestamp to release PR titles — [`4900cc7`](https://github.com/timelessco/recollect/commit/4900cc7bcb17789de7749f597ee9b2f8df4f8a34) · @navin-moorthy



#### 🐞 Bug Fixes

- **`api`** update content type resolution and enhance error handling in bookmark data retrieval — [`27d7087`](https://github.com/timelessco/recollect/commit/27d7087fb90ce5af3fc75fe1eecf61932834f3b6) · @rogerantony-dev

- **`deps`** update @base-ui/react to 1.3.0 — [`6a05b57`](https://github.com/timelessco/recollect/commit/6a05b57aafb9945318473a77bce18b94a8b4fbcb) · @rogerantony-dev

- **`lightbox`** add velocity-based swipe-to-close on mobile — [`68510a9`](https://github.com/timelessco/recollect/commit/68510a93d399c5838a9f141067e3c943e875c0f5) · @rogerantony-dev

- **`release`** 🐛 use separate commit for API changelog clear — [`81b92e7`](https://github.com/timelessco/recollect/commit/81b92e78d771e21dd9c82afa42dc22495ac5c842) · @navin-moorthy



#### ♻️  Code Refactoring

- **`api`** replace hardcoded model string with GEMINI_MODEL constant — [`1f1520c`](https://github.com/timelessco/recollect/commit/1f1520c50960ee853f297059004f0486ee6174ca) · @rogerantony-dev

- **`api`** streamline content type resolution and improve error tracking — [`3356d4a`](https://github.com/timelessco/recollect/commit/3356d4ac24e5cb96b7c825b82380c4ed568e8c6d) · @rogerantony-dev

- **`imageToText`** update summarization instructions for webpages, videos — [`a2a60e0`](https://github.com/timelessco/recollect/commit/a2a60e0aae22f8fae7626ae9ddc63eea014a04f6) · @rogerantony-dev



#### 📔 Documentation Changes

- **`gotchas`** 📝 add release pipeline learnings — [`921bc8a`](https://github.com/timelessco/recollect/commit/921bc8a89c3d8e8ccebd6101499899f7fd3ac393) · @navin-moorthy

- **`gotchas`** 📝 update release label behavior — [`273d600`](https://github.com/timelessco/recollect/commit/273d600a5911502de7545d099cf04aeb183d74e3) · @navin-moorthy

- **`gotchas`** clarify backmerge verification behavior and root cause — [`047cb93`](https://github.com/timelessco/recollect/commit/047cb93f1bee799c2b693afeeac4073ebf189bab) · @navin-moorthy

- **`release`** 📝 add Slack notification step to release skill — [`646e5f2`](https://github.com/timelessco/recollect/commit/646e5f21c19cdcca5fead899afff04698731835f) · @navin-moorthy

- **`release`** 📝 finalize Slack notification format — [`1fe9be2`](https://github.com/timelessco/recollect/commit/1fe9be25f80eea035529dd1a07d5f7c02a9c8635) · @navin-moorthy

- **`release`** 📝 update skill with session learnings — [`4175675`](https://github.com/timelessco/recollect/commit/4175675df86bffd65e3b9b3e8afc9fc698c51478) · @navin-moorthy



#### 💚 CI Changes

- **`release`** 🔔 add Slack notification on GitHub Release — [`cb0ae39`](https://github.com/timelessco/recollect/commit/cb0ae39b4183bd5b7097feb5a2439787a5314413) · @navin-moorthy, closes [#recollect-dev](https://github.com/timelessco/recollect/issues/recollect-dev)




- 🚀 Release v0.3.0 — [`125c1e7`](https://github.com/timelessco/recollect/commit/125c1e7d5f24e7a0a2214dd20684272a26d93133) · @navin-moorthy



</details>

## 0.3.0 (2026-03-19)

### 👀 Notable Changes


#### `release` — 📋 post API changelog as PR comment

> <sub>- Post docs/API_CHANGELOG.md as a PR comment during release - Clear the file during backmerge (CI cleanup + local fallback) - Skip comment when file is empty or missing</sub>

<sub>Introduced in [`68bbd3b7`](https://github.com/timelessco/recollect/commit/68bbd3b78d3329db782e794993ac662946ee1ca0)</sub>




<details>
<summary>🗃️ Commits</summary>



#### ⭐ New Features

- **`release`** 📋 post API changelog as PR comment — [`68bbd3b`](https://github.com/timelessco/recollect/commit/68bbd3b78d3329db782e794993ac662946ee1ca0) · @navin-moorthy



</details>

## 0.2.0 (2026-03-19)

### 👀 Notable Changes


#### `release` — 🤖 add --yes flag and /release skill

> <sub>- Add --yes/-y flag to release-pr.sh for non-interactive execution - Add release:pr:yes script to package.json - Create /release skill for full pipeline automation</sub>

<sub>Introduced in [`4f5a43eb`](https://github.com/timelessco/recollect/commit/4f5a43eb16a671e598618bdfd36f08cd45f1d927)</sub>


---


#### `release` — 🐛 use PAT to bypass branch protection

> <sub>- GITHUB_TOKEN can't push to protected main branch - Use ACCESS_TOKEN (admin PAT) for checkout and release - Bypasses PR requirement and Vercel status check</sub>

<sub>Introduced in [`ba6a9993`](https://github.com/timelessco/recollect/commit/ba6a99932fa75ee5ecf1009e8359c70ab6787850)</sub>




<details>
<summary>🗃️ Commits</summary>



#### ⭐ New Features

- **`release`** 🤖 add --yes flag and /release skill — [`4f5a43e`](https://github.com/timelessco/recollect/commit/4f5a43eb16a671e598618bdfd36f08cd45f1d927) · @navin-moorthy



#### 🐞 Bug Fixes

- **`release`** 🐛 use PAT to bypass branch protection — [`ba6a999`](https://github.com/timelessco/recollect/commit/ba6a99932fa75ee5ecf1009e8359c70ab6787850) · @navin-moorthy



#### 📔 Documentation Changes

- **`gotchas`** fix release pipeline step order and document --yes flag — [`4f31530`](https://github.com/timelessco/recollect/commit/4f31530ccc2b3159f25212d4b973216b1435d99b) · @navin-moorthy



#### 💚 CI Changes

- **`release`** 🔒 restore release guard after successful test — [`6b44af0`](https://github.com/timelessco/recollect/commit/6b44af005b5cb785642411329aa204cdc8761d52) · @navin-moorthy

- **`release`** 🔒 restore release guard after successful test — [`86d6f8d`](https://github.com/timelessco/recollect/commit/86d6f8da73b63e8698e35c6ade4bf973051f716b) · @navin-moorthy



#### 🎨 Code Style Changes

- **`release`** 💄 use smaller body text in changelog — [`b657bc0`](https://github.com/timelessco/recollect/commit/b657bc0cee9efebaee97e19e4eecf54495e86f66) · @navin-moorthy



</details>

## <small>0.1.3 (2026-03-19)</small>

### 👀 Notable Changes


#### `release` — 🐛 use PAT to bypass branch protection

> - GITHUB_TOKEN can't push to protected main branch - Use ACCESS_TOKEN (admin PAT) for checkout and release - Bypasses PR requirement and Vercel status check
<sub>Introduced in [`ba831658`](https://github.com/timelessco/recollect/commit/ba83165884da74ac61fd65fe61852a45c56b08d2)</sub>


---


#### `release` — 🐛 unwrap hard-wrapped commit body in changelog

> Git convention wraps commit bodies at 72 characters. These hard line breaks flowed directly into the changelog, causing body text to render with visible breaks instead of flowing prose.
> 
> Join single newlines into spaces while preserving intentional paragraph breaks (double newlines) so changelog body text reads as continuous paragraphs in both raw markdown and rendered HTML.
<sub>Introduced in [`d26624f9`](https://github.com/timelessco/recollect/commit/d26624f94a5f58351a226efae01b479c28bca62b)</sub>




### 📌 Other Notable Changes


#### `claude` — 📝 add release pipeline gotchas

> - GITHUB_TOKEN requirement for changelog writer - release-pr.sh handles existing release PRs gracefully
<sub>Introduced in [`21b32bfc`](https://github.com/timelessco/recollect/commit/21b32bfcf69f6d2ea1b3edd5c51a01f131f504ff)</sub>


---


#### `claude` — 📝 add release pipeline learnings to rules

> - Add release:pr, release:pr:dryrun, release:cleanup to commands - Add gotchas: v10 whatBump bug, prettier file targeting,   bash 3.2 compat, release label, pipeline flow
<sub>Introduced in [`2ed37433`](https://github.com/timelessco/recollect/commit/2ed3743337ebef002755d2f8e31b7979a4da062a)</sub>




<details>
<summary>🗃️ Commits</summary>



#### 🐞 Bug Fixes

- **`release`** 🐛 unwrap hard-wrapped commit body in changelog — [`d26624f`](https://github.com/timelessco/recollect/commit/d26624f94a5f58351a226efae01b479c28bca62b) · @navin-moorthy

- **`release`** 🐛 use PAT to bypass branch protection — [`ba83165`](https://github.com/timelessco/recollect/commit/ba83165884da74ac61fd65fe61852a45c56b08d2) · @navin-moorthy



#### 📔 Documentation Changes

- **`claude`** 📝 add release pipeline gotchas — [`21b32bf`](https://github.com/timelessco/recollect/commit/21b32bfcf69f6d2ea1b3edd5c51a01f131f504ff) · @navin-moorthy

- **`claude`** 📝 add release pipeline learnings to rules — [`2ed3743`](https://github.com/timelessco/recollect/commit/2ed3743337ebef002755d2f8e31b7979a4da062a) · @navin-moorthy



#### 💚 CI Changes

- **`release`** 🤖 automate release and cleanup in CI — [`39df5e0`](https://github.com/timelessco/recollect/commit/39df5e036326122094114c7fcef716c217523832) · @navin-moorthy

- **`release`** 🧪 temporarily remove release guard for testing — [`1d6cfe9`](https://github.com/timelessco/recollect/commit/1d6cfe914a787e229823742bc82fc728b45f4b63) · @navin-moorthy



</details>

## <small>0.1.2 (2026-03-19)</small>

### 👀 Notable Changes

#### `release` — 🐛 fix commit template formatting

> Align with next-ts-app-template: list marker on same line as
> scope, spaces instead of tabs for indentation. Fixes entries
> rendering with dash on its own line.

<sub>Introduced in [`7d90e246`](https://github.com/timelessco/recollect/commit/7d90e24615bdf67aeabf4f38976425e1b00c66e5)</sub>

---

#### `release` — 🐛 handle existing release branch gracefully

> Instead of erroring when a release/\* branch exists, detect
> the open PR and offer to delete and recreate it.
> <sub>Introduced in [`d2235a0d`](https://github.com/timelessco/recollect/commit/d2235a0df759b81529e2c18498f0ffdef83229ce)</sub>

---

#### `release` — 🐛 fix changelog formatting and after:bump hook

> - Format CHANGELOG.md with prettier (fixes CI lint failure)
> - Use pnpm exec prettier in after:bump hook (pnpm script
>   ignores the file argument)
>   <sub>Introduced in [`54237ae3`](https://github.com/timelessco/recollect/commit/54237ae36c0c18ef37c19181a08fe3b21914e07a)</sub>

<details>
<summary>🗃️ Commits</summary>

#### 🐞 Bug Fixes

- **`release`** 🐛 fix changelog formatting and after:bump hook — [`54237ae`](https://github.com/timelessco/recollect/commit/54237ae36c0c18ef37c19181a08fe3b21914e07a) · @navin-moorthy

- **`release`** 🐛 fix commit template formatting — [`7d90e24`](https://github.com/timelessco/recollect/commit/7d90e24615bdf67aeabf4f38976425e1b00c66e5) · @navin-moorthy

- **`release`** 🐛 handle existing release branch gracefully — [`d2235a0`](https://github.com/timelessco/recollect/commit/d2235a0df759b81529e2c18498f0ffdef83229ce) · @navin-moorthy

- **`release`** correct knip ignoreBinaries and commit template formatting — [`c036f34`](https://github.com/timelessco/recollect/commit/c036f34aa2a3f3ad2a978fa394f873bdbccf24de) · @navin-moorthy

#### 🔨 Maintenance Updates

- **`knip`** fix ignoreBinaries to reference prettier instead of CHANGELOG.md — [`fa6282c`](https://github.com/timelessco/recollect/commit/fa6282c158c95d6d501b75427a5e48937c41ed4a) · @navin-moorthy

#### 🎨 Code Style Changes

- **`release`** 💄 beautify changelog template output — [`216e202`](https://github.com/timelessco/recollect/commit/216e202f372cdf7ac48577abb0ff4679bae7306b)

</details>

## <small>0.1.1 (2026-03-19)</small>

### 🗃️ Commits

#### 🐞 Bug Fixes

- **`coderabbit:`** 🐛 use correct auto_review.labels path - [8586cf3](https://github.com/timelessco/recollect/commit/8586cf37dd1454c77feaeb459c45abf31b68b244) by @navin-moorthy

#### 🔨 Maintenance Updates

- **`deps:`** 🔧 pin @release-it/conventional-changelog below v10 - [4cefbce](https://github.com/timelessco/recollect/commit/4cefbcee59bc6b129e6afcc70e5f6c75b0115bca) by @navin-moorthy
- **`knip:`** 🔧 fix knip configuration hints - [1d8da17](https://github.com/timelessco/recollect/commit/1d8da17c24d94cfc2f5a93e0af8b6f3af32d914c) by @navin-moorthy
- **`release:`** 🔧 improve release pipeline CI integration - [6138e2f](https://github.com/timelessco/recollect/commit/6138e2f70772613b67ad7687b9d9dcd514b990b6) by @navin-moorthy

#### 🎨 Code Style Changes

- **`changelog:`** 💄 format CHANGELOG.md with prettier - [4e4c87f](https://github.com/timelessco/recollect/commit/4e4c87f61435b8eace179cf0a4e6b181e7251540) by @navin-moorthy

## 0.1.0 (2026-03-19)

### 👀 Notable Changes

#### `deps`- ⏪ downgrade @release-it/conventional-changelog to 9.0.4

v10.x has a bug where bumper.loadPreset() is not awaited,
causing "whatBump is not a function". v9.0.4 uses a different
loading mechanism that works correctly.

Introduced in: [`25b4fe71`](https://github.com/timelessco/recollect/commit/25b4fe7113c7473227774c89bb72edbc74e506de)

#### `release`- 🐛 use string preset format for conventional-changelog

Object format { name: "conventionalcommits" } causes "whatBump
is not a function" error with @release-it/conventional-changelog v10.

Introduced in: [`d5878d08`](https://github.com/timelessco/recollect/commit/d5878d080ef5b6360f50a89af04087805bce38f8)

#### `deps`- 🐛 update @release-it/conventional-changelog to 10.0.6

Fixes "whatBump is not a function" error caused by
conventional-changelog < 7.2.0 dependency.

Introduced in: [`92d8f38f`](https://github.com/timelessco/recollect/commit/92d8f38f9d4af3b386a106d77419dedb9baa44d9)

#### `release`- ✨ add release pipeline with frozen release branches (#859)

- feat(release): ✨ add release pipeline scripts

* Add release-pr.sh to cut frozen release/\* branches from dev,
  generate grouped changelogs, and create PRs to main
* Add release-cleanup.sh to backmerge main into dev and delete
  release branches after successful deployment
* Add release:pr, release:pr:dryrun, release:cleanup to package.json
* Enforce clean working directory in release-it config

- docs(release): 📝 add release pipeline spec and plan

* Add design spec covering branch model, operator runbook,
  failure recovery, and acceptance criteria
* Add implementation plan with E2E verification checklist

- fix(release): 🐛 fix lint issues and harden scripts

* Fix markdown table alignment and heading levels in docs
* Replace "agentic" with "AI agents" for spellcheck
* Add fenced code block language specifier
* Prettier auto-formatted shell scripts

Introduced in: [`123de737`](https://github.com/timelessco/recollect/commit/123de737e8d0dc64c102a5c5e8c3d5d4c174ce73)

### 🗃️ Commits

#### ⭐ New Features

- **`release:`** ✨ add release pipeline with frozen release branches ([#859](https://github.com/timelessco/recollect/issues/859)) - [123de73](https://github.com/timelessco/recollect/commit/123de737e8d0dc64c102a5c5e8c3d5d4c174ce73) by @navin-moorthy

#### 🐞 Bug Fixes

- **`deps:`** ⏪ downgrade @release-it/conventional-changelog to 9.0.4 - [25b4fe7](https://github.com/timelessco/recollect/commit/25b4fe7113c7473227774c89bb72edbc74e506de) by @navin-moorthy
- **`deps:`** 🐛 update @release-it/conventional-changelog to 10.0.6 - [92d8f38](https://github.com/timelessco/recollect/commit/92d8f38f9d4af3b386a106d77419dedb9baa44d9) by @navin-moorthy
- **`release:`** 🐛 use string preset format for conventional-changelog - [d5878d0](https://github.com/timelessco/recollect/commit/d5878d080ef5b6360f50a89af04087805bce38f8) by @navin-moorthy

#### ⏪️ Reverted Changes

- **`release:`** ⏪ restore object preset format - [ab86a0a](https://github.com/timelessco/recollect/commit/ab86a0aa9be376bca2ad5c61b48895226f5f70f5) by @navin-moorthy

#### 🔨 Maintenance Updates

- **`spelling:`** 🔧 rebuild cspell project dictionary - [1f58a2f](https://github.com/timelessco/recollect/commit/1f58a2fee4b3004bbb9ce2fcf65c375ab749cc6d) by @navin-moorthy
