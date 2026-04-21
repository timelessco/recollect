
## 2026-04-15 [`dc9e262`](https://github.com/timelessco/recollect/commit/dc9e2621e559d35e3879089f858eaeb72b8ece91)



### API Changes

### GET /bookmark/fetch-bookmarks-discoverable
- :warning: removed the required property 'data/items/category_id' from the response with the '200' status


### GET /bookmark/fetch-discoverable-by-id
- :warning: removed the required property 'data/category_id' from the response with the '200' status


### POST /v2/bookmark/add-bookmark-min-data
- :warning: removed the required property '/items/category_id' from the response with the '200' status


### GET /v2/bookmark/fetch-bookmarks-data
- :warning: removed the required property '/items/category_id' from the response with the '200' status


### GET /v2/bookmarks/get/fetch-by-id
- :warning: removed the required property '/items/category_id' from the response with the '200' status







## 2026-04-15 [`31d697d`](https://github.com/timelessco/recollect/commit/31d697dc854f6480e88e6f3902fe8423ccd97c35)



### API Changes

### POST /v2/profiles/toggle-favorite-category
-  endpoint added







## 2026-04-15 [`61b67f6`](https://github.com/timelessco/recollect/commit/61b67f6a26a8bbe9fcbb422eec80bd60cf403e62)



### API Changes

### POST /v2/instagram/last-synced-id
-  endpoint added







## 2026-04-15 [`b7d0282`](https://github.com/timelessco/recollect/commit/b7d02829cfd217b8868b90a0314ea3599754ad15)



### API Changes

### GET /v2/twitter/sync/status
-  endpoint added







## 2026-04-15 [`9065e88`](https://github.com/timelessco/recollect/commit/9065e886487b70b92746ffd70be95ca2e09886f3)



### API Changes

### PATCH /v2/profiles/update-user-profile
- :warning: the 'updateData/display_name' request property's minLength was increased from '0' to '1'
- :warning: added the pattern '^[\d\sA-Za-z]+$/u' to the request property 'updateData/display_name'
- :warning: the 'updateData/display_name' request property's maxLength was set to '100'







## 2026-04-15 [`d16e1bd`](https://github.com/timelessco/recollect/commit/d16e1bd9a9d1c3b799400e466fe28c5d255b3a30)



### API Changes

### GET /bookmark/fetch-bookmarks-discoverable
-  added the required property 'data/items/user_id' to the response with the '200' status


### POST /v2/bookmark/save-from-discover
-  endpoint added







## 2026-04-15 [`c6d5fbd`](https://github.com/timelessco/recollect/commit/c6d5fbd0b1e26352352ca952f166df978664bbe0)



### API Changes

### GET /v2/bookmark/fetch-bookmarks-discoverable
-  endpoint added


### GET /v2/bookmark/fetch-discoverable-by-id
-  endpoint added


### GET /v2/bookmark/fetch-public-bookmark-by-id
-  endpoint added


### GET /v2/bookmarks/check-url
-  endpoint added


### GET /v2/dev/session
-  endpoint added


### POST /v2/pdf-thumbnail
-  endpoint added







## 2026-04-17 [`852511b`](https://github.com/timelessco/recollect/commit/852511b9cf74a0e212f4ea3f18bd15bb937a6584)



### API Changes

### GET /v2/profiles/fetch-user-profile
-  added the required property '/items/onboarded_at' to the response with the '200' status







## 2026-04-19 [`9a8b94f`](https://github.com/timelessco/recollect/commit/9a8b94f5ed60cca0cae3c0269c0948d086d2e760)



### API Changes

### POST /v2/bookmark/clear-bookmark-trash
-  endpoint added


### POST /v2/bookmark/delete-bookmark
-  endpoint added


### POST /v2/bookmark/move-bookmark-to-trash
-  endpoint added


### POST /v2/category/create-user-category
-  endpoint added


### POST /v2/category/delete-user-category
-  endpoint added


### POST /v2/category/update-user-category
-  endpoint added


### POST /v2/instagram/sync
-  endpoint added


### POST /v2/raindrop/import
-  endpoint added


### POST /v2/twitter/sync
-  endpoint added


### POST /v2/twitter/sync-folders
-  endpoint added







## 2026-04-20 [`8453023`](https://github.com/timelessco/recollect/commit/8453023f0b0a54498e73b15876bb2cb500dcf766)



### API Changes

### POST /v2/category/add-category-to-bookmark
-  endpoint added


### POST /v2/category/add-category-to-bookmarks
-  endpoint added


### POST /v2/category/remove-category-from-bookmark
-  endpoint added


### POST /v2/category/set-bookmark-categories
-  endpoint added


### POST /v2/cron/clear-trash
-  endpoint added


### POST /v2/cron/process-archived
-  endpoint added


### POST /v2/tags/add-tag-to-bookmark
-  endpoint added


### POST /v2/tags/create-and-assign-tag
-  endpoint added


### POST /v2/tags/remove-tag-from-bookmark
-  endpoint added


### POST /v2/twitter/sync-folder-bookmarks
-  endpoint added






