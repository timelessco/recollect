# Bookmark URL Lifecycle — Formal Reference

> **This is the dense technical reference.** If you just want to understand how bookmark cards decide what image/placeholder to show, start with `lifecycle.md` — it's the readable version with scenarios and flow diagrams.
>
> This file is for the rare case where you need every file:line citation, the exact state tuple, the full render-path matrix, or the field-by-field server write table.

**Last verified against source:** 2026-04-14 (branch `dev`).

Companion docs in this folder:

- `lifecycle.md` — human-readable entry point (start here)
- `url-validation.md` — URL regex / normalization / helpers (separate concern)
- `README.md` — folder overview

---

## How to Read This Document

Progressive disclosure. Scan section headers first via `grep '^## '`, then drill into the section you need.

Section load order for common questions:

| Question                                                  | Section                                      |
| --------------------------------------------------------- | -------------------------------------------- |
| "Why is that bookmark still saying _Getting screenshot_?" | §11 Gap Catalog                              |
| "What all signals control the placeholder copy?"          | §3 Signal Inventory                          |
| "How does adding a URL via X differ from Y?"              | §5 Ingress Catalog + §7 State-Machine Traces |
| "What does the server write, and when?"                   | §6 Server Pipeline + Field Table             |
| "How do I pick between fix options?"                      | §13 Fix Options A/B/C                        |
| "Where was X defined again?"                              | §14 File Back-Index                          |

---

## 1. TL;DR

The bookmark card placeholder copy today is decided by the 6-tuple state vector below. Three physically distinct states collapse onto the same signature — which is why a naive terminal rule would either flash _"Cannot fetch"_ during legitimate processing (the original Slack bug) or leave abandoned bookmarks stuck on _"Getting screenshot"_ forever.

There is no server-side terminal failure signal today. `enrichment_status` is a dead column (migrated, never written). `last_error` lives in pgmq message bodies, never on the bookmark row. The only terminal client signal is Next.js `<Image onError>`, which fires **only when an `ogImage` URL exists and fails to load** — it cannot detect _"server never produced an ogImage"_.

Iterations 1 and 2 already shipped: every intermediate render now says _"Getting screenshot"_, and _"Cannot fetch image for this bookmark"_ only appears when `<Image onError>` fires. Four residual gaps (§11) remain; iteration 3 should pick one of the fix options in §13.

---

## 2. State Vector

Every bookmark card's placeholder is a pure function of:

```text
S = ( ID_SIGN        : NEG (optimistic tempId) | POS (real server id)
    , OG_IMAGE       : NULL | URL
    , LOADING        : loadingBookmarkIds.has(id)   → TRUE | FALSE
    , RECENT         : recentlyAddedUrls.has(url)   → TRUE | FALSE
                       (consumed destructively on first render)
    , SHOULD_ANIMATE : null (uninitialized) | true | false
                       (sticky, set once per component instance)
    , IMG_ERROR      : Next <Image onError> has fired for current img
                       → TRUE | FALSE
    )
```

`LOADING` and `RECENT` are two Zustand/in-memory signals that exist purely for this lifecycle. `ID_SIGN` and `OG_IMAGE` live in the react-query `PaginatedBookmarks` cache. `SHOULD_ANIMATE` is a ref internal to `BookmarkImageWithAnimation`. `IMG_ERROR` is local `useState` in `ImgLogicComponent`.

---

## 3. Signal Inventory (Exhaustive Ownership)

Proven exhaustively by repo-wide grep. Any writer not listed here does not exist.

### 3.1 `loadingBookmarkIds` — Zustand Set

Defined: `src/store/componentStore.ts:32`, actions `addLoadingBookmarkId` (22–26), `removeLoadingBookmarkId` (33–38).

| File:line                                              | Op                       | Phase                               | Purpose                                       |
| ------------------------------------------------------ | ------------------------ | ----------------------------------- | --------------------------------------------- |
| `use-add-bookmark-min-data-optimistic-mutation.ts:208` | `add(data.id)`           | `onSettled` IIFE, PDF branch        | Before `handlePdfThumbnailAndUpload`          |
| `use-add-bookmark-min-data-optimistic-mutation.ts:237` | `add(data.id)`           | `onSettled` IIFE, screenshot branch | Before `addBookmarkScreenshotMutation.mutate` |
| `use-add-bookmark-min-data-optimistic-mutation.ts:231` | `delete(data.id)`        | `onSettled` IIFE, PDF `finally`     | After thumbnail success or failure            |
| `use-add-bookmark-screenshot-mutation.ts:33`           | `delete(variables.id)`   | `onError`                           | Screenshot API threw                          |
| `use-add-bookmark-screenshot-mutation.ts:38`           | `delete(response[0].id)` | `onSettled`                         | Screenshot API settled                        |
| `imageCard.tsx:65`                                     | `.has(id)` read          | render body of `ImgLogicComponent`  | Feeds `isLoading` prop                        |

**Explicit non-writers (confirmed by grep):** `use-file-upload-optimistic-mutation.ts`, `use-import-bookmarks-mutation.ts`, `src/app/api/raindrop/*`, `src/app/api/twitter/*`, `src/app/api/instagram/*`, `src/app/api/v2/chrome-bookmarks/*`, `src/app/api/v2/bookmarks/insert/*`, all queue consumers in `src/app/api/v2/screenshot/*` and `src/app/api/v2/ai-enrichment/*`. Queue-based imports never enter `loadingBookmarkIds`. File uploads never enter `loadingBookmarkIds`.

### 3.2 `recentlyAddedUrls` — Module-level `Set<string>`

Defined: `src/pageComponents/dashboard/cardSection/animatedBookmarkImage.tsx:28`.

| File:line                                              | Op                                | Phase                                           | Purpose                                                         |
| ------------------------------------------------------ | --------------------------------- | ----------------------------------------------- | --------------------------------------------------------------- |
| `use-add-bookmark-min-data-optimistic-mutation.ts:150` | `add(data.url)`                   | `onMutate`                                      | Register for entry animation                                    |
| `use-add-bookmark-min-data-optimistic-mutation.ts:248` | `add(serverBookmark.url)`         | `onSuccess`                                     | Re-register so the POS-id remount still animates                |
| `use-add-bookmark-min-data-optimistic-mutation.ts:161` | `delete(variables.url)`           | `onError`                                       | Cleanup on failure                                              |
| `use-file-upload-optimistic-mutation.ts:173`           | `add(preGeneratedUrl)`            | `onMutate`                                      | Register (uses R2 URL, not input URL)                           |
| `use-file-upload-optimistic-mutation.ts:244`           | `add(context.preGeneratedUrl)`    | `onSuccess`                                     | Re-register across invalidation refetch remount                 |
| `use-file-upload-optimistic-mutation.ts:222`           | `delete(context.preGeneratedUrl)` | `onError`                                       | Cleanup                                                         |
| `imageCard.tsx:135`                                    | `.delete(url)` destructive read   | **render body** of `BookmarkImageWithAnimation` | One-shot via `??=` — returns `true` once, `false` forever after |

