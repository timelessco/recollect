# Caller Migration Tracker

Track migration of all API callers from old patterns to v2 (ky client + v2 URLs).

**Legend:**

- **Status**: ` ` = not started, `~` = in progress, `x` = done, `n/a` = intentional (no migration planned)
- **Repo**: `web` = this repo has callers, `ext` = external only (Chrome ext, iOS, cron), `s2s` = server-to-server internal
- **URL Change**: whether the caller needs a URL path change (Pages Router → v2) or just a client change (postApi → ky)

---

## Pages Router Routes

Old Pages Router files (`src/pages/api/`) with v2 App Router equivalents (`src/app/api/v2/`).
Callers need both URL change (→ v2 path) AND client change (→ ky).

### Bookmark

| #   | Status | Old Path                                    | v2 Path                                        | Repo | Constant                     | Caller                                                                |
| --- | ------ | ------------------------------------------- | ---------------------------------------------- | ---- | ---------------------------- | --------------------------------------------------------------------- |
| 1   | x      | `/api/bookmark/add-bookmark-min-data`       | `/api/v2/bookmark/add-bookmark-min-data`       | web  | `ADD_BOOKMARK_MIN_DATA`      | supabaseCrudHelpers → useAddBookmarkMinDataOptimisticMutation         |
| 2   |        | `/api/bookmark/add-remaining-bookmark-data` | `/api/v2/bookmark/add-remaining-bookmark-data` | s2s  | `ADD_REMAINING_BOOKMARK_API` | Pages Router handler only (add-bookmark-min-data, add-url-screenshot) |
| 3   | x      | `/api/bookmark/add-url-screenshot`          | `/api/v2/bookmark/add-url-screenshot`          | web  | `ADD_URL_SCREENSHOT_API`     | supabaseCrudHelpers → useAddBookmarkScreenshotMutation                |
| 4   | x      | `/api/bookmark/fetch-bookmarks-count`       | `/api/v2/bookmark/fetch-bookmarks-count`       | web  | `FETCH_BOOKMARKS_COUNT`      | supabaseCrudHelpers → useFetchBookmarksCount                          |
| 5   | x      | `/api/bookmark/fetch-bookmarks-data`        | `/api/v2/bookmark/fetch-bookmarks-data`        | web  | `FETCH_BOOKMARKS_DATA_API`   | supabaseCrudHelpers → useFetchPaginatedBookmarks                      |
| 6   | x      | `/api/bookmark/fetch-bookmarks-view`        | `/api/v2/bookmark/fetch-bookmarks-view`        | web  | `FETCH_BOOKMARKS_VIEW`       | supabaseCrudHelpers → useFetchBookmarksView                           |
| 7   | x      | `/api/bookmark/search-bookmarks`            | `/api/v2/bookmark/search-bookmarks`            | web  | `SEARCH_BOOKMARKS`           | supabaseCrudHelpers → useSearchBookmarks                              |

### Bookmark (v1-prefixed)

| #   | Status | Old Path                               | v2 Path                                | Repo | Constant                   | Caller                                                        |
| --- | ------ | -------------------------------------- | -------------------------------------- | ---- | -------------------------- | ------------------------------------------------------------- |
| 8   | x      | `/api/v1/bookmarks/get/fetch-by-id`    | `/api/v2/bookmarks/get/fetch-by-id`    | web  | `FETCH_BOOKMARK_BY_ID_API` | supabaseCrudHelpers → useFetchBookmarkById                    |
| 9   | x      | `/api/v1/bookmarks/get/get-media-type` | `/api/v2/bookmarks/get/get-media-type` | web  | `GET_MEDIA_TYPE_API`       | supabaseCrudHelpers → useAddBookmarkMinDataOptimisticMutation |
| 10  | x      | `/api/v1/bookmarks/get/get-pdf-buffer` | `/api/v2/bookmarks/get/get-pdf-buffer` | web  | `GET_PDF_BUFFER_API`       | file-upload.ts → useFileUploadOptimisticMutation              |
| 11  |        | `/api/v1/bookmarks/insert`             | `/api/v2/bookmarks/insert`             | ext  | —                          | Chrome extension only                                         |
| 13  | x      | `/api/v1/screenshot`                   | `/api/v2/screenshot`                   | web  | `WORKER_SCREENSHOT_API`    | worker.ts (server-to-server, process-queue dispatch)          |
| 14  | x      | `/api/v1/ai-enrichment`                | `/api/v2/ai-enrichment`                | web  | `AI_ENRICHMENT_API`        | worker.ts (server-to-server, process-queue dispatch)          |

