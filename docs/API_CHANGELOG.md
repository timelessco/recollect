
## 2026-03-22 [`b3f4ad9`](https://github.com/timelessco/recollect/commit/b3f4ad96b59991468b937f1660a6842d57bf1e55)


### POST /category/create-user-category
- :warning: changed the pattern of the request property 'icon_color' from '^#([\dA-Fa-f]{6}|[\dA-Fa-f]{3})$/u' to '^#([\dA-F]{6}|[\dA-F]{3})$/iu'




## 2026-03-23 [`9cfccef`](https://github.com/timelessco/recollect/commit/9cfccef4352688a30e93bca189a66d64fcb1503b)


### GET /v2/profiles/fetch-user-profile
-  added the required property 'data/items/last_synced_instagram_id' to the response with the '200' status
-  added the required property 'data/items/last_synced_twitter_id' to the response with the '200' status


### PATCH /v2/profiles/update-user-profile
- :warning: the 'data/items/bookmark_count' response's property type/format changed from 'integer'/'' to 'number'/'' for status '200'
- :warning: the 'data/items/category_order/items/' response's property type/format changed from 'integer'/'' to 'number'/'' for status '200'
- :warning: removed the required property 'data/items/favorite_categories' from the response with the '200' status
-  added the required property 'data/items/last_synced_instagram_id' to the response with the '200' status
-  added the required property 'data/items/last_synced_twitter_id' to the response with the '200' status




## 2026-03-23 [`a6c9726`](https://github.com/timelessco/recollect/commit/a6c97264add29ad4a370897dac37260a691bc44b)


### POST /bookmark/clear-bookmark-trash
- :warning: api path removed without deprecation


### POST /bookmark/delete-bookmark
- :warning: api path removed without deprecation


### GET /bookmark/fetch-bookmarks-discoverable
- :warning: api path removed without deprecation


### GET /bookmark/fetch-discoverable-by-id
- :warning: api path removed without deprecation


### GET /bookmark/fetch-public-bookmark-by-id
- :warning: api path removed without deprecation


### POST /bookmark/move-bookmark-to-trash
- :warning: api path removed without deprecation


### POST /bookmark/toggle-discoverable-on-bookmark
- :warning: api path removed without deprecation


### GET /bookmarks/check-url
- :warning: api path removed without deprecation


### POST /category/add-category-to-bookmark
- :warning: api path removed without deprecation


### POST /category/add-category-to-bookmarks
- :warning: api path removed without deprecation


### POST /category/create-user-category
- :warning: api path removed without deprecation


### POST /category/delete-user-category
- :warning: api path removed without deprecation


### POST /category/remove-category-from-bookmark
- :warning: api path removed without deprecation


### POST /category/set-bookmark-categories
- :warning: api path removed without deprecation


### POST /category/update-user-category
- :warning: api path removed without deprecation


### GET /cron/clear-trash
- :warning: api path removed without deprecation


### GET /dev/session
- :warning: api path removed without deprecation


### POST /instagram/last-synced-id
- :warning: api path removed without deprecation


### POST /instagram/sync
- :warning: api path removed without deprecation


### POST /instagram/sync/retry
- :warning: api path removed without deprecation


### GET /instagram/sync/status
- :warning: api path removed without deprecation


### POST /iphone-share-error
- :warning: api path removed without deprecation


### POST /pdf-thumbnail
- :warning: api path removed without deprecation


### POST /profiles/toggle-favorite-category
- :warning: api path removed without deprecation


### POST /profiles/toggle-preferred-og-domain
- :warning: api path removed without deprecation


### POST /raindrop/import
- :warning: api path removed without deprecation


### POST /raindrop/import/retry
- :warning: api path removed without deprecation


### GET /raindrop/import/status
- :warning: api path removed without deprecation


### POST /tags/add-tag-to-bookmark
- :warning: api path removed without deprecation


### POST /tags/create-and-assign-tag
- :warning: api path removed without deprecation


### POST /tags/remove-tag-from-bookmark
- :warning: api path removed without deprecation


### POST /twitter/last-synced-id
- :warning: api path removed without deprecation


### POST /twitter/sync
- :warning: api path removed without deprecation


### POST /twitter/sync-folder-bookmarks
- :warning: api path removed without deprecation


### POST /twitter/sync-folders
- :warning: api path removed without deprecation


### POST /twitter/sync/retry
- :warning: api path removed without deprecation


### GET /twitter/sync/status
- :warning: api path removed without deprecation


### PUT /v2/api-key
- :warning: api path removed without deprecation


### GET /v2/bookmark/fetch-bookmarks-view
- :warning: api path removed without deprecation


### DELETE /v2/bookmarks/delete/non-cascade
- :warning: api path removed without deprecation


### GET /v2/bookmarks/get/fetch-by-id
- :warning: api path removed without deprecation


### GET /v2/bookmarks/get/get-media-type
- :warning: api path removed without deprecation


### GET /v2/bookmarks/get/get-pdf-buffer
- :warning: api path removed without deprecation


### POST /v2/bookmarks/insert
- :warning: api path removed without deprecation


### PATCH /v2/category/update-category-order
- :warning: api path removed without deprecation


### GET /v2/check-gemini-api-key
- :warning: api path removed without deprecation


### DELETE /v2/delete-api-key
- :warning: api path removed without deprecation


### GET /v2/fetch-public-category-bookmarks
- :warning: api path removed without deprecation


### GET /v2/get-gemini-api-key
- :warning: api path removed without deprecation


### POST /v2/process-queue
- :warning: api path removed without deprecation


### GET /v2/profiles/fetch-user-profile
- :warning: api path removed without deprecation


### GET /v2/profiles/fetch-user-profile-pic
- :warning: api path removed without deprecation


### DELETE /v2/profiles/remove-profile-pic
- :warning: api path removed without deprecation


### PATCH /v2/profiles/update-user-profile
- :warning: api path removed without deprecation


### PATCH /v2/profiles/update-username
- :warning: api path removed without deprecation


### POST /v2/revalidate
- :warning: api path removed without deprecation


### DELETE /v2/share/delete-shared-categories-user
- :warning: api path removed without deprecation


### GET /v2/share/fetch-shared-categories-data
- :warning: api path removed without deprecation


### PATCH /v2/share/update-shared-category-user-role
- :warning: api path removed without deprecation


### GET /v2/tags/fetch-user-tags
- :warning: api path removed without deprecation


### GET /v2/user/get/provider
- :warning: api path removed without deprecation