**`.delete()` in render body is intentional** but violates React purity. The `??=` makes it fire at most once per component instance, which is the mitigation. React Strict Mode double-render is not a problem for a non-idempotent `delete` _from a callsite that runs once_ because the second render sees `current ≠ null`. But it _is_ fragile if React ever tears down+re-creates the instance between `.add` and the first render.

### 3.3 `BOOKMARKS_KEY` react-query cache

Full invalidation/setQueryData/cancelQueries table in §12. High-level: only the mutation hooks in `src/async/mutationHooks/` and the dashboard `useEffect` at `src/pageComponents/dashboard/index.tsx:98` touch it. Queue imports do NOT push invalidations.

---

## 4. Five Lifecycle Classes

The thirteen ingresses catalogued in §5 collapse into five classes by the _shape_ of their state machine:

| Class                   | Ingresses                                                           | Optimistic row?                | `recentlyAddedUrls`      | `loadingBookmarkIds`              | Server returns ogImage?                                   |
| ----------------------- | ------------------------------------------------------------------- | ------------------------------ | ------------------------ | --------------------------------- | --------------------------------------------------------- |
| **A. URL + screenshot** | Manual add, Paste URL, PDF URL branch                               | Yes, `id = -Date.now()`        | add onMutate + onSuccess | add in `onSettled` IIFE (delayed) | Often null → filled async                                 |
| **B. URL sync-image**   | Image URL, Audio URL                                                | Yes, `id = -Date.now()`        | add onMutate + onSuccess | **NEVER** (IIFE short-circuits)   | Yes, at insert                                            |
| **C. File upload**      | Drop, Paste file, File picker                                       | Yes, `id = -(Date.now()+rand)` | add onMutate + onSuccess | **NEVER**                         | Video/audio/PDF: yes. Image: filePublicUrl                |
| **D. Queue import**     | Raindrop CSV, Twitter sync, Instagram sync, Chrome bookmarks import | **No**                         | **NEVER**                | **NEVER**                         | Sometimes (Twitter/IG/Raindrop carry it; Chrome does not) |
| **E. Extension direct** | v2 `/bookmarks/insert`                                              | **No**                         | **NEVER**                | **NEVER**                         | Only if extension sends it                                |

Class D and E are the ones that produce the original Slack-reported flashing bug if a naive terminal rule is applied — they have no client-side lifecycle at all.

---

## 5. Ingress Catalog

### Ingress 1 — Manual URL Input (Add Bookmark Dropdown)

- **Trigger:** form submit in `addBookmarkDropdown.tsx:77-79`. Also Cmd/Ctrl+K to open popover.
- **Mutation:** `useAddBookmarkMinDataOptimisticMutation` → `POST V2_ADD_BOOKMARK_MIN_DATA_API`
- **Intermediary:** `useAddBookmark` hook at `src/hooks/useAddBookmark.ts:27`
- **Optimistic row fields:** `{ id: tempId, url, addedCategories, inserted_at: new Date(), addedTags: [], trash: null }` — no `ogImage`, no `title`, no `type`.
- **Temp id:** `-Date.now()` (line 114).
- **Lifecycle class:** A. See §7.1 for full trace.

### Ingress 2 — Clipboard Paste (URL)

- **Trigger:** global `paste` listener on `BookmarkCards` (`bookmarkCards.tsx:64-96`). Clipboard text matching `URL_PATTERN` routes to `clipboardUpload` → `addBookmarkMinDataOptimisticMutation.mutateAsync()`.
- Everything else is identical to Ingress 1.

### Ingress 3 — File Drop (react-dropzone)

- **Trigger:** `<Dropzone noClick onDrop={onDrop}>` wrapping card section (`bookmarkCards.tsx:105`). `useFileUploadDrop.onDrop` → `fileUpload()` → `useFileUploadOptimisticMutation`.
- **Mutation:** `POST V2_UPLOAD_FILE_API` (`/api/v2/file/upload-file`). Binary pre-uploaded to R2 via presigned URL **inside `onMutate`** before the DB-row mutation fires.
- **Optimistic row fields:** `{ id: tempId, title, url: preGeneratedUrl, type, inserted_at }` — no `ogImage`, no `addedCategories`.
- **Temp id:** `-(Date.now() + Math.random())` (line 134). `Math.random()` prevents collisions on rapid drops.
- **No `onSuccess` cache swap.** Response returns only `{ id }`; temp row stays until `onSettled` invalidates → refetch replaces it.
- **Lifecycle class:** C. See §7.3.

### Ingress 4 — File Picker (paperclip in Add Bookmark dropdown)

- **Trigger:** hidden `<input type="file">` in `addBookmarkDropdown.tsx:101-108`. Same `onDrop` → same `fileUpload()` → identical to Ingress 3.

### Ingress 5 — Clipboard Paste (File)

- **Trigger:** same global `paste` listener; when `clipboardData.files` is non-empty (e.g. pasting a screenshot), `clipboardUpload` calls `fileUpload(files, ...)` — identical to Ingress 3.

### Ingress 6 — Raindrop CSV Import

- **Trigger:** Settings → Import, drop/select CSV, click "Import Bookmarks" (`src/pageComponents/settings/import.tsx:104-138`).
- **Mutation:** `useImportBookmarksMutation` → `POST /api/raindrop/import`. Uses `useReactQueryMutation` wrapper (not raw `useMutation`).
- **No optimistic row. No `onMutate`.** Cache touched only via `onSettled` invalidation.
- **Server:** `enqueue_raindrop_bookmarks` RPC — queues bookmarks; does not synchronously insert. `ogImage` passed from CSV `cover` column.
- **Lifecycle class:** D.

### Ingress 7 — Twitter/X Sync (Chrome Extension → API)

- **Trigger:** external (Chrome extension). No in-app mutation hook exists.
- **Server:** `POST /api/twitter/sync` → `enqueue_twitter_bookmarks` RPC. Max 500 bookmarks/request. `ogImage` typically `pbs.twimg.com` URL from payload.
- **Zero client-side cache invalidation triggered.** User sees new rows only on next page load.
- **Lifecycle class:** D.

### Ingress 8 — Instagram Sync (Chrome Extension → API)

- **Trigger:** external. No in-app mutation hook.
- **Server:** `POST /api/instagram/sync` → `enqueue_instagram_bookmarks` RPC. Zod enforces `instagram.com` / `www.instagram.com` hostname. `ogImage` from CDN URL in payload.
- **Lifecycle class:** D.

### Ingress 9 — Chrome Bookmarks Bulk Import (Chrome Extension → v2)

- **Trigger:** external. No in-app mutation hook.
- **Server:** `POST /api/v2/chrome-bookmarks/import` → `enqueue_chrome_bookmarks` RPC. Payload has **no `ogImage`** — Chrome export format doesn't include images, worker must fetch them.
- **Lifecycle class:** D. Worst case within class: rows arrive with `ogImage = NULL` and no client signal until worker lands.

### Ingress 10 — Extension Direct Push (v2 `/bookmarks/insert`)

- **Trigger:** external. Chrome extension "Save" button.
- **Server:** `POST /api/v2/bookmarks/insert`. **Synchronous direct insert, no queue, no enrichment.** `insertData = data.data.map(item => ({ ...item, user_id }))`. Returns `{ insertedCount }` only.
- No junction row inserted, no category assignment server-side.
- **Lifecycle class:** E.

