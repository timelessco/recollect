# Caller Migration Tracker

Track migration of all API callers from old patterns to v2 (ky client + v2 URLs).

**Legend:**

- **Status**: ` ` = not started, `~` = in progress, `x` = done
- **Repo**: `web` = this repo has callers, `ext` = external only (Chrome ext, iOS, cron), `s2s` = server-to-server internal
- **URL Change**: whether the caller needs a URL path change (Pages Router → v2) or just a client change (postApi → ky)

---

## Pages Router Routes

Old Pages Router files (`src/pages/api/`) with v2 App Router equivalents (`src/app/api/v2/`).
Callers need both URL change (→ v2 path) AND client change (→ ky).

### Bookmark

| #   | Status | Old Path                                    | v2 Path                                        | Repo | Constant                     | Caller                                                                |
| --- | ------ | ------------------------------------------- | ---------------------------------------------- | ---- | ---------------------------- | --------------------------------------------------------------------- |
| 1   |        | `/api/bookmark/add-bookmark-min-data`       | `/api/v2/bookmark/add-bookmark-min-data`       | web  | `ADD_BOOKMARK_MIN_DATA`      | supabaseCrudHelpers → useAddBookmarkMinDataOptimisticMutation         |
| 2   |        | `/api/bookmark/add-remaining-bookmark-data` | `/api/v2/bookmark/add-remaining-bookmark-data` | s2s  | `ADD_REMAINING_BOOKMARK_API` | Pages Router handler only (add-bookmark-min-data, add-url-screenshot) |
| 3   |        | `/api/bookmark/add-url-screenshot`          | `/api/v2/bookmark/add-url-screenshot`          | web  | `ADD_URL_SCREENSHOT_API`     | supabaseCrudHelpers → useAddBookmarkScreenshotMutation                |
| 4   |        | `/api/bookmark/fetch-bookmarks-count`       | `/api/v2/bookmark/fetch-bookmarks-count`       | web  | `FETCH_BOOKMARKS_COUNT`      | supabaseCrudHelpers → useFetchBookmarksCount                          |
| 5   |        | `/api/bookmark/fetch-bookmarks-data`        | `/api/v2/bookmark/fetch-bookmarks-data`        | web  | `FETCH_BOOKMARKS_DATA_API`   | supabaseCrudHelpers → useFetchPaginatedBookmarks                      |
| 6   |        | `/api/bookmark/fetch-bookmarks-view`        | `/api/v2/bookmark/fetch-bookmarks-view`        | web  | `FETCH_BOOKMARKS_VIEW`       | supabaseCrudHelpers → useFetchBookmarksView                           |
| 7   |        | `/api/bookmark/search-bookmarks`            | `/api/v2/bookmark/search-bookmarks`            | web  | `SEARCH_BOOKMARKS`           | supabaseCrudHelpers → useSearchBookmarks                              |

### Bookmark (v1-prefixed)

| #   | Status | Old Path                               | v2 Path                                | Repo | Constant                   | Caller                                                        |
| --- | ------ | -------------------------------------- | -------------------------------------- | ---- | -------------------------- | ------------------------------------------------------------- |
| 8   |        | `/api/v1/bookmarks/get/fetch-by-id`    | `/api/v2/bookmarks/get/fetch-by-id`    | web  | `FETCH_BOOKMARK_BY_ID_API` | supabaseCrudHelpers → useFetchBookmarkById                    |
| 9   |        | `/api/v1/bookmarks/get/get-media-type` | `/api/v2/bookmarks/get/get-media-type` | web  | `GET_MEDIA_TYPE_API`       | supabaseCrudHelpers → useAddBookmarkMinDataOptimisticMutation |
| 10  |        | `/api/v1/bookmarks/get/get-pdf-buffer` | `/api/v2/bookmarks/get/get-pdf-buffer` | web  | `GET_PDF_BUFFER_API`       | file-upload.ts → useFileUploadOptimisticMutation              |
| 11  |        | `/api/v1/bookmarks/insert`             | `/api/v2/bookmarks/insert`             | ext  | —                          | Chrome extension only                                         |
| 13  |        | `/api/v1/screenshot`                   | `/api/v2/screenshot`                   | web  | `WORKER_SCREENSHOT_API`    | worker.ts (server-to-server, process-queue dispatch)          |
| 14  |        | `/api/v1/ai-enrichment`                | `/api/v2/ai-enrichment`                | web  | `AI_ENRICHMENT_API`        | worker.ts (server-to-server, process-queue dispatch)          |