### Category

| #   | Status | Old Path                              | v2 Path                                  | Repo | Constant                    | Caller                                                         |
| --- | ------ | ------------------------------------- | ---------------------------------------- | ---- | --------------------------- | -------------------------------------------------------------- |
| 15  | x      | `/api/category/fetch-user-categories` | `/api/v2/category/fetch-user-categories` | web  | `FETCH_USER_CATEGORIES_API` | supabaseCrudHelpers → useFetchCategories                       |
| 16  | x      | `/api/category/update-category-order` | `/api/v2/category/update-category-order` | web  | `UPDATE_CATEGORY_ORDER_API` | supabaseCrudHelpers → useUpdateCategoryOrderOptimisticMutation |

### Tags

| #   | Status | Old Path                    | v2 Path                        | Repo | Constant              | Caller                                 |
| --- | ------ | --------------------------- | ------------------------------ | ---- | --------------------- | -------------------------------------- |
| 17  | x      | `/api/tags/fetch-user-tags` | `/api/v2/tags/fetch-user-tags` | web  | `FETCH_USER_TAGS_API` | supabaseCrudHelpers → useFetchUserTags |

### Share / Collaboration

| #   | Status | Old Path                                      | v2 Path                                          | Repo | Constant                               | Caller                                                            |
| --- | ------ | --------------------------------------------- | ------------------------------------------------ | ---- | -------------------------------------- | ----------------------------------------------------------------- |
| 18  | x      | `/api/fetch-public-category-bookmarks`        | `/api/v2/fetch-public-category-bookmarks`        | web  | `FETCH_PUBLIC_CATEGORY_BOOKMARKS_API`  | use-fetch-public-category-bookmarks + SSR public/[user_name]/[id] |
| 19  | x      | `/api/share/delete-shared-categories-user`    | `/api/v2/share/delete-shared-categories-user`    | web  | `DELETE_SHARED_CATEGORIES_USER_API`    | supabaseCrudHelpers → useDeleteSharedCategoriesUserMutation       |
| 20  | x      | `/api/share/fetch-shared-categories-data`     | `/api/v2/share/fetch-shared-categories-data`     | web  | `FETCH_SHARED_CATEGORIES_DATA_API`     | supabaseCrudHelpers → useFetchSharedCategories                    |
| 21  | x      | `/api/share/send-collaboration-email`         | `/api/v2/share/send-collaboration-email`         | web  | `SEND_COLLABORATION_EMAIL_API`         | supabaseCrudHelpers → useSendCollaborationEmailInviteMutation     |
| 22  |        | `/api/share/send-email`                       | `/api/v2/share/send-email`                       | s2s  | `SEND_EMAIL`                           | Pages Router handler only (send-collaboration-email)              |
| 23  | x      | `/api/share/update-shared-category-user-role` | `/api/v2/share/update-shared-category-user-role` | web  | `UPDATE_SHARED_CATEGORY_USER_ROLE_API` | supabaseCrudHelpers → useUpdateSharedCategoriesUserAccessMutation |

### Profiles

| #   | Status | Old Path                               | v2 Path                                   | Repo | Constant                     | Caller                                                                                           |
| --- | ------ | -------------------------------------- | ----------------------------------------- | ---- | ---------------------------- | ------------------------------------------------------------------------------------------------ |
| 24  | x      | `/api/profiles/delete-user`            | `/api/v2/profiles/delete-user`            | web  | `DELETE_USER_API`            | supabaseCrudHelpers → useDeleteUserMutation                                                      |
| 25  | x      | `/api/profiles/fetch-user-profile`     | `/api/v2/profiles/fetch-user-profile`     | web  | `FETCH_USER_PROFILE_API`     | supabaseCrudHelpers → useFetchUserProfile                                                        |
| 26  | x      | `/api/profiles/fetch-user-profile-pic` | `/api/v2/profiles/fetch-user-profile-pic` | web  | `FETCH_USER_PROFILE_PIC_API` | supabaseCrudHelpers → useGetUserProfilePic                                                       |
| 27  | x      | `/api/profiles/remove-profile-pic`     | `/api/v2/profiles/remove-profile-pic`     | web  | `REMOVE_PROFILE_PIC_API`     | supabaseCrudHelpers → useRemoveUserProfilePicMutation                                            |
| 28  | x      | `/api/profiles/update-user-profile`    | `/api/v2/profiles/update-user-profile`    | web  | `UPDATE_USER_PROFILE_API`    | supabaseCrudHelpers → useUpdateUserProfileOptimisticMutation, use-update-favorite-order-mutation |
| 29  | x      | `/api/profiles/update-username`        | `/api/v2/profiles/update-username`        | web  | `UPDATE_USERNAME_API`        | supabaseCrudHelpers → useUpdateUsernameMutation                                                  |