### Ingress 11 — PDF URL Branch

Branch within Ingresses 1/2, not a separate mutation. `onSettled` IIFE detects `mediaType === PDF_MIME_TYPE || URL_PDF_CHECK_PATTERN.test(url)`:

```ts
// use-add-bookmark-min-data-optimistic-mutation.ts:206-233
addLoadingBookmarkId(data.id);                              // AFTER server responds
try { await handlePdfThumbnailAndUpload(...); }
catch { /* one retry */ }
finally {
  queryClient.invalidateQueries({ queryKey: [BOOKMARKS_KEY, session?.user?.id] });
  removeLoadingBookmarkId(data.id);
}
```

- `handlePdfThumbnailAndUpload` generates a PDF thumbnail _client-side_ and uploads to R2 (see `src/utils/file-upload.ts`). Row UPDATE for `ogImage` happens via that utility, not the server endpoint.

### Ingress 12 — Image-type URL Branch

Branch within Ingresses 1/2. `onSettled` IIFE short-circuits at line 196:

```ts
const isUrlOfMimeType = await checkIfUrlAnImage(url);
if (isUrlOfMimeType) return; // no loadingBookmarkId, no screenshot mutation
```

Server's `addBookmarkMinData()` detects image MIME, sets `ogImage = url` synchronously at insert. `onSuccess` cache swap carries ogImage. `AnimatedBookmarkImage` preloads and fades in immediately.

### Ingress 13 — Audio-type URL Branch

Branch within Ingresses 1/2. Short-circuits at line 202:

```ts
const mediaType = await getMediaType(url);
if (mediaType?.includes("audio")) return;
```

Server sets `ogImage = AUDIO_OG_IMAGE_FALLBACK_URL` at insert.

---

## 6. Server Pipeline + Field Table

### 6.1 Endpoint / Worker Inventory

| #   | Name                          | File                                                                                                             | When                                                                 |
| --- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| E1  | `add-bookmark-min-data`       | `src/lib/bookmarks/add-bookmark-min-data.ts` (route at `src/app/api/v2/bookmark/add-bookmark-min-data/route.ts`) | Client sync POST                                                     |
| E2  | `add-url-screenshot`          | `src/app/api/v2/bookmark/add-url-screenshot/route.ts`                                                            | Client sync POST after E1 (non-media URLs)                           |
| E3  | `add-remaining-bookmark-data` | `src/lib/bookmarks/add-remaining-bookmark-data.ts`                                                               | Fired via `next/server after()` from E1 (media URLs) and E2 (always) |
| E4  | `v2-screenshot`               | `src/app/api/v2/screenshot/route.ts`                                                                             | pgmq queue consumer (bookmarks with no ogImage)                      |
| E5  | `v2-ai-enrichment`            | `src/app/api/v2/ai-enrichment/route.ts`                                                                          | pgmq queue consumer (bookmarks with ogImage already set)             |
| E6  | `twitter/sync`                | `src/app/api/twitter/sync/route.ts`                                                                              | Client sync POST (from extension); enqueues to `twitter_imports`     |
| E7  | `instagram/sync`              | `src/app/api/instagram/sync/route.ts`                                                                            | Enqueues to `instagram_imports`                                      |
| E8  | `raindrop/import`             | `src/app/api/raindrop/import/route.ts`                                                                           | Enqueues to `raindrop_imports`                                       |
| E9  | `v2/chrome-bookmarks/import`  | `src/app/api/v2/chrome-bookmarks/import/route.ts`                                                                | Enqueues to `chrome_bookmark_imports`                                |
| E10 | `v2/bookmarks/insert`         | `src/app/api/v2/bookmarks/insert/route.ts`                                                                       | Sync direct INSERT, no enrichment, no queue                          |
| E11 | `v2/file/upload-file`         | `src/app/api/v2/file/upload-file/route.ts`                                                                       | Client sync POST after R2 upload                                     |

### 6.2 Confirmed Schema Facts (`public.everything`)

Source: `src/types/database-generated.types.ts:191–208`.

Columns present: `id, url, user_id, type, title, description, ogImage, meta_data, enrichment_status, enriched_at, category_id, sort_index, inserted_at, trash, make_discoverable, screenshot`.

- **`screenshot_status` does NOT exist.** Not in migrations, not in generated types. Confirmed absent.
- **`enrichment_status` exists** (migration `20260320111000_add_enrichment_status_to_everything.sql`). Default `'pending'`. Allowed values: `pending, processing, completed, failed, skipped`. **Never written by application code.** Dead column.
- **`enriched_at` exists, never written.** Dead column.
- **`blur_url` does NOT exist as column.** Lives in `meta_data.ogImgBlurUrl`.
- **`last_error` / `last_error_at` live in `pgmq.q_<queue>` message bodies**, never on the bookmark row. Client never reads them.

### 6.3 Field-by-Field Write Table

| Field                        | Insert default                                                                                                                                                   | Writers                                                       | Success value                                                    | Failure value                                 |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------- |
| `ogImage`                    | OGS scraper result, or URL itself for media, or R2 URL for files, or CDN URL for Twitter/IG/Raindrop, or null for Chrome imports and regular URLs with no OG tag | E1, E3, E4, E5, E11, Raindrop `process_raindrop_bookmark` RPC | R2 URL or resolved URL                                           | Stays at prior value; never nulled on failure |
| `meta_data.ogImgBlurUrl`     | null (except video file upload, set inline)                                                                                                                      | E3, E4, E5, `uploadFileRemainingData` via `after()`           | Blurhash string                                                  | null (errors swallowed)                       |
| `meta_data.screenshot`       | null                                                                                                                                                             | E2                                                            | R2 URL of JPEG                                                   | null (failure → 503, no write)                |
| `meta_data.coverImage`       | null                                                                                                                                                             | E3                                                            | R2 URL of re-uploaded OGS image (or existing `ogImage` fallback) | null                                          |
| `title`                      | OGS scraper result or hostname fallback; filename for file uploads                                                                                               | E2                                                            | String from screenshot service or existing                       | Unchanged                                     |
| `description`                | OGS result or null                                                                                                                                               | E2, E3 (`finalDescription = existing ?? AI caption`)          | String or AI caption                                             | Unchanged                                     |
| `meta_data.img_caption`      | null (except video file upload)                                                                                                                                  | E3, E4, E5, `uploadFileRemainingData`                         | AI caption                                                       | null                                          |
| `meta_data.ocr`              | null                                                                                                                                                             | E3, E4, E5                                                    | OCR text or null                                                 | null                                          |
| `meta_data.ocr_status`       | unset                                                                                                                                                            | E3, E4, E5                                                    | `success` / `no_text` / `limit_reached`                          | `no_text` (default on AI error)               |
| `meta_data.image_keywords`   | unset                                                                                                                                                            | E3, E4, E5                                                    | `StructuredKeywords` object                                      | unset                                         |
| `meta_data.isPageScreenshot` | unset                                                                                                                                                            | E2, E4                                                        | Boolean                                                          | unset                                         |
| `meta_data.mediaType`        | set at insert by E1                                                                                                                                              | E4 (overwrite), Raindrop RPC (merge)                          | MIME or null                                                     | unchanged                                     |
| `meta_data.favIcon`          | set at insert by E1                                                                                                                                              | Raindrop RPC (merge)                                          | URL or null                                                      | unchanged                                     |
| `meta_data.iframeAllowed`    | set at insert by E1                                                                                                                                              | —                                                             | —                                                                | —                                             |
| `enrichment_status`          | `pending` (DB default)                                                                                                                                           | **Nobody**                                                    | Never set                                                        | Never set                                     |
| `enriched_at`                | null (DB default)                                                                                                                                                | **Nobody**                                                    | Never set                                                        | Never set                                     |
| `meta_data.additionalImages` | unset                                                                                                                                                            | E2                                                            | Array of R2 URLs                                                 | `[]` on collection failure                    |
| `meta_data.additionalVideos` | unset                                                                                                                                                            | E2                                                            | One-element R2 array or `[]`                                     | `[]`                                          |