### Category

| #   | Status | Old Path                              | v2 Path                                  | Repo | Constant                    | Caller                                                         |
| --- | ------ | ------------------------------------- | ---------------------------------------- | ---- | --------------------------- | -------------------------------------------------------------- |
| 15  |        | `/api/category/fetch-user-categories` | `/api/v2/category/fetch-user-categories` | web  | `FETCH_USER_CATEGORIES_API` | supabaseCrudHelpers → useFetchCategories                       |
| 16  |        | `/api/category/update-category-order` | `/api/v2/category/update-category-order` | web  | `UPDATE_CATEGORY_ORDER_API` | supabaseCrudHelpers → useUpdateCategoryOrderOptimisticMutation |

### Tags

| #   | Status | Old Path                    | v2 Path                        | Repo | Constant              | Caller                                 |
| --- | ------ | --------------------------- | ------------------------------ | ---- | --------------------- | -------------------------------------- |
| 17  |        | `/api/tags/fetch-user-tags` | `/api/v2/tags/fetch-user-tags` | web  | `FETCH_USER_TAGS_API` | supabaseCrudHelpers → useFetchUserTags |

### Share / Collaboration

| #   | Status | Old Path                                      | v2 Path                                          | Repo | Constant                               | Caller                                                            |
| --- | ------ | --------------------------------------------- | ------------------------------------------------ | ---- | -------------------------------------- | ----------------------------------------------------------------- |
| 18  |        | `/api/fetch-public-category-bookmarks`        | `/api/v2/fetch-public-category-bookmarks`        | web  | `FETCH_PUBLIC_CATEGORY_BOOKMARKS_API`  | use-fetch-public-category-bookmarks + SSR public/[user_name]/[id] |
| 19  |        | `/api/share/delete-shared-categories-user`    | `/api/v2/share/delete-shared-categories-user`    | web  | `DELETE_SHARED_CATEGORIES_USER_API`    | supabaseCrudHelpers → useDeleteSharedCategoriesUserMutation       |
| 20  |        | `/api/share/fetch-shared-categories-data`     | `/api/v2/share/fetch-shared-categories-data`     | web  | `FETCH_SHARED_CATEGORIES_DATA_API`     | supabaseCrudHelpers → useFetchSharedCategories                    |
| 21  |        | `/api/share/send-collaboration-email`         | `/api/v2/share/send-collaboration-email`         | web  | `SEND_COLLABORATION_EMAIL_API`         | supabaseCrudHelpers → useSendCollaborationEmailInviteMutation     |
| 22  |        | `/api/share/send-email`                       | `/api/v2/share/send-email`                       | s2s  | `SEND_EMAIL`                           | Pages Router handler only (send-collaboration-email)              |
| 23  |        | `/api/share/update-shared-category-user-role` | `/api/v2/share/update-shared-category-user-role` | web  | `UPDATE_SHARED_CATEGORY_USER_ROLE_API` | supabaseCrudHelpers → useUpdateSharedCategoriesUserAccessMutation |

### Profiles

| #   | Status | Old Path                               | v2 Path                                   | Repo | Constant                     | Caller                                                                                           |
| --- | ------ | -------------------------------------- | ----------------------------------------- | ---- | ---------------------------- | ------------------------------------------------------------------------------------------------ |
| 24  |        | `/api/profiles/delete-user`            | `/api/v2/profiles/delete-user`            | web  | `DELETE_USER_API`            | supabaseCrudHelpers → useDeleteUserMutation                                                      |
| 25  |        | `/api/profiles/fetch-user-profile`     | `/api/v2/profiles/fetch-user-profile`     | web  | `FETCH_USER_PROFILE_API`     | supabaseCrudHelpers → useFetchUserProfile                                                        |
| 26  |        | `/api/profiles/fetch-user-profile-pic` | `/api/v2/profiles/fetch-user-profile-pic` | web  | `FETCH_USER_PROFILE_PIC_API` | supabaseCrudHelpers → useGetUserProfilePic                                                       |
| 27  |        | `/api/profiles/remove-profile-pic`     | `/api/v2/profiles/remove-profile-pic`     | web  | `REMOVE_PROFILE_PIC_API`     | supabaseCrudHelpers → useRemoveUserProfilePicMutation                                            |
| 28  |        | `/api/profiles/update-user-profile`    | `/api/v2/profiles/update-user-profile`    | web  | `UPDATE_USER_PROFILE_API`    | supabaseCrudHelpers → useUpdateUserProfileOptimisticMutation, use-update-favorite-order-mutation |
| 29  |        | `/api/profiles/update-username`        | `/api/v2/profiles/update-username`        | web  | `UPDATE_USERNAME_API`        | supabaseCrudHelpers → useUpdateUsernameMutation                                                  |

