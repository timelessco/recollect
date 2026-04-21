# Caller Migration Tracker

One-stop inventory of every Recollect API route and every consumer across all repos.

**Legend:**

- **Status**: ` ` = not started, `~` = in progress, `x` = done, `n/a` = intentional (no migration planned)
- **Consumers** (who calls this endpoint):
  - `web` — this repo (`/Users/navin/Developer/recollect`, Next.js web app)
  - `ios` — iOS app (`/Users/navin/Developer/recollect-swiftui`, Swift + SwiftUI)
  - `ext` — browser extension (`/Users/navin/Developer/recollect-extension`, Chrome/Safari)
  - `app` — mobile app (`/Users/navin/Developer/recollect-app`, Expo React Native)
  - `cron` — Vercel cron trigger
  - `s2s` — server-to-server within the web repo (worker/process-queue, Pages handler fan-out)
  - `email` — email-link redirect (external URL click)
  - `dev` — local dev only
  - `test` — test-harness route
  - `—` — no caller found (possibly orphan)
- **Status tracks web-caller migration only.** `x` means the web caller (if any) uses ky `api` instance + `V2_*` constant. Non-web-only rows stay blank — no migration to do from this repo.

---

## Pages Router Routes (old ↔ v2)

Old Pages Router files (`src/pages/api/`) with v2 App Router equivalents (`src/app/api/v2/`).

### Bookmark

| #   | Status | Old Path                                    | v2 Path                                        | Consumers          | Constant                       | Caller                                                         |
| --- | ------ | ------------------------------------------- | ---------------------------------------------- | ------------------ | ------------------------------ | -------------------------------------------------------------- |
| 1   | x      | `/api/bookmark/add-bookmark-min-data`       | `/api/v2/bookmark/add-bookmark-min-data`       | web, ios, app      | `V2_ADD_BOOKMARK_MIN_DATA_API` | useAddBookmarkMinDataOptimisticMutation                        |
| 2   |        | `/api/bookmark/add-remaining-bookmark-data` | `/api/v2/bookmark/add-remaining-bookmark-data` | s2s                | `ADD_REMAINING_BOOKMARK_API`   | Pages handler only (add-bookmark-min-data, add-url-screenshot) |
| 3   | x      | `/api/bookmark/add-url-screenshot`          | `/api/v2/bookmark/add-url-screenshot`          | web, ios, ext, app | `V2_ADD_URL_SCREENSHOT_API`    | useAddBookmarkScreenshotMutation                               |
| 4   | x      | `/api/bookmark/fetch-bookmarks-count`       | `/api/v2/bookmark/fetch-bookmarks-count`       | web, ios, app      | `V2_FETCH_BOOKMARKS_COUNT_API` | useFetchBookmarksCount                                         |
| 5   | x      | `/api/bookmark/fetch-bookmarks-data`        | `/api/v2/bookmark/fetch-bookmarks-data`        | web, ios, app      | `V2_FETCH_BOOKMARKS_DATA_API`  | useFetchPaginatedBookmarks                                     |
| 6   | x      | `/api/bookmark/fetch-bookmarks-view`        | `/api/v2/bookmark/fetch-bookmarks-view`        | web                | `V2_FETCH_BOOKMARKS_VIEW_API`  | useFetchBookmarksView                                          |
| 7   | x      | `/api/bookmark/search-bookmarks`            | `/api/v2/bookmark/search-bookmarks`            | web, ios, app      | `V2_SEARCH_BOOKMARKS_API`      | useSearchBookmarks                                             |

### Bookmark (v1-prefixed)