### 6.4 Critical Server Observation: `after()` invisibility

E3 (`add-remaining-bookmark-data`) fires via `next/server after()` from both E1 and E2. It writes `ogImage` and `meta_data.ogImgBlurUrl` **after the HTTP response has been sent**. No cache invalidation signal is pushed to the client. The client only sees the result on the next `useQuery` refetch — which happens via `addBookmarkScreenshotMutation.onSettled` narrow invalidation (E2 path) or a later user action. For media URLs where E2 is skipped, there is _no client-triggered invalidation at all_ after E3 lands — the user must navigate or refresh.

### 6.5 pgmq Queue Topology

```text
twitter_imports       → worker routes by ogImage presence → v2-ai-enrichment (E5)
instagram_imports     → worker → E5
raindrop_imports      → process_raindrop_bookmark RPC → ai-embeddings queue → E5
chrome_bookmark_imports → worker routes by ogImage presence → v2-screenshot (E4) or E5
```

Queue worker is `src/utils/worker.ts` (`processImageQueue`). Triggered by Edge Function cron via `invoke_*_worker()` DB RPCs.

---

## 7. State-Machine Traces

### 7.1 Class A — URL + Screenshot Pipeline (Manual, Paste, PDF)

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
t₀  USER SUBMITS URL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    STATE (before):  no card exists
    EVENT:           useAddBookmark → addBookmarkMinDataOptimisticMutation.mutateAsync()

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
t₁  onMutate FIRES (sync, same tick)                     @hook:78-154
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    WRITES (in this exact order):
      setIsBookmarkAdding(true)                          @79
      await queryClient.cancelQueries(primaryKey)        @81
      tempId = -Date.now()                               @114
      queryClient.setQueryData → prepend {id:tempId,
        url, addedCategories, inserted_at, addedTags:[],
        trash:null}                                      @117-145
      recentlyAddedUrls.add(data.url)                    @150

    STATE after:
      id = NEG, ogImage = NULL, loading = FALSE,
      recent = TRUE, shouldAnimate = null, imgError = FALSE

    CARD MOUNTS
      imageCard.tsx:135 runs: shouldAnimateRef ??=
         recentlyAddedUrls.delete(url)   → TRUE, consumes entry
      shouldAnimate = true
      → routes to AnimatedBookmarkImage
      → displaySrc=null, img="" → isPreloading=true
      → LoaderImgPlaceholder (no isErrored)
    ┌─────────────────────────────────────────────┐
    │ DISPLAYED:  "Getting screenshot"            │  ✓ correct
    └─────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
t₂  SERVER POST /api/v2/bookmark/add-bookmark-min-data (in flight)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    Server work (add-bookmark-min-data.ts):
      - OGS scrape (sync, blocking)
      - getMediaType() HEAD request
      - INSERT row with ogImage = OGS result OR null
      - For media URLs only: fires after(addRemainingBookmarkData)
      - Returns full SingleListData[] (.select())

    Client unchanged. Card still "Getting screenshot". ✓

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
t₃  onSuccess FIRES                                     @hook:242-287
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    WRITES:
      recentlyAddedUrls.add(serverBookmark.url)         @248  ◄── re-add
      setQueryData: swap tempId → realId entry          @252-275
         (entry now carries serverBookmark.ogImage, which
          may be NULL for regular URLs or a URL for OGS-
          scraped ones)

    REMOUNT: cache swap changes list keys (id:NEG→POS). React unmounts
             the NEG-id instance and mounts a new POS-id instance.
             shouldAnimateRef is lost; new instance re-runs imageCard.tsx:135.

    STATE after remount:
      id = POS, ogImage = NULL or URL, loading = FALSE,
      recent = TRUE (just re-added), shouldAnimate = null

    First render of new instance:
      shouldAnimateRef ??= recentlyAddedUrls.delete(url) → TRUE
      → routes to AnimatedBookmarkImage

    Case ogImage = NULL (most regular URLs):
      displaySrc=null, img="" → isPreloading
    ┌─────────────────────────────────────────────┐
    │ DISPLAYED:  "Getting screenshot"            │  ✓
    └─────────────────────────────────────────────┘
    Case ogImage = URL (OGS found one):
      AnimatedBookmarkImage preloads → fades in.
      Screenshot mutation still fires but only updates meta_data.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
t₄  onSettled FIRES (same tick as t₃ for success)        @hook:163-241
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    SYNC writes:
      setIsBookmarkAdding(false)                         @164
      invalidateQueries [BOOKMARKS_COUNT_KEY, userId]    @167
      if (isMutating==1) invalidateQueries
          [BOOKMARKS_KEY, userId]                        @174

    Spawns void (async () => {...})():
      await checkIfUrlAnImage(url)     ◄── ~100-500ms HEAD
      await getMediaType(url)          ◄── ~100-500ms HEAD
         └─► branch:
             image MIME       → return (Ingress 12)
             audio MIME       → return (Ingress 13)
             PDF MIME         → addLoadingBookmarkId(data.id)  @208
             everything else  → addLoadingBookmarkId(data.id)  @237
                                addBookmarkScreenshotMutation.mutate()

    ╔═════════════════════════════════════════════════════════════════╗
    ║ GAP ① — the t₃→t₄ race                                          ║
    ║                                                                 ║
    ║ Between cache swap at t₃ and addLoadingBookmarkId at t₄, the    ║
    ║ POS-id card has:                                                ║
    ║   id = POS, ogImage = NULL, loading = FALSE, recent consumed    ║
    ║                                                                 ║
    ║ Today this renders correctly ("Getting screenshot") because     ║
    ║ shouldAnimateRef=true routes to AnimatedBookmarkImage which     ║
    ║ stays in isPreloading while img="".                             ║
    ║                                                                 ║
    ║ But: any terminal rule of the form                              ║
    ║   "id≥0 && !isLoading && !ogImage → Cannot fetch"               ║
    ║ would flash HERE for 200-1000ms.                                ║
    ╚═════════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
t₅  SCREENSHOT MUTATION in flight (up to 60s)           @screenshot-hook
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    STATE:
      id=POS, ogImage=NULL, loading=TRUE,
      shouldAnimate=true, imgError=FALSE

    Server E2 writes meta_data.screenshot but NOT ogImage.
    after() fires E3 which eventually UPDATEs ogImage + blurhash.

    CARD: AnimatedBookmarkImage, img still "" → "Getting screenshot" ✓

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
t₆a SCREENSHOT ERROR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    errorToast("Screenshot error: ...")                  @33
    removeLoadingBookmarkId(variables.id)                @33
    STATE: loading=FALSE, ogImage still NULL
    → "Getting screenshot" persists forever (until refresh).  ✗ GAP ② (in-session)
    Refresh → same state but also no `recent` → GAP ④.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
