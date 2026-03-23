
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