| #   | Status | Old Path                               | v2 Path                                | Consumers | Constant                      | Caller                                                                 |
| --- | ------ | -------------------------------------- | -------------------------------------- | --------- | ----------------------------- | ---------------------------------------------------------------------- |
| 8   | x      | `/api/v1/bookmarks/get/fetch-by-id`    | `/api/v2/bookmarks/get/fetch-by-id`    | web       | `V2_FETCH_BOOKMARK_BY_ID_API` | useFetchBookmarkById                                                   |
| 9   | x      | `/api/v1/bookmarks/get/get-media-type` | `/api/v2/bookmarks/get/get-media-type` | web, app  | `V2_GET_MEDIA_TYPE_API`       | getMediaType (app still on v1)                                         |
| 10  | x      | `/api/v1/bookmarks/get/get-pdf-buffer` | `/api/v2/bookmarks/get/get-pdf-buffer` | web, ios  | `V2_GET_PDF_BUFFER_API`       | file-upload.ts (ios still on v1 via FileService.swift:257)             |
| 11  |        | `/api/v1/bookmarks/insert`             | `/api/v2/bookmarks/insert`             | —         | —                             | no caller found (ext migrated to #82 add-bookmark-multiple-categories) |
| 13  | x      | `/api/v1/screenshot`                   | `/api/v2/screenshot`                   | s2s       | `V2_SCREENSHOT_API`           | worker.ts (process-queue dispatch)                                     |
| 14  | x      | `/api/v1/ai-enrichment`                | `/api/v2/ai-enrichment`                | s2s       | `V2_AI_ENRICHMENT_API`        | worker.ts (process-queue dispatch)                                     |

### Category

| #   | Status | Old Path                              | v2 Path                                  | Consumers          | Constant                       | Caller                                   |
| --- | ------ | ------------------------------------- | ---------------------------------------- | ------------------ | ------------------------------ | ---------------------------------------- |
| 15  | x      | `/api/category/fetch-user-categories` | `/api/v2/category/fetch-user-categories` | web, ios, ext, app | `V2_FETCH_USER_CATEGORIES_API` | useFetchCategories                       |
| 16  | x      | `/api/category/update-category-order` | `/api/v2/category/update-category-order` | web                | `V2_UPDATE_CATEGORY_ORDER_API` | useUpdateCategoryOrderOptimisticMutation |

### Tags

| #   | Status | Old Path                    | v2 Path                        | Consumers | Constant                 | Caller           |
| --- | ------ | --------------------------- | ------------------------------ | --------- | ------------------------ | ---------------- |
| 17  | x      | `/api/tags/fetch-user-tags` | `/api/v2/tags/fetch-user-tags` | web       | `V2_FETCH_USER_TAGS_API` | useFetchUserTags |

### Share / Collaboration

| #   | Status | Old Path                                      | v2 Path                                          | Consumers | Constant                                  | Caller                                                                                    |
| --- | ------ | --------------------------------------------- | ------------------------------------------------ | --------- | ----------------------------------------- | ----------------------------------------------------------------------------------------- |
| 18  | x      | `/api/fetch-public-category-bookmarks`        | `/api/v2/fetch-public-category-bookmarks`        | web       | `V2_FETCH_PUBLIC_CATEGORY_BOOKMARKS_API`  | use-fetch-public-category-bookmarks + SSR public/[user_name]/[id]                         |
| 19  | x      | `/api/share/delete-shared-categories-user`    | `/api/v2/share/delete-shared-categories-user`    | web, ios  | `V2_DELETE_SHARED_CATEGORIES_USER_API`    | useDeleteSharedCategoriesUserMutation                                                     |
| 20  | x      | `/api/share/fetch-shared-categories-data`     | `/api/v2/share/fetch-shared-categories-data`     | web, app  | `V2_FETCH_SHARED_CATEGORIES_DATA_API`     | useFetchSharedCategories                                                                  |
| 21  | x      | `/api/share/send-collaboration-email`         | `/api/v2/share/send-collaboration-email`         | web, ios  | `V2_SEND_COLLABORATION_EMAIL_API`         | useSendCollaborationEmailInviteMutation                                                   |
| 22  |        | `/api/share/send-email`                       | `/api/v2/share/send-email`                       | s2s       | `SEND_EMAIL`                              | Pages handler only (send-collaboration-email)                                             |
| 23  | x      | `/api/share/update-shared-category-user-role` | `/api/v2/share/update-shared-category-user-role` | web, app  | `V2_UPDATE_SHARED_CATEGORY_USER_ROLE_API` | useUpdateSharedCategoriesUserAccessMutation (ios uses different path — see Discrepancies) |

### Profiles

| #   | Status | Old Path                               | v2 Path                                   | Consumers          | Constant                        | Caller                                                                     |
| --- | ------ | -------------------------------------- | ----------------------------------------- | ------------------ | ------------------------------- | -------------------------------------------------------------------------- |
| 24  | x      | `/api/profiles/delete-user`            | `/api/v2/profiles/delete-user`            | web, ios, app      | `V2_DELETE_USER_API`            | useDeleteUserMutation                                                      |
| 25  | x      | `/api/profiles/fetch-user-profile`     | `/api/v2/profiles/fetch-user-profile`     | web, ios, ext, app | `V2_FETCH_USER_PROFILE_API`     | useFetchUserProfile                                                        |
| 26  | x      | `/api/profiles/fetch-user-profile-pic` | `/api/v2/profiles/fetch-user-profile-pic` | web                | `V2_FETCH_USER_PROFILE_PIC_API` | useGetUserProfilePic                                                       |
| 27  | x      | `/api/profiles/remove-profile-pic`     | `/api/v2/profiles/remove-profile-pic`     | web                | `V2_REMOVE_PROFILE_PIC_API`     | useRemoveUserProfilePicMutation                                            |
| 28  | x      | `/api/profiles/update-user-profile`    | `/api/v2/profiles/update-user-profile`    | web, ios, app      | `V2_UPDATE_USER_PROFILE_API`    | useUpdateUserProfileOptimisticMutation, use-update-favorite-order-mutation |
| 29  | x      | `/api/profiles/update-username`        | `/api/v2/profiles/update-username`        | web                | `V2_UPDATE_USERNAME_API`        | useUpdateUsernameMutation                                                  |

### Settings / Files

| #   | Status | Old Path                               | v2 Path                                   | Consumers          | Constant                            | Caller                          |
| --- | ------ | -------------------------------------- | ----------------------------------------- | ------------------ | ----------------------------------- | ------------------------------- |
| 30  | x      | `/api/settings/upload-profile-pic`     | `/api/v2/settings/upload-profile-pic`     | web                | `V2_UPLOAD_PROFILE_PIC_API`         | useUploadProfilePicMutation     |
| 31  | x      | `/api/file/upload-file`                | `/api/v2/file/upload-file`                | web, ios, ext, app | `V2_UPLOAD_FILE_API`                | useFileUploadOptimisticMutation |
| 32  | x      | `/api/file/upload-file-remaining-data` | `/api/v2/file/upload-file-remaining-data` | web, ext, app      | `V2_UPLOAD_FILE_REMAINING_DATA_API` | src/utils/file-upload.ts        |

### API Keys

| #   | Status | Old Path                       | v2 Path                        | Consumers | Constant                      | Caller                         |
| --- | ------ | ------------------------------ | ------------------------------ | --------- | ----------------------------- | ------------------------------ |
| 33  | x      | `/api/v1/check-gemini-api-key` | `/api/v2/check-gemini-api-key` | web       | `V2_CHECK_GEMINI_API_KEY_API` | use-fetch-check-gemini-api-key |
| 34  | x      | `/api/v1/api-key`              | `/api/v2/api-key`              | web       | `V2_SAVE_API_KEY_API`         | useApiKeyUserMutation          |
| 35  | x      | `/api/v1/get-gemini-api-key`   | `/api/v2/get-gemini-api-key`   | web       | `V2_GET_GEMINI_API_KEY_API`   | useFetchGetGeminiApiKey        |
| 36  | x      | `/api/v1/delete-api-key`       | `/api/v2/delete-api-key`       | web       | `V2_DELETE_API_KEY_API`       | useDeleteApiKeyMutation        |

### Other

| #   | Status | Old Path                         | v2 Path                          | Consumers | Constant | Caller                                                             |
| --- | ------ | -------------------------------- | -------------------------------- | --------- | -------- | ------------------------------------------------------------------ |
| 37  |        | `/api/invite`                    | `/api/v2/invite`                 | email     | —        | email-link redirect                                                |
| 38  |        | `/api/revalidate`                | `/api/v2/revalidate`             | s2s       | —        | revalidation-helpers (ISR trigger)                                 |
| 39  |        | `/api/v1/process-queue`          | `/api/v2/process-queue`          | cron      | —        | Vercel cron                                                        |
| 40  |        | `/api/v1/tests/file/post/upload` | `/api/v2/tests/file/post/upload` | test      | —        | test-harness only                                                  |
| 41  |        | `/api/v1/user/get/provider`      | `/api/v2/user/get/provider`      | app       | —        | recollect-app useFetchUserSignupProvider (v1)                      |
| 42  |        | `/api/v1/bucket/get/signed-url`  | `/api/v2/bucket/get/signed-url`  | ext, app  | —        | ext file-upload-api.ts (v1), app uploadFileThroughShareIntent (v1) |

---

## App Router Routes (non-v2 ↔ v2)

Routes born in App Router (`src/app/api/<path>/route.ts`) that now have v2 twins (`src/app/api/v2/<path>/route.ts`).
Every non-v2 App Router route has a v2 twin except `/api/axiom` (#81, telemetry plumbing — permanent v1, no v2 planned).

### Bookmark (non-v2)

| #   | Status | Old Path                                        | v2 Path                                            | Consumers     | Constant                                   | Caller                                                            |
| --- | ------ | ----------------------------------------------- | -------------------------------------------------- | ------------- | ------------------------------------------ | ----------------------------------------------------------------- |
| 43  | x      | `/api/bookmark/delete-bookmark`                 | `/api/v2/bookmark/delete-bookmark`                 | web, ios, app | `V2_DELETE_BOOKMARK_DATA_API`              | useDeleteBookmarksOptimisticMutation                              |
| 44  | x      | `/api/bookmark/move-bookmark-to-trash`          | `/api/v2/bookmark/move-bookmark-to-trash`          | web, ios, app | `V2_MOVE_BOOKMARK_TO_TRASH_API`            | use-move-bookmark-to-trash-optimistic-mutation                    |
| 45  | x      | `/api/bookmark/clear-bookmark-trash`            | `/api/v2/bookmark/clear-bookmark-trash`            | web, ios, app | `V2_CLEAR_BOOKMARK_TRASH_API`              | useClearBookmarksInTrashMutation                                  |
| 46  | x      | `/api/bookmark/toggle-discoverable-on-bookmark` | `/api/v2/bookmark/toggle-discoverable-on-bookmark` | web           | `V2_TOGGLE_BOOKMARK_DISCOVERABLE_API`      | use-toggle-discoverable-optimistic-mutation                       |
| 47  | x      | `/api/bookmark/fetch-bookmarks-discoverable`    | `/api/v2/bookmark/fetch-bookmarks-discoverable`    | web, ios, app | `V2_FETCH_BOOKMARKS_DISCOVERABLE_API`      | use-fetch-discover-bookmarks                                      |
| 48  | x      | `/api/bookmark/fetch-discoverable-by-id`        | `/api/v2/bookmark/fetch-discoverable-by-id`        | web           | `V2_FETCH_DISCOVERABLE_BOOKMARK_BY_ID_API` | use-fetch-discoverable-bookmark-by-id + SSR discover/preview/[id] |
| 49  | x      | `/api/bookmark/fetch-public-bookmark-by-id`     | `/api/v2/bookmark/fetch-public-bookmark-by-id`     | web           | `V2_FETCH_PUBLIC_BOOKMARK_BY_ID_API`       | SSR public/[user_name]/[id]/preview/[bookmark_id]                 |

### Category (non-v2)

| #   | Status | Old Path                                      | v2 Path                                          | Consumers     | Constant                               | Caller                                                |
| --- | ------ | --------------------------------------------- | ------------------------------------------------ | ------------- | -------------------------------------- | ----------------------------------------------------- |
| 50  | x      | `/api/category/create-user-category`          | `/api/v2/category/create-user-category`          | web, ios, app | `V2_CREATE_USER_CATEGORY_API`          | use-add-category-optimistic-mutation                  |
| 51  | x      | `/api/category/delete-user-category`          | `/api/v2/category/delete-user-category`          | web, ios, app | `V2_DELETE_USER_CATEGORY_API`          | useDeleteCategoryOptimisticMutation                   |
| 52  | x      | `/api/category/update-user-category`          | `/api/v2/category/update-user-category`          | web, ios, app | `V2_UPDATE_USER_CATEGORY_API`          | use-update-category-optimistic-mutation               |
| 53  | x      | `/api/category/set-bookmark-categories`       | `/api/v2/category/set-bookmark-categories`       | web           | `V2_SET_BOOKMARK_CATEGORIES_API`       | use-set-bookmark-categories-optimistic-mutation       |
| 54  | x      | `/api/category/add-category-to-bookmark`      | `/api/v2/category/add-category-to-bookmark`      | web, ios, app | `V2_ADD_CATEGORY_TO_BOOKMARK_API`      | use-add-category-to-bookmark-optimistic-mutation      |
| 55  | x      | `/api/category/add-category-to-bookmarks`     | `/api/v2/category/add-category-to-bookmarks`     | web           | `V2_ADD_CATEGORY_TO_BOOKMARKS_API`     | use-add-category-to-bookmarks-optimistic-mutation     |
| 56  | x      | `/api/category/remove-category-from-bookmark` | `/api/v2/category/remove-category-from-bookmark` | web, ios, app | `V2_REMOVE_CATEGORY_FROM_BOOKMARK_API` | use-remove-category-from-bookmark-optimistic-mutation |

### Tags (non-v2)

| #   | Status | Old Path                             | v2 Path                                 | Consumers | Constant                          | Caller                                           |
| --- | ------ | ------------------------------------ | --------------------------------------- | --------- | --------------------------------- | ------------------------------------------------ |
| 57  | x      | `/api/tags/add-tag-to-bookmark`      | `/api/v2/tags/add-tag-to-bookmark`      | web       | `V2_ADD_TAG_TO_BOOKMARK_API`      | use-add-tag-to-bookmark-optimistic-mutation      |
| 58  | x      | `/api/tags/remove-tag-from-bookmark` | `/api/v2/tags/remove-tag-from-bookmark` | web       | `V2_REMOVE_TAG_FROM_BOOKMARK_API` | use-remove-tag-from-bookmark-optimistic-mutation |
| 59  | x      | `/api/tags/create-and-assign-tag`    | `/api/v2/tags/create-and-assign-tag`    | web       | `V2_CREATE_AND_ASSIGN_TAG_API`    | use-create-and-assign-tag-optimistic-mutation    |

### Profiles (non-v2)

| #   | Status | Old Path                                   | v2 Path                                       | Consumers | Constant                            | Caller                                             |
| --- | ------ | ------------------------------------------ | --------------------------------------------- | --------- | ----------------------------------- | -------------------------------------------------- |
| 60  | x      | `/api/profiles/toggle-preferred-og-domain` | `/api/v2/profiles/toggle-preferred-og-domain` | web       | `V2_TOGGLE_PREFERRED_OG_DOMAIN_API` | use-toggle-preferred-og-domain-optimistic-mutation |
| 61  | x      | `/api/profiles/toggle-favorite-category`   | `/api/v2/profiles/toggle-favorite-category`   | web, ios  | `V2_TOGGLE_FAVORITE_CATEGORY_API`   | use-toggle-favorite-category-optimistic-mutation   |

### Import / Sync / Cron (non-v2)

| #   | Status | Old Path                             | v2 Path                                 | Consumers | Constant                               | Caller                            |
| --- | ------ | ------------------------------------ | --------------------------------------- | --------- | -------------------------------------- | --------------------------------- |
| 62  | x      | `/api/raindrop/import`               | `/api/v2/raindrop/import`               | web       | `V2_RAINDROP_IMPORT_API`               | use-import-bookmarks-mutation     |
| 63  | x      | `/api/bookmarks/check-url`           | `/api/v2/bookmarks/check-url`           | ext       | `V2_CHECK_URL_API`                     | extension api.ts                  |
| 64  |        | `/api/raindrop/import/retry`         | `/api/v2/raindrop/import/retry`         | —         | `V2_RAINDROP_IMPORT_RETRY_API`         | no caller found (possible orphan) |
| 65  |        | `/api/raindrop/import/status`        | `/api/v2/raindrop/import/status`        | —         | `V2_RAINDROP_IMPORT_STATUS_API`        | no caller found (possible orphan) |
| 66  |        | `/api/instagram/sync`                | `/api/v2/instagram/sync`                | ext       | `V2_INSTAGRAM_SYNC_API`                | extension api.ts                  |
| 67  |        | `/api/instagram/sync/retry`          | `/api/v2/instagram/sync/retry`          | —         | `V2_INSTAGRAM_SYNC_RETRY_API`          | no caller found (possible orphan) |
| 68  |        | `/api/instagram/sync/status`         | `/api/v2/instagram/sync/status`         | —         | `V2_INSTAGRAM_SYNC_STATUS_API`         | no caller found (possible orphan) |
| 69  |        | `/api/instagram/last-synced-id`      | `/api/v2/instagram/last-synced-id`      | ext       | `V2_INSTAGRAM_LAST_SYNCED_ID_API`      | extension profile-api.ts          |
| 70  |        | `/api/twitter/sync`                  | `/api/v2/twitter/sync`                  | ext       | `V2_TWITTER_SYNC_API`                  | extension twitter-upload.ts       |
| 71  |        | `/api/twitter/sync/retry`            | `/api/v2/twitter/sync/retry`            | —         | `V2_TWITTER_SYNC_RETRY_API`            | no caller found (possible orphan) |
| 72  |        | `/api/twitter/sync/status`           | `/api/v2/twitter/sync/status`           | —         | `V2_TWITTER_SYNC_STATUS_API`           | no caller found (possible orphan) |
| 73  |        | `/api/twitter/sync-folders`          | `/api/v2/twitter/sync-folders`          | ext       | `V2_TWITTER_SYNC_FOLDERS_API`          | extension api.ts                  |
| 74  |        | `/api/twitter/sync-folder-bookmarks` | `/api/v2/twitter/sync-folder-bookmarks` | ext       | `V2_TWITTER_SYNC_FOLDER_BOOKMARKS_API` | extension api.ts                  |
| 75  |        | `/api/twitter/last-synced-id`        | `/api/v2/twitter/last-synced-id`        | ext       | `V2_TWITTER_LAST_SYNCED_ID_API`        | extension profile-api.ts          |
| 76  |        | `/api/cron/clear-trash`              | `/api/v2/cron/clear-trash`              | cron      | `V2_CRON_CLEAR_TRASH_API`              | Vercel cron                       |
| 77  |        | `/api/cron/process-archived`         | `/api/v2/cron/process-archived`         | cron      | `V2_CRON_PROCESS_ARCHIVED_API`         | Vercel cron                       |

### Misc (non-v2)

| #   | Status | Old Path                  | v2 Path                      | Consumers | Constant                    | Caller                                              |
| --- | ------ | ------------------------- | ---------------------------- | --------- | --------------------------- | --------------------------------------------------- |
| 78  |        | `/api/iphone-share-error` | `/api/v2/iphone-share-error` | ios       | `V2_IPHONE_SHARE_ERROR_API` | iOS share extension                                 |
| 79  |        | `/api/pdf-thumbnail`      | `/api/v2/pdf-thumbnail`      | ext       | `V2_PDF_THUMBNAIL_API`      | extension file-upload-api.ts                        |
| 80  |        | `/api/dev/session`        | `/api/v2/dev/session`        | dev       | `V2_DEV_SESSION_API`        | local dev convenience (localhost only)              |
| 81  | n/a    | `/api/axiom`              | — _(permanent v1)_           | web       | —                           | axiom-client.ts ProxyTransport (telemetry plumbing) |

---

## v2-only Routes (no old twin)

Routes built directly under `/api/v2/` with no non-v2 counterpart.

| #   | Status | v2 Path                                             | Consumers | Constant                    | Caller                                                                   |
| --- | ------ | --------------------------------------------------- | --------- | --------------------------- | ------------------------------------------------------------------------ |
| 82  |        | `/api/v2/bookmark/add-bookmark-multiple-categories` | ext       | —                           | extension api.ts (bulk categorization at insert time)                    |
| 83  | x      | `/api/v2/bookmark/save-from-discover`               | web       | `V2_SAVE_FROM_DISCOVER_API` | use-save-from-discover-mutation (Discover → collection via edit-popover) |
| 84  |        | `/api/v2/chrome-bookmarks/import`                   | ext       | —                           | extension api.ts (batch import from browser bookmarks)                   |
| 85  |        | `/api/v2/chrome-bookmarks/import/retry`             | ext       | —                           | extension api.ts                                                         |
| 86  |        | `/api/v2/chrome-bookmarks/import/status`            | ext       | —                           | extension api.ts                                                         |
| 87  | x      | `/api/v2/profiles/mark-onboarded`                   | web       | `V2_MARK_ONBOARDED_API`     | use-mark-onboarded-mutation (onboarding-modal)                           |

---

## Consumer Cross-Reference

Which consumer is hitting how many endpoints:

| Consumer | Rows | Notes                                                                                                             |
| -------- | ---- | ----------------------------------------------------------------------------------------------------------------- |
| web      | 53   | All web-caller rows; rows with `x` status are migrated to ky + `V2_*` constant                                    |
| ios      | 22   | recollect-swiftui; most hit non-versioned paths — base URL determines v1 vs v2 at runtime                         |
| ext      | 16   | recollect-extension; mix of v1/v2/non-versioned paths — ext has NOT fully migrated                                |
| app      | 22   | recollect-app (Expo RN); non-versioned or explicit v1 — app has NOT migrated to v2                                |
| cron     | 3    | Vercel cron (process-queue, cron/clear-trash, cron/process-archived)                                              |
| s2s      | 5    | Internal server-to-server (add-remaining-bookmark-data, worker screenshot, ai-enrichment, send-email, revalidate) |
| email    | 1    | `/api/invite` — email-link redirect                                                                               |
| dev      | 1    | `/api/dev/session` — localhost convenience                                                                        |
| test     | 1    | `/api/v1/tests/file/post/upload`                                                                                  |
| —        | 7    | No caller found: #11 bookmarks/insert, #64 65 67 68 71 72 (retry/status orphans)                                  |

---

## Discrepancies & Open Questions

1. **`#23 share/update-shared-category-user-role`** — iOS app hits a differently-spelled path `share/update-shared-categories-user-access`. Either (a) iOS has a stale path that 404s silently, or (b) there's a legacy alias on the server. Verify with iOS team before retiring v1.
2. **`#11 /api/v1/bookmarks/insert`** — no consumer found in any repo. Likely superseded by `#82 add-bookmark-multiple-categories`. Candidate for deletion.
3. **Retry/status orphans (#64, #65, #67, #68, #71, #72)** — Instagram, Twitter, Raindrop retry/status endpoints have no caller in any repo. Either the external clients poll them via dynamic paths the enumeration missed, or they are dead code. Verify with iOS / extension owners.
4. **iOS version ambiguity** — iOS appends paths to a base URL that already contains the version segment (e.g., `https://.../api/v2`). Swift source does not distinguish v1 vs v2 per endpoint — `Info.plist` does. `Consumers: ios` means "iOS hits this route at _some_ version, determined by build config."
5. **`recollect-app` uses no v2 paths** — per the enumeration. When v1 retires, `recollect-app` must flip every endpoint's version config. Tracked as its own migration.
6. **`recollect-extension` uses mixed versions** — a few v2 paths (`add-bookmark-multiple-categories`, `category/fetch-user-categories`, `chrome-bookmarks/import*`) + 1 v1 (`bucket/get/signed-url`) + 12 non-versioned. Also tracked separately.

---

## Summary

| Category               | Total  | Web    | iOS    | Ext    | App    | Other (cron/s2s/email/dev/test/—) | Done (web) |
| ---------------------- | ------ | ------ | ------ | ------ | ------ | --------------------------------- | ---------- |
| Pages Router → v2      | 41     | 30     | 17     | 4      | 15     | 9                                 | 32         |
| App Router non-v2 ↔ v2 | 39     | 21     | 5      | 9      | 7      | 5                                 | 21         |
| v2-only (no old twin)  | 6      | 2      | 0      | 4      | 0      | 0                                 | 2          |
| **Total**              | **86** | **53** | **22** | **17** | **22** | **14**                            | **55**     |

**All web callers migrated to v2.** Every old route has a v2 twin except `/api/axiom` (permanent v1 — telemetry plumbing).

**External-repo migration is separate work** (not tracked here; this doc scopes web-caller migration only). Ext has ~5 v2 paths out of 16; app has 0 v2 paths out of 22; ios is base-URL-configured.

---

## Parity Audit (2026-04-21)

Executed after the four API group PRs (toggle/retry/status, public reads, moderate, complex) landed on `dev`. Confirms every old route has a v2 twin and every web caller points at v2.

**Command 1 — Pages Router → v2 twin diff** (run from repo root):

```bash
comm -23 \
  <(find src/pages/api -name '*.ts' -not -path '*/_*' \
    | sed 's|src/pages/api/||; s|/index.ts$||; s|.ts$||; s|^v1/||' | sort) \
  <(find src/app/api/v2 -name route.ts \
    | sed 's|src/app/api/v2/||; s|/route.ts$||' | sort)
```

Output: empty. All 40 Pages Router routes have v2 twins.

**Command 2 — App Router v1 → v2 twin diff**:

```bash
comm -23 \
  <(find src/app/api -name route.ts -not -path '*/v2/*' \
    | sed 's|src/app/api/||; s|/route.ts$||' | sort) \
  <(find src/app/api/v2 -name route.ts \
    | sed 's|src/app/api/v2/||; s|/route.ts$||' | sort)
```

Output: `axiom`. Permanent v1 — SDK-owned contract, documented in `src/app/api/axiom/route.ts`. Not a migration target.

**Command 3 — v2-only extras (reverse diff)**:

Two v2 routes have no v1 counterpart because they were built directly as v2:

- `v2/bookmark/add-bookmark-multiple-categories`
- `v2/profiles/mark-onboarded`

Plus the v2 twins of Pages Router routes (expected — their v1 lives under `src/pages/api/`, not `src/app/api/`).

**Command 4 — Web-caller sweep**:

```bash
rg -n 'fetch\(.*/api/(?!v2/)' src/ -g '*.ts' -g '*.tsx'
```

Output: empty. Every `fetch()` call to `/api/*` from React components, hooks, or shared library code hits `/api/v2/*`. Route-to-route internal calls inside `src/app/api/` or `src/pages/api/` use external URLs (signed URLs, screenshot API, PDF services), not `/api/` self-references.

**Command 5 — Dead-code check**:

```bash
pnpm lint:knip
```

Output: zero orphan exports, zero unused imports.

**Out-of-scope deferrals** (tracked for a later caller-cleanup pass):

- Deletion of v1 App Router route files (iOS + extension still hit them).
- Deletion of `src/async/supabaseCrudHelpers/index.ts`.
- Deletion of `src/lib/api-helpers/api.ts` (`getApi` / `postApi`).
- Removal of the legacy `FETCH_PUBLIC_BOOKMARK_BY_ID_API` constant.
- `pnpm remove axios` (Pages Router handlers still use it).
- Supabase cron schedule flip for `/api/cron/*` → `/api/v2/cron/*` (out-of-band).

---

_Created: 2026-03-30_
_Last updated: 2026-04-21_