t₆b SCREENSHOT SETTLED (success or error)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    removeLoadingBookmarkId(response[0].id)              @38
    invalidateQueries narrowKey                          @41

    Success: refetch lands, ogImage = URL. AnimatedBookmarkImage preloads.
      - preload load: fades image in. ✓
      - preload error: onErrorRef.current() → setErrorImg(img)
                       → next render hits errorImg===img branch
                       → "Cannot fetch image for this bookmark" ✓

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
t₇  BACKGROUND after(addRemainingBookmarkData)    (running since t₄)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    Server writes:
      UPDATE everything SET ogImage = finalOgImage,
                             meta_data.ogImgBlurUrl = blurhash, ...
    Client: visible only on next useQuery refetch (no push signal).
    enrichment_status NEVER flipped.
```

### 7.2 Class B — URL Sync Image/Audio

```text
t₀..t₃: identical to Class A up to and including cache swap.
        Server returns row WITH ogImage already set (image URL itself,
        or AUDIO_OG_IMAGE_FALLBACK_URL).

t₄ onSettled IIFE:
     isUrlOfMimeType = true    → return immediately     @196
     OR mediaType includes "audio" → return              @202
     ⇒ loadingBookmarkIds NEVER touched.

Steady state after t₃ remount:
     id=POS, ogImage=URL, loading=FALSE, shouldAnimate=true
     → AnimatedBookmarkImage preloads URL
     → fades in, or onError → "Cannot fetch..."
```

No gap. No ambiguity.

### 7.3 Class C — File Upload

```text
t₀  User drops file / paperclip / paste
t₁  onMutate:
     - Compute preGeneratedUrl (R2 public URL, deterministic)
     - PUT binary to R2 via presigned URL
     - cancelQueries, setQueryData prepend
       {id:tempId, title, url:preGen, type, inserted_at}
     - recentlyAddedUrls.add(preGeneratedUrl)             @173
    STATE: id=NEG, ogImage=NULL, loading=FALSE, recent=TRUE
    CARD: shouldAnimate=true → "Getting screenshot" ✓

t₂  Server POST /api/v2/file/upload-file:
     video → ogImage = thumbnail R2 URL, fires after(enrich)
     audio → ogImage = AUDIO_OG_IMAGE_FALLBACK_URL, no after
     pdf   → ogImage = thumbnail R2 URL (or null), no after
     image/other → ogImage = filePublicUrl, fires after(enrich)
    Returns ONLY {id} — NOT full row.

t₃  onSuccess:
     recentlyAddedUrls.add(preGeneratedUrl)               @244
     (NO cache swap — server returned only id)

t₄  onSettled (UNGUARDED, unlike Class A):
     invalidateQueries [BOOKMARKS_KEY, userId]           @227
     invalidateQueries [BOOKMARKS_COUNT_KEY, userId]     @230

t₅  Refetch lands → temp row REPLACED wholesale. React remounts
    with real id. New instance:
      shouldAnimateRef ??= recentlyAddedUrls.delete(preGen) → TRUE
      → AnimatedBookmarkImage → preload → fade. ✓

    ╔═════════════════════════════════════════════════════════════════╗
    ║ GAP ② — file upload never uses loadingBookmarkIds              ║
    ║                                                                 ║
    ║ Card only on animated path via recentlyAddedUrls. If user       ║
    ║ reloads mid-upload AND row is in DB without ogImage, card       ║
    ║ renders non-animated → LoaderImgPlaceholder →                   ║
    ║ "Getting screenshot" forever. Same end state as Gap ④.         ║
    ╚═════════════════════════════════════════════════════════════════╝
```

### 7.4 Class D — Queue Imports

```text
t₀  User triggers import (CSV) or extension pushes (Twitter/IG/Chrome).

t₁  POST to /api/{raindrop|twitter|instagram|v2/chrome-bookmarks}/...
    Server enqueue_*_bookmarks RPC INSERTs rows directly into
    `everything`, then pgmq.send(queue_name, ...) for async enrichment.

t₂  Server response: {inserted,skipped} or {queued,skipped}.
    NO optimistic row. NO recentlyAddedUrls. NO loadingBookmarkIds.

t₃  (a) CSV via Raindrop import hook:
        onSettled invalidateQueries [BOOKMARKS_KEY] (BROADEST, no userId)
    (b) Extension calls (Twitter/IG/Chrome):
        NO client-side hook. NO invalidation. Only visible on next load.

t₄  Row has whatever ogImage the payload carried:
      Twitter:   pbs.twimg.com URL       (usually present)
      Instagram: cdninstagram.com        (usually present)
      Raindrop:  payload.cover           (usually present)
      Chrome:    NULL                    (never present)

t₅  Worker (pgmq consumer) eventually UPDATEs ogImage + meta_data.
    No push to client.

CARD at first render:
    recentlyAddedUrls.delete(url) → FALSE
    → shouldAnimate = false (sticky)
    → Non-animated path (imageCard.tsx:155-158)
    if (!img) → LoaderImgPlaceholder → "Getting screenshot"
    else      → BookmarkImage

    ╔═════════════════════════════════════════════════════════════════╗
    ║ GAP ③ — Chrome-imported bookmarks: ogImage=NULL until worker.  ║
    ║ Static "Getting screenshot" with no animation, no loader state, ║
    ║ no way to distinguish from abandoned. Original Slack bug class. ║
    ╚═════════════════════════════════════════════════════════════════╝
```

### 7.5 Class E — Prior-session Abandoned Bookmark (temporal)

```text
Not an ingress; any row where the pipeline gave up in a prior session.

At load: useQuery hydrates. Card mounts for row with:
   id=POS, ogImage=NULL, loading=FALSE  (Zustand is session-local)
   recent=FALSE  (Set is in-memory only)

   shouldAnimate = false → non-animated path
   !img → LoaderImgPlaceholder → "Getting screenshot"

   ╔═════════════════════════════════════════════════════════════════╗
   ║ GAP ④ — "Getting screenshot" forever.                          ║
   ║ No client signal says "pipeline terminated".                    ║
   ║ enrichment_status is DEAD. last_error is in pgmq message body.  ║
   ║ <Image onError> can't fire because there's no URL to load.      ║
   ╚═════════════════════════════════════════════════════════════════╝