### Settings / Files

| #   | Status | Old Path                               | v2 Path                                   | Repo | Constant                         | Caller                                                |
| --- | ------ | -------------------------------------- | ----------------------------------------- | ---- | -------------------------------- | ----------------------------------------------------- |
| 30  | x      | `/api/settings/upload-profile-pic`     | `/api/v2/settings/upload-profile-pic`     | web  | `UPLOAD_PROFILE_PIC_API`         | supabaseCrudHelpers → useUploadProfilePicMutation     |
| 31  | x      | `/api/file/upload-file`                | `/api/v2/file/upload-file`                | web  | `UPLOAD_FILE_API`                | supabaseCrudHelpers → useFileUploadOptimisticMutation |
| 32  | x      | `/api/file/upload-file-remaining-data` | `/api/v2/file/upload-file-remaining-data` | web  | `UPLOAD_FILE_REMAINING_DATA_API` | file-upload.ts → useFileUploadOptimisticMutation      |

### API Keys

| #   | Status | Old Path                       | v2 Path                        | Repo | Constant             | Caller                                        |
| --- | ------ | ------------------------------ | ------------------------------ | ---- | -------------------- | --------------------------------------------- |
| 33  | x      | `/api/v1/check-gemini-api-key` | `/api/v2/check-gemini-api-key` | web  | `CHECK_API_KEY_API`  | Already migrated (v2.1 pathfinder)            |
| 34  | x      | `/api/v1/api-key`              | `/api/v2/api-key`              | web  | `SAVE_API_KEY_API`   | supabaseCrudHelpers → useApiKeyUserMutation   |
| 35  | x      | `/api/v1/get-gemini-api-key`   | `/api/v2/get-gemini-api-key`   | web  | `GET_API_KEY_API`    | supabaseCrudHelpers → useFetchGetGeminiApiKey |
| 36  | x      | `/api/v1/delete-api-key`       | `/api/v2/delete-api-key`       | web  | `DELETE_API_KEY_API` | supabaseCrudHelpers → useDeleteApiKeyMutation |

### Other

| #   | Status | Old Path                         | v2 Path                          | Repo | Constant | Caller                              |
| --- | ------ | -------------------------------- | -------------------------------- | ---- | -------- | ----------------------------------- |
| 37  |        | `/api/invite`                    | `/api/v2/invite`                 | ext  | —        | External (email link redirect)      |
| 38  |        | `/api/revalidate`                | `/api/v2/revalidate`             | ext  | —        | External (secret token ISR trigger) |
| 39  |        | `/api/v1/process-queue`          | `/api/v2/process-queue`          | ext  | —        | External cron only                  |
| 40  |        | `/api/v1/tests/file/post/upload` | `/api/v2/tests/file/post/upload` | ext  | —        | Test route only                     |
| 41  |        | `/api/v1/user/get/provider`      | `/api/v2/user/get/provider`      | ext  | —        | No known caller                     |
| 42  |        | `/api/v1/bucket/get/signed-url`  | `/api/v2/bucket/get/signed-url`  | ext  | —        | File upload internal                |

---

## App Router Routes (non-v2 ↔ v2)

