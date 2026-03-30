
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

## 2026-03-26 [`3d75013`](https://github.com/timelessco/recollect/commit/3d75013cc975ab9206b5d3509197b6a44f69215f)


### GET /cron/clear-trash
- :warning: api removed without deprecation


### POST /cron/clear-trash
-  endpoint added




## 2026-03-27 [`80cac25`](https://github.com/timelessco/recollect/commit/80cac25b089f188684b48a542a05a3c5dd7f8ca8)


### POST /v2/ai-enrichment
-  endpoint added


### POST /v2/bookmark/add-bookmark-min-data
-  endpoint added


### POST /v2/bookmark/add-remaining-bookmark-data
-  endpoint added


### POST /v2/bookmark/add-url-screenshot
-  endpoint added


### GET /v2/bookmark/fetch-bookmarks-count
-  endpoint added


### GET /v2/bookmark/fetch-bookmarks-data
-  endpoint added


### GET /v2/bookmark/search-bookmarks
-  endpoint added


### GET /v2/category/fetch-user-categories
-  endpoint added


### POST /v2/file/upload-file
-  endpoint added


### POST /v2/file/upload-file-remaining-data
-  endpoint added


### GET /v2/invite
-  endpoint added


### POST /v2/profiles/delete-user
-  endpoint added


### POST /v2/screenshot
-  endpoint added


### POST /v2/settings/upload-profile-pic
-  endpoint added


### POST /v2/share/send-collaboration-email
-  endpoint added


### POST /v2/share/send-email
-  endpoint added


### POST /v2/tests/file/post/upload
-  endpoint added




## 2026-03-28 [`465c70a`](https://github.com/timelessco/recollect/commit/465c70a7048389e1a6e1004369d3bb0f351bd5a1)


### GET /v2/check-gemini-api-key
- :warning: removed the required property 'data' from the response with the '200' status
- :warning: removed the required property 'data' from the response with the '401' status
- :warning: removed the required property 'data' from the response with the '500' status
- :warning: removed the required property 'error' from the response with the '200' status
-  added the required property 'hasApiKey' to the response with the '200' status




## 2026-03-30 [`b881771`](https://github.com/timelessco/recollect/commit/b881771da379f827353c4aa5c7e368c05cbd908f)


### POST /cron/process-archived
-  endpoint added




## 2026-03-30 [`494745a`](https://github.com/timelessco/recollect/commit/494745a64815334e4c01fd202fd5ca368aa88f4a)


### GET /bookmark/fetch-bookmarks-discoverable
- :warning: response property 'data/items/meta_data/image_keywords' list-of-types was widened by adding types 'object' to media type 'application/json' of response '200'


### GET /bookmark/fetch-discoverable-by-id
- :warning: response property 'data/meta_data/image_keywords' list-of-types was widened by adding types 'object' to media type 'application/json' of response '200'


### GET /bookmark/fetch-public-bookmark-by-id
- :warning: response property 'data/meta_data/image_keywords' list-of-types was widened by adding types 'object' to media type 'application/json' of response '200'




## 2026-03-30 [`5bb13dc`](https://github.com/timelessco/recollect/commit/5bb13dc257073d94676ee5ca906b92809df6b1ea)


### GET /bookmark/fetch-bookmarks-discoverable
-  response property 'data/items/meta_data/image_keywords' list-of-types was narrowed by removing types 'object' from media type 'application/json' of response '200'


### GET /bookmark/fetch-discoverable-by-id
-  response property 'data/meta_data/image_keywords' list-of-types was narrowed by removing types 'object' from media type 'application/json' of response '200'


### GET /bookmark/fetch-public-bookmark-by-id
-  response property 'data/meta_data/image_keywords' list-of-types was narrowed by removing types 'object' from media type 'application/json' of response '200'




## 2026-03-30 [`0fb8d10`](https://github.com/timelessco/recollect/commit/0fb8d109c297a55ae4a7d2b9a8a62deb7691e685)


### GET /v2/bucket/get/signed-url
-  endpoint added