```

---

## 8. Copy Decision Function (Current, Post-Iteration-2)

Exact render tree today:

```text
                 ImgLogicComponent (imageCard.tsx)
                        │
                        ▼
             if (!hasCoverImg) return null
                        │
                        ▼
          if (img && errorImg === img)                 ┐
              → LoaderImgPlaceholder isErrored          ├─► "Cannot fetch
                  (cardTypeCondition only)              │   image for this
                        │                               ┘   bookmark"
                        ▼
              BookmarkImageWithAnimation
                        │
                        │ shouldAnimateRef.current ??=
                        │     recentlyAddedUrls.delete(url)
                        │ if (isLoading && !ref.current) ref.current = true
                        ▼
              ┌─────────┴─────────┐
              │                    │
   shouldAnimate === true    shouldAnimate === false
              │                    │
              ▼                    ▼
  AnimatedBookmarkImage      if (!img) → LoaderImgPlaceholder
              │                           → "Getting screenshot"
              │                   else   → BookmarkImage
              │                           (onError → top of tree)
              │
   (preloads img via new Image())
              │
   ┌──────────┴──────────┐
   │                      │
  preload ERROR      preload OK / still preloading
   │                      │
   ▼                      ▼
  onErrorRef.current()   if (!img || !displaySrc)
  → setErrorImg(img)       → LoaderImgPlaceholder
  → re-render, hits        → "Getting screenshot"
    errorImg===img         else
  → "Cannot fetch..."      → BookmarkImage fade-in