Routes born in App Router (`src/app/api/<path>/route.ts`) that now have v2 twins (`src/app/api/v2/<path>/route.ts`).
Every non-v2 App Router route has a v2 twin except `/api/axiom` (#81, telemetry plumbing — permanent v1, no v2 planned).
Where the caller has migrated to the `V2_*` constant, status is `x`. Rows for routes still only consumed by iOS / Chrome extension / Vercel cron stay blank — no web migration to do.

### Bookmark (non-v2)

| #   | Status | Old Path                                        | v2 Path                                            | Repo | Constant                                   | Caller                                                            |
| --- | ------ | ----------------------------------------------- | -------------------------------------------------- | ---- | ------------------------------------------ | ----------------------------------------------------------------- |
| 43  | x      | `/api/bookmark/delete-bookmark`                 | `/api/v2/bookmark/delete-bookmark`                 | web  | `V2_DELETE_BOOKMARK_DATA_API`              | useDeleteBookmarksOptimisticMutation                              |
| 44  | x      | `/api/bookmark/move-bookmark-to-trash`          | `/api/v2/bookmark/move-bookmark-to-trash`          | web  | `V2_MOVE_BOOKMARK_TO_TRASH_API`            | use-move-bookmark-to-trash-optimistic-mutation                    |
| 45  | x      | `/api/bookmark/clear-bookmark-trash`            | `/api/v2/bookmark/clear-bookmark-trash`            | web  | `V2_CLEAR_BOOKMARK_TRASH_API`              | useClearBookmarksInTrashMutation                                  |
| 46  | x      | `/api/bookmark/toggle-discoverable-on-bookmark` | `/api/v2/bookmark/toggle-discoverable-on-bookmark` | web  | `V2_TOGGLE_BOOKMARK_DISCOVERABLE_API`      | use-toggle-discoverable-optimistic-mutation                       |
| 47  | x      | `/api/bookmark/fetch-bookmarks-discoverable`    | `/api/v2/bookmark/fetch-bookmarks-discoverable`    | web  | `V2_FETCH_BOOKMARKS_DISCOVERABLE_API`      | use-fetch-discover-bookmarks                                      |
| 48  | x      | `/api/bookmark/fetch-discoverable-by-id`        | `/api/v2/bookmark/fetch-discoverable-by-id`        | web  | `V2_FETCH_DISCOVERABLE_BOOKMARK_BY_ID_API` | use-fetch-discoverable-bookmark-by-id + SSR discover/preview/[id] |
| 49  | x      | `/api/bookmark/fetch-public-bookmark-by-id`     | `/api/v2/bookmark/fetch-public-bookmark-by-id`     | ext  | `V2_FETCH_PUBLIC_BOOKMARK_BY_ID_API`       | SSR public/[user_name]/[id]/preview/[bookmark_id]                 |

### Category (non-v2)

| #   | Status | Old Path                                      | v2 Path                                          | Repo | Constant                               | Caller                                                |
| --- | ------ | --------------------------------------------- | ------------------------------------------------ | ---- | -------------------------------------- | ----------------------------------------------------- |
| 50  | x      | `/api/category/create-user-category`          | `/api/v2/category/create-user-category`          | web  | `V2_CREATE_USER_CATEGORY_API`          | use-add-category-optimistic-mutation                  |
| 51  | x      | `/api/category/delete-user-category`          | `/api/v2/category/delete-user-category`          | web  | `V2_DELETE_USER_CATEGORY_API`          | useDeleteCategoryOptimisticMutation                   |
| 52  | x      | `/api/category/update-user-category`          | `/api/v2/category/update-user-category`          | web  | `V2_UPDATE_USER_CATEGORY_API`          | use-update-category-optimistic-mutation               |
| 53  | x      | `/api/category/set-bookmark-categories`       | `/api/v2/category/set-bookmark-categories`       | web  | `V2_SET_BOOKMARK_CATEGORIES_API`       | use-set-bookmark-categories-optimistic-mutation       |
| 54  | x      | `/api/category/add-category-to-bookmark`      | `/api/v2/category/add-category-to-bookmark`      | web  | `V2_ADD_CATEGORY_TO_BOOKMARK_API`      | use-add-category-to-bookmark-optimistic-mutation      |
| 55  | x      | `/api/category/add-category-to-bookmarks`     | `/api/v2/category/add-category-to-bookmarks`     | web  | `V2_ADD_CATEGORY_TO_BOOKMARKS_API`     | use-add-category-to-bookmarks-optimistic-mutation     |
| 56  | x      | `/api/category/remove-category-from-bookmark` | `/api/v2/category/remove-category-from-bookmark` | web  | `V2_REMOVE_CATEGORY_FROM_BOOKMARK_API` | use-remove-category-from-bookmark-optimistic-mutation |

### Tags (non-v2)

| #   | Status | Old Path                             | v2 Path                                 | Repo | Constant                          | Caller                                           |
| --- | ------ | ------------------------------------ | --------------------------------------- | ---- | --------------------------------- | ------------------------------------------------ |
| 57  | x      | `/api/tags/add-tag-to-bookmark`      | `/api/v2/tags/add-tag-to-bookmark`      | web  | `V2_ADD_TAG_TO_BOOKMARK_API`      | use-add-tag-to-bookmark-optimistic-mutation      |
| 58  | x      | `/api/tags/remove-tag-from-bookmark` | `/api/v2/tags/remove-tag-from-bookmark` | web  | `V2_REMOVE_TAG_FROM_BOOKMARK_API` | use-remove-tag-from-bookmark-optimistic-mutation |
| 59  | x      | `/api/tags/create-and-assign-tag`    | `/api/v2/tags/create-and-assign-tag`    | web  | `V2_CREATE_AND_ASSIGN_TAG_API`    | use-create-and-assign-tag-optimistic-mutation    |

### Profiles (non-v2)

| #   | Status | Old Path                                   | v2 Path                                       | Repo | Constant                            | Caller                                             |
| --- | ------ | ------------------------------------------ | --------------------------------------------- | ---- | ----------------------------------- | -------------------------------------------------- |
| 60  | x      | `/api/profiles/toggle-preferred-og-domain` | `/api/v2/profiles/toggle-preferred-og-domain` | web  | `V2_TOGGLE_PREFERRED_OG_DOMAIN_API` | use-toggle-preferred-og-domain-optimistic-mutation |
| 61  | x      | `/api/profiles/toggle-favorite-category`   | `/api/v2/profiles/toggle-favorite-category`   | web  | `V2_TOGGLE_FAVORITE_CATEGORY_API`   | use-toggle-favorite-category-optimistic-mutation   |

### Import / Sync / Cron (non-v2)

| #   | Status | Old Path                             | v2 Path                                 | Repo | Constant                               | Caller                           |
| --- | ------ | ------------------------------------ | --------------------------------------- | ---- | -------------------------------------- | -------------------------------- |
| 62  | x      | `/api/raindrop/import`               | `/api/v2/raindrop/import`               | web  | `V2_RAINDROP_IMPORT_API`               | use-import-bookmarks-mutation    |
| 63  | x      | `/api/bookmarks/check-url`           | `/api/v2/bookmarks/check-url`           | ext  | `V2_CHECK_URL_API`                     | iOS / Chrome ext (no web caller) |
| 64  |        | `/api/raindrop/import/retry`         | `/api/v2/raindrop/import/retry`         | ext  | `V2_RAINDROP_IMPORT_RETRY_API`         | ext-only (iOS / Chrome ext)      |
| 65  |        | `/api/raindrop/import/status`        | `/api/v2/raindrop/import/status`        | ext  | `V2_RAINDROP_IMPORT_STATUS_API`        | ext-only (iOS / Chrome ext)      |
| 66  |        | `/api/instagram/sync`                | `/api/v2/instagram/sync`                | ext  | `V2_INSTAGRAM_SYNC_API`                | ext-only (iOS)                   |
| 67  |        | `/api/instagram/sync/retry`          | `/api/v2/instagram/sync/retry`          | ext  | `V2_INSTAGRAM_SYNC_RETRY_API`          | ext-only (iOS / Chrome ext)      |
| 68  |        | `/api/instagram/sync/status`         | `/api/v2/instagram/sync/status`         | ext  | `V2_INSTAGRAM_SYNC_STATUS_API`         | ext-only (iOS / Chrome ext)      |
| 69  |        | `/api/instagram/last-synced-id`      | `/api/v2/instagram/last-synced-id`      | ext  | `V2_INSTAGRAM_LAST_SYNCED_ID_API`      | ext-only (iOS / Chrome ext)      |
| 70  |        | `/api/twitter/sync`                  | `/api/v2/twitter/sync`                  | ext  | `V2_TWITTER_SYNC_API`                  | ext-only (iOS)                   |
| 71  |        | `/api/twitter/sync/retry`            | `/api/v2/twitter/sync/retry`            | ext  | `V2_TWITTER_SYNC_RETRY_API`            | ext-only (iOS / Chrome ext)      |
| 72  |        | `/api/twitter/sync/status`           | `/api/v2/twitter/sync/status`           | ext  | `V2_TWITTER_SYNC_STATUS_API`           | ext-only (iOS / Chrome ext)      |
| 73  |        | `/api/twitter/sync-folders`          | `/api/v2/twitter/sync-folders`          | ext  | `V2_TWITTER_SYNC_FOLDERS_API`          | ext-only (iOS / Chrome ext)      |
| 74  |        | `/api/twitter/sync-folder-bookmarks` | `/api/v2/twitter/sync-folder-bookmarks` | ext  | `V2_TWITTER_SYNC_FOLDER_BOOKMARKS_API` | ext-only (iOS / Chrome ext)      |
| 75  |        | `/api/twitter/last-synced-id`        | `/api/v2/twitter/last-synced-id`        | ext  | `V2_TWITTER_LAST_SYNCED_ID_API`        | ext-only (iOS / Chrome ext)      |
| 76  |        | `/api/cron/clear-trash`              | `/api/v2/cron/clear-trash`              | ext  | `V2_CRON_CLEAR_TRASH_API`              | Vercel cron                      |
| 77  |        | `/api/cron/process-archived`         | `/api/v2/cron/process-archived`         | ext  | `V2_CRON_PROCESS_ARCHIVED_API`         | Vercel cron                      |

### Misc (non-v2)

| #   | Status | Old Path                  | v2 Path                      | Repo | Constant                    | Caller                                                              |
| --- | ------ | ------------------------- | ---------------------------- | ---- | --------------------------- | ------------------------------------------------------------------- |
| 78  |        | `/api/iphone-share-error` | `/api/v2/iphone-share-error` | ext  | `V2_IPHONE_SHARE_ERROR_API` | ext-only (iOS)                                                      |
| 79  |        | `/api/pdf-thumbnail`      | `/api/v2/pdf-thumbnail`      | ext  | `V2_PDF_THUMBNAIL_API`      | ext-only (iOS / Chrome ext)                                         |
| 80  |        | `/api/dev/session`        | `/api/v2/dev/session`        | ext  | `V2_DEV_SESSION_API`        | ext-only (local-dev convenience)                                    |
| 81  | n/a    | `/api/axiom`              | — _(permanent v1)_           | web  | —                           | axiom-client.ts ProxyTransport (telemetry plumbing — no v2 planned) |

---

## v2-only Routes (no old twin)

Routes built directly under `/api/v2/` with no non-v2 counterpart. These are tracked here because the "v2 family" is what external consumers (Chrome ext, iOS, web) target.

| #   | Status | v2 Path                                             | Repo | Constant                    | Caller                                                                          |
| --- | ------ | --------------------------------------------------- | ---- | --------------------------- | ------------------------------------------------------------------------------- |
| 82  |        | `/api/v2/bookmark/add-bookmark-multiple-categories` | ext  | —                           | ext-only (iOS / Chrome ext — bulk categorization at insert time)                |
| 83  | x      | `/api/v2/bookmark/save-from-discover`               | web  | `V2_SAVE_FROM_DISCOVER_API` | use-save-from-discover-mutation (Discover → user's collection via edit-popover) |
| 84  |        | `/api/v2/chrome-bookmarks/import`                   | ext  | —                           | ext-only (Chrome extension — batch import from browser bookmarks)               |
| 85  |        | `/api/v2/chrome-bookmarks/import/retry`             | ext  | —                           | ext-only (Chrome extension)                                                     |
| 86  |        | `/api/v2/chrome-bookmarks/import/status`            | ext  | —                           | ext-only (Chrome extension)                                                     |
| 87  | x      | `/api/v2/profiles/mark-onboarded`                   | web  | `V2_MARK_ONBOARDED_API`     | use-mark-onboarded-mutation (onboarding-modal)                                  |

---

## Summary

| Category               | Total  | Web Repo | External | Done   |
| ---------------------- | ------ | -------- | -------- | ------ |
| Pages Router → v2      | 41     | 30       | 11       | 32     |
| App Router non-v2 ↔ v2 | 39     | 20       | 19       | 21     |
| v2-only (no old twin)  | 6      | 2        | 4        | 2      |
| **Total**              | **86** | **52**   | **34**   | **55** |

**All web callers migrated to v2.** Every old route has a v2 twin except `/api/axiom` (permanent v1 — telemetry plumbing).

**Permanent v1:** 1 route — `#81 /api/axiom`. Telemetry proxy; no v2 planned.

---

_Created: 2026-03-30_
_Last updated: 2026-04-21_