### Settings / Files

| #   | Status | Old Path                               | v2 Path                                   | Repo | Constant                         | Caller                                                |
| --- | ------ | -------------------------------------- | ----------------------------------------- | ---- | -------------------------------- | ----------------------------------------------------- |
| 30  |        | `/api/settings/upload-profile-pic`     | `/api/v2/settings/upload-profile-pic`     | web  | `UPLOAD_PROFILE_PIC_API`         | supabaseCrudHelpers → useUploadProfilePicMutation     |
| 31  |        | `/api/file/upload-file`                | `/api/v2/file/upload-file`                | web  | `UPLOAD_FILE_API`                | supabaseCrudHelpers → useFileUploadOptimisticMutation |
| 32  |        | `/api/file/upload-file-remaining-data` | `/api/v2/file/upload-file-remaining-data` | web  | `UPLOAD_FILE_REMAINING_DATA_API` | file-upload.ts → useFileUploadOptimisticMutation      |

### API Keys

| #   | Status | Old Path                       | v2 Path                        | Repo | Constant             | Caller                                        |
| --- | ------ | ------------------------------ | ------------------------------ | ---- | -------------------- | --------------------------------------------- |
| 33  | x      | `/api/v1/check-gemini-api-key` | `/api/v2/check-gemini-api-key` | web  | `CHECK_API_KEY_API`  | Already migrated (v2.1 pathfinder)            |
| 34  |        | `/api/v1/api-key`              | `/api/v2/api-key`              | web  | `SAVE_API_KEY_API`   | supabaseCrudHelpers → useApiKeyUserMutation   |
| 35  |        | `/api/v1/get-gemini-api-key`   | `/api/v2/get-gemini-api-key`   | web  | `GET_API_KEY_API`    | supabaseCrudHelpers → useFetchGetGeminiApiKey |
| 36  |        | `/api/v1/delete-api-key`       | `/api/v2/delete-api-key`       | web  | `DELETE_API_KEY_API` | supabaseCrudHelpers → useDeleteApiKeyMutation |

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

## App Router Routes (non-v2)

Routes already in App Router (`src/app/api/`) but NOT under `/v2/`.
These don't have v2 equivalents — they were built directly in App Router.
Callers need client change only (postApi/axios → ky), NO URL change.

### Bookmark (non-v2)

| #   | Status | Path                                            | Repo | Constant                                | Caller                                                               |
| --- | ------ | ----------------------------------------------- | ---- | --------------------------------------- | -------------------------------------------------------------------- |
| 43  |        | `/api/bookmark/delete-bookmark`                 | web  | `DELETE_BOOKMARK_DATA_API`              | supabaseCrudHelpers → useDeleteBookmarksOptimisticMutation           |
| 44  |        | `/api/bookmark/move-bookmark-to-trash`          | web  | `MOVE_BOOKMARK_TO_TRASH_API`            | supabaseCrudHelpers → use-move-bookmark-to-trash-optimistic-mutation |
| 45  |        | `/api/bookmark/clear-bookmark-trash`            | web  | `CLEAR_BOOKMARK_TRASH_API`              | supabaseCrudHelpers → useClearBookmarksInTrashMutation               |
| 46  |        | `/api/bookmark/toggle-discoverable-on-bookmark` | web  | `TOGGLE_BOOKMARK_DISCOVERABLE_API`      | use-toggle-discoverable-optimistic-mutation                          |
| 47  |        | `/api/bookmark/fetch-bookmarks-discoverable`    | web  | `FETCH_BOOKMARKS_DISCOVERABLE_API`      | use-fetch-discover-bookmarks                                         |
| 48  |        | `/api/bookmark/fetch-discoverable-by-id`        | web  | `FETCH_DISCOVERABLE_BOOKMARK_BY_ID_API` | use-fetch-discoverable-bookmark-by-id + SSR discover/preview/[id]    |
| 49  |        | `/api/bookmark/fetch-public-bookmark-by-id`     | web  | `FETCH_PUBLIC_BOOKMARK_BY_ID_API`       | SSR public/[user_name]/[id]/preview/[bookmark_id]                    |

### Category (non-v2)