```

Three leaves: _"Getting screenshot"_, _"Cannot fetch image for this bookmark"_, actual image.

---

## 9. Render-Path × State × Copy Matrix

Every row is a reachable steady state. `F/T` = FALSE/TRUE.

| #   | Class                   | id  | ogImage | loading | shouldAnimate | imgError | Render path         | Displayed            | Correct?          |
| --- | ----------------------- | --- | ------- | ------- | ------------- | -------- | ------------------- | -------------------- | ----------------- |
| 1   | A/B/C                   | NEG | NULL    | F       | true          | F        | AnimBkmk preloading | "Getting screenshot" | ✓                 |
| 2   | A                       | POS | NULL    | F       | true          | F        | AnimBkmk preloading | "Getting screenshot" | ✓ fragile (Gap ①) |
| 3   | A                       | POS | NULL    | T       | true          | F        | AnimBkmk preloading | "Getting screenshot" | ✓                 |
| 4   | A/B/C                   | POS | URL     | F       | true          | F        | AnimBkmk displaying | image                | ✓                 |
| 5   | A/B/C                   | POS | URL     | F       | true          | T        | onError → isErrored | "Cannot fetch..."    | ✓                 |
| 6   | A (gave up)             | POS | NULL    | F       | true          | F        | AnimBkmk preloading | "Getting screenshot" | ✗ Gap ②           |
| 7   | D (Chrome)              | POS | NULL    | F       | false         | F        | Non-anim, !img      | "Getting screenshot" | ✗ Gap ③           |
| 8   | D (Twitter/IG/Raindrop) | POS | URL     | F       | false         | F        | BookmarkImage       | image                | ✓                 |
| 9   | D                       | POS | URL     | F       | false         | T        | onError → isErrored | "Cannot fetch..."    | ✓                 |
| 10  | E (prior session)       | POS | NULL    | F       | false         | F        | Non-anim, !img      | "Getting screenshot" | ✗ Gap ④           |

---

## 10. The Fundamental Ambiguity

```text
┌──────────────────────────────────────────────────────────────┐
│  Signature { POS, ogImage=NULL, !loading, !imgError } is    │
│  shared by FOUR physically distinct states:                 │
│                                                              │
│    • Row 2:  t₃→t₄ race — pipeline IS ABOUT TO START        │
│    • Row 6:  abandoned THIS session (screenshot error)      │
│    • Row 7:  Chrome-imported, pipeline IN QUEUE             │
│    • Row 10: abandoned PRIOR session                        │
│                                                              │
│  Rows 2 and 7 should say "Getting screenshot".              │
│  Rows 6 and 10 should say "Cannot fetch image".             │
│  Client cannot distinguish them with today's schema.        │
└──────────────────────────────────────────────────────────────┘
```

This is why a schema column (`screenshot_status`) is the clean fix — it's the only mechanism that cuts this knot. Anything else is a heuristic.

---

## 11. Gap Catalog

| #   | Gap                                         | Class | Duration        | Current behavior                                                                                                                        | Desired                                                      |
| --- | ------------------------------------------- | ----- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| ①   | t₃→t₄ race                                  | A     | 200-1000ms      | _"Getting screenshot"_ (correct by accident)                                                                                            | _"Getting screenshot"_                                       |
| ②   | File upload never uses `loadingBookmarkIds` | C     | Whole lifecycle | OK via `recentlyAddedUrls`                                                                                                              | _"Getting screenshot"_ until done                            |
| ③   | Queue imports invisible to client stores    | D     | Whole lifecycle | Chrome: _"Getting screenshot"_ forever on cold load until worker lands. Twitter/IG/Raindrop usually OK because payload carries ogImage. | _"Getting screenshot"_ until terminal, then _"Cannot fetch"_ |
| ④   | Prior-session abandoned bookmark            | E     | Forever         | _"Getting screenshot"_ forever                                                                                                          | _"Cannot fetch"_                                             |

Row 2 is a separate GAP ① only because any proposed iteration-3 terminal rule must avoid flashing _"Cannot fetch"_ here.

---

## 12. Cache Invalidation Reference

### 12.1 `invalidateQueries` on BOOKMARKS_KEY

| Hook                                                           | Phase                                    | Key breadth                                     |
| -------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------- |
| `use-add-bookmark-min-data-optimistic-mutation.ts:175`         | `onSettled`, guarded by `isMutating===1` | `[KEY, userId]` broad                           |
| `use-add-bookmark-min-data-optimistic-mutation.ts:228`         | IIFE PDF `finally`                       | broad                                           |
| `use-add-bookmark-screenshot-mutation.ts:41`                   | `onSettled`                              | **narrow** `[KEY, userId, CATEGORY_ID, sortBy]` |
| `useDeleteBookmarksOptimisticMutation.ts:74`                   | `onSettled`                              | broad                                           |
| `use-move-bookmark-to-trash-optimistic-mutation.ts:89,96`      | `onSettled` success                      | broad / `[KEY,userId,TRASH_URL]`                |
| `use-import-bookmarks-mutation.ts:70`                          | `onSettled` success                      | **broadest** `[KEY]` (no userId!)               |
| `useClearBookmarksInTrashMutation.ts:17`                       | `onSuccess`                              | **broadest** `[KEY]`                            |
| `use-file-upload-optimistic-mutation.ts:227`                   | `onSettled`                              | broad                                           |
| `use-add-category-to-bookmarks-optimistic-mutation.ts:50`      | `onSettled` success                      | broad                                           |
| `use-add-category-to-bookmark-optimistic-mutation.ts:110`      | `onSettled` success                      | broad                                           |
| `use-remove-category-from-bookmark-optimistic-mutation.ts:119` | `onSettled` success                      | broad                                           |
| `use-set-bookmark-categories-optimistic-mutation.ts:62`        | `onSettled` success                      | broad                                           |
| `useDeleteCategoryOptimisticMutation.ts:60`                    | `onSettled` success                      | broad                                           |
| `use-add-tag-to-bookmark-optimistic-mutation.ts:37`            | `onSettled` success                      | broad                                           |
| `use-remove-tag-from-bookmark-optimistic-mutation.ts:33`       | `onSettled` success                      | broad                                           |
| `use-create-and-assign-tag-optimistic-mutation.ts:117`         | `onSettled` success                      | broad                                           |
| `use-update-shared-categories-optimistic-mutation.ts:66`       | `onSettled`                              | narrow                                          |
| `useLightboxLogic.ts:144`                                      | user action (lightbox slide change)      | broad                                           |
| `pageComponents/dashboard/index.tsx:98`                        | route-change useEffect                   | narrow                                          |
| `use-react-query-optimistic-mutation.ts:240,247,387`           | generic `invalidates` option             | varies                                          |

**Footgun:** screenshot mutation invalidates only the narrow key. If user switches category mid-screenshot, the new view's cache won't see the completed ogImage until its own invalidation fires.

### 12.2 `setQueryData` on BOOKMARKS_KEY

| Hook                                                             | Phase                                | Purpose                        |
| ---------------------------------------------------------------- | ------------------------------------ | ------------------------------ |
| `use-add-bookmark-min-data-optimistic-mutation.ts:117`           | `onMutate`                           | Prepend optimistic placeholder |
| `use-add-bookmark-min-data-optimistic-mutation.ts:156`           | `onError`                            | Roll back                      |
| `use-add-bookmark-min-data-optimistic-mutation.ts:252`           | `onSuccess`                          | Swap tempId → real row         |
| `useDeleteBookmarksOptimisticMutation.ts:36,66`                  | `onMutate`/`onError`                 | Filter / rollback              |
| `use-file-upload-optimistic-mutation.ts:142,215`                 | `onMutate`/`onError`                 | Prepend / rollback             |
| `use-create-and-assign-tag-optimistic-mutation.ts:92,100`        | `onSettled` success                  | Swap temp tag id               |
| `use-react-query-optimistic-mutation.ts:169,175,184,192,194,199` | generic primary/secondary/additional | Updater + rollback             |
| `use-react-query-optimistic-mutation.ts:360,368`                 | multi-key generic                    | Updaters + rollback            |

### 12.3 `cancelQueries`

| Hook                                                  | Phase             | Key                          |
| ----------------------------------------------------- | ----------------- | ---------------------------- |
| `use-add-bookmark-min-data-optimistic-mutation.ts:81` | `onMutate`        | narrow                       |
| `useDeleteBookmarksOptimisticMutation.ts:23`          | `onMutate`        | narrow                       |
| `use-file-upload-optimistic-mutation.ts:121`          | `onMutate`        | narrow                       |
| `use-react-query-optimistic-mutation.ts:135,139,147`  | generic onMutate  | primary/secondary/additional |
| `use-react-query-optimistic-mutation.ts:347`          | multi-key generic | array                        |

---

## 13. Fix Options A / B / C

| Option | Approach                                                                                                                                                                                                                                                                             | Pros                                                          | Cons                                                                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **A**  | Close Gap ① (move `addLoadingBookmarkId(data.id)` into synchronous top of `onSettled` or into `onSuccess`) + restore `loadingBookmarkIds` terminal gate on `!isLoading && !ogImage → Cannot fetch`. **Accept queue-import regression.**                                              | Smallest diff; sharp signal for add-URL flow.                 | Twitter/Raindrop/Chrome imports flash _"Cannot fetch"_ during import burst — the original Slack bug reappears.                               |
| **B**  | Option A + `inserted_at`-age fallback (e.g., `<N seconds → always "Getting screenshot"`).                                                                                                                                                                                            | Covers queue imports too; client-only.                        | Arbitrary N. Users see stale loader for up to N seconds on bookmarks that actually failed in 2s. `inserted_at` must be plumbed to component. |
| **C**  | Schema change: `screenshot_status` column `pending / processing / success / failed / skipped`. Pipeline writes it at every terminal path (E1 insert → pending; E2 error → failed; E4/E5 error after retries → failed; E2/E4/E5 success → success). Client reads it and maps to copy. | Cleanest semantics; single source of truth; closes every gap. | Biggest scope — migration + pipeline writes in all 11 endpoints/workers + queue workers + client read + backfill.                            |

Iteration 2 flagged Option C as the proper long-term fix. User has not chosen.

### 13.1 Option C: Writer Checklist (if chosen)

Every terminal point where `ogImage` might not be populated must write `screenshot_status`:

- E1 (`add-bookmark-min-data`) INSERT: default `'pending'`.
- E1 image/audio branches: write `'success'` (ogImage is the URL itself or audio fallback).
- E2 (`add-url-screenshot`) success UPDATE: write `'success'`.
- E2 error 503 path: write `'failed'` (currently nothing is written).
- E3 (`add-remaining-bookmark-data`) `after()` success: write `'success'` (takes priority over E2 if both fire).
- E3 failure: write `'failed'`.
- E4 (`v2-screenshot`) success: write `'success'`.
- E4 pgmq `read_ct > MAX_RETRIES` archive path: write `'failed'`.
- E5 (`v2-ai-enrichment`) success: write `'success'`.
- E5 pgmq exhaustion: write `'failed'`.
- E6/E7/E8/E9 initial enqueue (when ogImage already in payload): write `'success'` at insert.
- E10 extension direct insert: write `'success'` if payload includes ogImage else `'pending'`.
- E11 (`file-upload-file`) video/audio/image: write `'success'` at insert. PDF: `'success'` if thumbnailPath, else `'pending'`.
- Migration: backfill existing rows — `ogImage IS NOT NULL → 'success'`, `ogImage IS NULL → 'failed'` (assumption: old rows without ogImage by now are genuinely terminal).

---

## 14. File Back-Index

### Client lifecycle

| Concern                                | Path                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------ |
| Placeholder render / ImgLogic          | `src/pageComponents/dashboard/cardSection/imageCard.tsx`                             |
| Animation / preload / placeholder text | `src/pageComponents/dashboard/cardSection/animatedBookmarkImage.tsx`                 |
| Zustand loading set                    | `src/store/componentStore.ts`                                                        |
| Manual URL add mutation                | `src/async/mutationHooks/bookmarks/use-add-bookmark-min-data-optimistic-mutation.ts` |
| Screenshot mutation                    | `src/async/mutationHooks/bookmarks/use-add-bookmark-screenshot-mutation.ts`          |
| File upload mutation                   | `src/async/mutationHooks/files/use-file-upload-optimistic-mutation.ts`               |
| Raindrop import mutation               | `src/async/mutationHooks/bookmarks/use-import-bookmarks-mutation.ts`                 |
| PDF thumbnail utility                  | `src/utils/file-upload.ts`                                                           |
| Clipboard paste handler                | `src/async/uploads/clipboard-upload.ts`                                              |
| Global paste listener                  | `src/pageComponents/dashboard/bookmarkCards.tsx:64-96`                               |
| Dropzone                               | `src/pageComponents/dashboard/bookmarkCards.tsx:105`                                 |
| Add-bookmark popover                   | `src/components/customDropdowns.tsx/addBookmarkDropdown.tsx`                         |
| Paginated query hook                   | `src/async/queryHooks/bookmarks/use-fetch-paginated-bookmarks.ts`                    |

### Server endpoints (v2)

| Concern                      | Path                                                                                                                        |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Initial URL add              | `src/app/api/v2/bookmark/add-bookmark-min-data/route.ts`, logic in `src/lib/bookmarks/add-bookmark-min-data.ts`             |
| Client-sync screenshot       | `src/app/api/v2/bookmark/add-url-screenshot/route.ts`                                                                       |
| Remaining data enrichment    | `src/app/api/v2/bookmark/add-remaining-bookmark-data/route.ts`, logic in `src/lib/bookmarks/add-remaining-bookmark-data.ts` |
| pgmq screenshot consumer     | `src/app/api/v2/screenshot/route.ts`                                                                                        |
| pgmq AI-enrichment consumer  | `src/app/api/v2/ai-enrichment/route.ts`                                                                                     |
| File upload                  | `src/app/api/v2/file/upload-file/route.ts`                                                                                  |
| Twitter sync                 | `src/app/api/twitter/sync/route.ts`                                                                                         |
| Instagram sync               | `src/app/api/instagram/sync/route.ts`                                                                                       |
| Raindrop import              | `src/app/api/raindrop/import/route.ts`                                                                                      |
| Chrome bookmarks bulk import | `src/app/api/v2/chrome-bookmarks/import/route.ts`                                                                           |
| Extension direct push        | `src/app/api/v2/bookmarks/insert/route.ts`                                                                                  |
| Queue worker                 | `src/utils/worker.ts`                                                                                                       |

### Schema

| Concern                       | Path                                                                         |
| ----------------------------- | ---------------------------------------------------------------------------- |
| Generated types               | `src/types/database-generated.types.ts` lines 191–208 (`everything` table)   |
| `enrichment_status` migration | `supabase/migrations/20260320111000_add_enrichment_status_to_everything.sql` |
| Twitter queue migration       | `supabase/migrations/20260206120000_twitter_imports_queue.sql`               |
| Instagram queue migration     | `supabase/migrations/20260212120000_instagram_transactional_enqueue.sql`     |
| Raindrop queue migration      | `supabase/migrations/20260206050200_raindrop_imports_queue.sql`              |
| Chrome queue migration        | `supabase/migrations/20260401120000_chrome_bookmark_imports_queue.sql`       |

---

## 15. Verification Commands

### Placeholder inventory (agent-browser)

```bash
AGENT_BROWSER_AUTO_CONNECT=1 agent-browser eval --stdin <<'EOF'
(() => {
  const gifs = document.querySelectorAll('img[alt="loading"]').length;
  const bookmarkImgs = document.querySelectorAll('img[alt="bookmark-img"]').length;
  const allPs = Array.from(document.querySelectorAll('p')).map(p => p.textContent?.trim() || '');
  return JSON.stringify({
    loaderGifs: gifs,
    bookmarkImgs,
    getting: allPs.filter(t => t === 'Getting screenshot').length,
    cannot: allPs.filter(t => t === 'Cannot fetch image for this bookmark').length,
    oldFetching: allPs.filter(t => t === 'Fetching data...').length,
    oldTaking: allPs.filter(t => t === 'Taking screenshot....').length,
  });
})()
EOF
```

Healthy run after iteration 2: `{"loaderGifs":9,"bookmarkImgs":16,"getting":1,"cannot":8,"oldFetching":0,"oldTaking":0}`.

### 4-second flicker MutationObserver

```bash
AGENT_BROWSER_AUTO_CONNECT=1 agent-browser eval --stdin <<'EOF'
(async () => {
  const placeholderPs = Array.from(document.querySelectorAll('p'))
    .filter(p => {
      const t = p.textContent?.trim();
      return t === 'Getting screenshot' || t === 'Cannot fetch image for this bookmark';
    });
  const changes = [];
  const obs = placeholderPs.map(p => {
    const o = new MutationObserver(muts =>
      muts.forEach(m => changes.push({ type: m.type, to: p.textContent?.trim() }))
    );
    o.observe(p, { childList: true, characterData: true, subtree: true });
    return o;
  });
  await new Promise(r => setTimeout(r, 4000));
  obs.forEach(o => o.disconnect());
  return JSON.stringify({
    watched: placeholderPs.length,
    mutations: changes.length,
    distinct: [...new Set(changes.map(c => c.to))],
  });
})()
EOF
```

Expected: `mutations: 0` in steady state.

### Dev server

```bash
pnpm dev 2>&1 | grep -E --line-buffered "Ready|Local:|✓ |error|Error|ERR|Failed|failed|Killed|OOM|EADDR|Compiled|unhandled|Warning:|warning " | grep -v --line-buffered "base_url:"
```

Stream the output through a tool that emits stdout lines as events (not a silent background runner) so the _Ready_ signal and any compile errors surface immediately.

---

## 16. Unexpected Findings

1. **`recentlyAddedUrls.delete(url)` in render body** (`imageCard.tsx:135`) — violates React purity. Mitigated by `??=`. Fragile under strict-mode double-mount if React ever tears down and re-creates the component instance between `.add` and first render.

2. **`addLoadingBookmarkId` in fire-and-forget IIFE** (`use-add-bookmark-min-data-optimistic-mutation.ts:194`). Set write is detached from mutation lifecycle. `removeLoadingBookmarkId` for non-PDF path is in a DIFFERENT hook (`use-add-bookmark-screenshot-mutation.ts`). Cross-hook lifecycle coupling.

3. **Broadest possible invalidation used by imports and trash-clear** (`[BOOKMARKS_KEY]`, no userId) — will bust every user's cache including guests. Pre-existing, not iteration-related.

4. **Screenshot mutation uses narrow invalidation** while every other mutation uses broad. Means navigating categories mid-screenshot leaves stale cache in non-current views.

5. **`enrichment_status` is dead.** Migration exists. Column exists. Never written.

6. **`last_error`/`last_error_at` never surface to client.** Live in `pgmq.q_*` message bodies.

7. **`isSortByLoading` used as side-channel** in `use-fetch-paginated-bookmarks.ts` — Zustand signals drive the same skeleton loader as react-query `isLoading`, via a `useEffect`. Dual sources of truth for "bookmark list is loading."

8. **Dashboard useEffect unconditionally invalidates narrow key on every route change** (`src/pageComponents/dashboard/index.tsx:98`). Overrides react-query's `staleTime` entirely for the bookmark list.

---

## 17. Glossary

| Term                             | Meaning                                                        |
| -------------------------------- | -------------------------------------------------------------- |
| OGS                              | `open-graph-scraper` npm package used at E1                    |
| pgmq                             | Postgres Message Queue (Supabase extension)                    |
| tempId                           | Negative integer used as React list key for optimistic entries |
| `recent` / `recentlyAddedUrls`   | In-memory Set of URLs that should animate on mount             |
| `loading` / `loadingBookmarkIds` | Zustand Set of bookmark ids currently in the pipeline          |
| "Class A/B/C/D/E"                | The five lifecycle classes defined in §4                       |
| "Row N"                          | A row of the matrix in §9                                      |
| "Gap ①/②/③/④"                    | The four gaps catalogued in §11                                |

---

## 18. Change Log

- 2026-04-14 — Initial document. Captures exhaustive exploration across 13 ingresses, 11 endpoints/workers, 3 stores/caches. Ships alongside iterations 1 and 2 of the placeholder-copy work (both already applied to `animatedBookmarkImage.tsx` and `imageCard.tsx`). Iteration 3 pending — blocked on choice of Option A/B/C.