| #   | Status | Path                                          | Repo | Constant                            | Caller                                                    |
| --- | ------ | --------------------------------------------- | ---- | ----------------------------------- | --------------------------------------------------------- |
| 50  |        | `/api/category/create-user-category`          | web  | `CREATE_USER_CATEGORIES_API`        | use-add-category-optimistic-mutation                      |
| 51  |        | `/api/category/delete-user-category`          | web  | `DELETE_USER_CATEGORIES_API`        | supabaseCrudHelpers → useDeleteCategoryOptimisticMutation |
| 52  |        | `/api/category/update-user-category`          | web  | `UPDATE_USER_CATEGORIES_API`        | use-update-category-optimistic-mutation                   |
| 53  |        | `/api/category/set-bookmark-categories`       | web  | `SET_BOOKMARK_CATEGORIES_API`       | use-set-bookmark-categories-optimistic-mutation           |
| 54  |        | `/api/category/add-category-to-bookmark`      | web  | `ADD_CATEGORY_TO_BOOKMARK_API`      | use-add-category-to-bookmark-optimistic-mutation          |
| 55  |        | `/api/category/add-category-to-bookmarks`     | web  | `ADD_CATEGORY_TO_BOOKMARKS_API`     | use-add-category-to-bookmarks-optimistic-mutation         |
| 56  |        | `/api/category/remove-category-from-bookmark` | web  | `REMOVE_CATEGORY_FROM_BOOKMARK_API` | use-remove-category-from-bookmark-optimistic-mutation     |

### Tags (non-v2)

| #   | Status | Path                                 | Repo | Constant                       | Caller                                           |
| --- | ------ | ------------------------------------ | ---- | ------------------------------ | ------------------------------------------------ |
| 57  |        | `/api/tags/add-tag-to-bookmark`      | web  | `ADD_TAG_TO_BOOKMARK_API`      | use-add-tag-to-bookmark-optimistic-mutation      |
| 58  |        | `/api/tags/remove-tag-from-bookmark` | web  | `REMOVE_TAG_FROM_BOOKMARK_API` | use-remove-tag-from-bookmark-optimistic-mutation |
| 59  |        | `/api/tags/create-and-assign-tag`    | web  | `CREATE_AND_ASSIGN_TAG_API`    | use-create-and-assign-tag-optimistic-mutation    |

### Profiles (non-v2)

| #   | Status | Path                                       | Repo | Constant                         | Caller                                             |
| --- | ------ | ------------------------------------------ | ---- | -------------------------------- | -------------------------------------------------- |
| 60  |        | `/api/profiles/toggle-preferred-og-domain` | web  | `TOGGLE_PREFERRED_OG_DOMAIN_API` | use-toggle-preferred-og-domain-optimistic-mutation |
| 61  |        | `/api/profiles/toggle-favorite-category`   | web  | `TOGGLE_FAVORITE_CATEGORY_API`   | use-toggle-favorite-category-optimistic-mutation   |

### Other (non-v2 App Router, no frontend callers in scope)

| #   | Status | Path                       | Repo | Notes                                                 |
| --- | ------ | -------------------------- | ---- | ----------------------------------------------------- |
| 62  |        | `/api/raindrop/import`     | web  | `RAINDROP_IMPORT_API` → use-import-bookmarks-mutation |
| 63  |        | `/api/bookmarks/check-url` | web  | Needs investigation                                   |
| —   |        | `/api/axiom`               | web  | Telemetry proxy — no migration needed                 |
| —   |        | `/api/cron/*`              | ext  | Vercel cron triggers                                  |
| —   |        | `/api/instagram/*`         | web  | Instagram sync routes                                 |
| —   |        | `/api/twitter/*`           | web  | Twitter sync routes                                   |
| —   |        | `/api/pdf-thumbnail`       | web  | PDF thumbnail generator                               |
| —   |        | `/api/iphone-share-error`  | ext  | iOS error reporting                                   |
| —   |        | `/api/dev/session`         | —    | Dev-only route                                        |

---

## Summary

| Category                                | Total  | Web Repo | External | Done  |
| --------------------------------------- | ------ | -------- | -------- | ----- |
| Pages Router → v2 (URL + client change) | 41     | 30       | 11       | 1     |
| App Router non-v2 (client change only)  | 21     | 19       | 2        | 0     |
| **Total**                               | **62** | **49**   | **13**   | **1** |

---

_Created: 2026-03-30_
_Last updated: 2026-03-30_
