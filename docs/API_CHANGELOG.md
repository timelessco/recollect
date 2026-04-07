
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




## 2026-03-31 [`627d5f1`](https://github.com/timelessco/recollect/commit/627d5f126ae525e31b047f1e28f6818e21d484d4)



### API Changes

### GET /bookmark/fetch-bookmarks-discoverable
- :warning: response property 'data/items/meta_data/image_keywords' list-of-types was widened by adding types 'object' to media type 'application/json' of response '200'


### GET /bookmark/fetch-discoverable-by-id
- :warning: response property 'data/meta_data/image_keywords' list-of-types was widened by adding types 'object' to media type 'application/json' of response '200'


### GET /bookmark/fetch-public-bookmark-by-id
- :warning: response property 'data/meta_data/image_keywords' list-of-types was widened by adding types 'object' to media type 'application/json' of response '200'







## 2026-03-31 [`a59b623`](https://github.com/timelessco/recollect/commit/a59b6235899341f8434e0cff849915a19e46fa56)



### API Changes

### GET /bookmark/fetch-bookmarks-discoverable
-  added the optional property 'data/items/meta_data/image_keywords/anyOf[subschema #2]/color' to the response with the '200' status
-  added the optional property 'data/items/meta_data/image_keywords/anyOf[subschema #2]/features' to the response with the '200' status
-  added the optional property 'data/items/meta_data/image_keywords/anyOf[subschema #2]/object' to the response with the '200' status
-  added the optional property 'data/items/meta_data/image_keywords/anyOf[subschema #2]/people' to the response with the '200' status
-  added the optional property 'data/items/meta_data/image_keywords/anyOf[subschema #2]/place' to the response with the '200' status
-  added the optional property 'data/items/meta_data/image_keywords/anyOf[subschema #2]/type' to the response with the '200' status


### GET /bookmark/fetch-discoverable-by-id
-  added the optional property 'data/meta_data/image_keywords/anyOf[subschema #2]/color' to the response with the '200' status
-  added the optional property 'data/meta_data/image_keywords/anyOf[subschema #2]/features' to the response with the '200' status
-  added the optional property 'data/meta_data/image_keywords/anyOf[subschema #2]/object' to the response with the '200' status
-  added the optional property 'data/meta_data/image_keywords/anyOf[subschema #2]/people' to the response with the '200' status
-  added the optional property 'data/meta_data/image_keywords/anyOf[subschema #2]/place' to the response with the '200' status
-  added the optional property 'data/meta_data/image_keywords/anyOf[subschema #2]/type' to the response with the '200' status


### GET /bookmark/fetch-public-bookmark-by-id
-  added the optional property 'data/meta_data/image_keywords/anyOf[subschema #2]/color' to the response with the '200' status
-  added the optional property 'data/meta_data/image_keywords/anyOf[subschema #2]/features' to the response with the '200' status
-  added the optional property 'data/meta_data/image_keywords/anyOf[subschema #2]/object' to the response with the '200' status
-  added the optional property 'data/meta_data/image_keywords/anyOf[subschema #2]/people' to the response with the '200' status
-  added the optional property 'data/meta_data/image_keywords/anyOf[subschema #2]/place' to the response with the '200' status
-  added the optional property 'data/meta_data/image_keywords/anyOf[subschema #2]/type' to the response with the '200' status







## 2026-03-31 [`6a9c74d`](https://github.com/timelessco/recollect/commit/6a9c74db141c55a519f126b28c750377c446b110)


No changes



## 2026-03-31 [`acfef40`](https://github.com/timelessco/recollect/commit/acfef4015f1f0543fe1cf2490f9fefa79f6685e9)



### API Changes

### DELETE /v2/bookmarks/delete/non-cascade
- :warning: api path removed without deprecation







## 2026-03-31 [`8a73332`](https://github.com/timelessco/recollect/commit/8a733321103941f4f61ea37ea81fc068fa0a4924)


No changes



## 2026-03-31 [`2d4ec3c`](https://github.com/timelessco/recollect/commit/2d4ec3c8bb86ba09db1807e7acf6f6d4c9e2b980)


No changes



## 2026-03-31 [`08fd5f6`](https://github.com/timelessco/recollect/commit/08fd5f611b86711b3d2de1da60f399f0e32edaa1)


No changes



## 2026-03-31 [`51e673c`](https://github.com/timelessco/recollect/commit/51e673ce261f18c8a2b956d5a881cae0ea998719)


No changes



## 2026-03-31 [`1dd94a9`](https://github.com/timelessco/recollect/commit/1dd94a9096700ebbd7f0d137994d4fa46a57640e)


No changes



## 2026-04-01 [`493f9a3`](https://github.com/timelessco/recollect/commit/493f9a3091cdd4f9c450792b94412c5e5ad5dcd9)


No changes



## 2026-04-01 [`c398981`](https://github.com/timelessco/recollect/commit/c39898107f13956c22848ede32f7a9a0c9b1d3aa)


No changes



## 2026-04-01 [`7e457ba`](https://github.com/timelessco/recollect/commit/7e457ba547e2789c541164ac7ccf6630eca5c63d)



### API Changes

### GET /bookmark/fetch-bookmarks-discoverable
- :warning: the 'data/items/meta_data/image_keywords/anyOf[subschema #2]/color' response's property type/format changed from 'array'/'' to 'object'/'' for status '200'
-  added the required property 'data/items/meta_data/image_keywords/anyOf[subschema #2]/color/primary_color' to the response with the '200' status
-  added the required property 'data/items/meta_data/image_keywords/anyOf[subschema #2]/color/secondary_colors' to the response with the '200' status


### GET /bookmark/fetch-discoverable-by-id
- :warning: the 'data/meta_data/image_keywords/anyOf[subschema #2]/color' response's property type/format changed from 'array'/'' to 'object'/'' for status '200'
-  added the required property 'data/meta_data/image_keywords/anyOf[subschema #2]/color/primary_color' to the response with the '200' status
-  added the required property 'data/meta_data/image_keywords/anyOf[subschema #2]/color/secondary_colors' to the response with the '200' status


### GET /bookmark/fetch-public-bookmark-by-id
- :warning: the 'data/meta_data/image_keywords/anyOf[subschema #2]/color' response's property type/format changed from 'array'/'' to 'object'/'' for status '200'
-  added the required property 'data/meta_data/image_keywords/anyOf[subschema #2]/color/primary_color' to the response with the '200' status
-  added the required property 'data/meta_data/image_keywords/anyOf[subschema #2]/color/secondary_colors' to the response with the '200' status







## 2026-04-01 [`82768e3`](https://github.com/timelessco/recollect/commit/82768e3a2cbb895494d565407fdec915891263e1)


No changes



## 2026-04-01 [`00c107d`](https://github.com/timelessco/recollect/commit/00c107d5f1d2a75d6d9a82a2eb15c34c8f5625b4)


No changes



## 2026-04-01 [`4221439`](https://github.com/timelessco/recollect/commit/42214394db37a9439e44177bf6526ef251639e73)



### API Changes

### POST /v2/chrome-bookmarks/import
-  endpoint added


### POST /v2/chrome-bookmarks/import/retry
-  endpoint added


### GET /v2/chrome-bookmarks/import/status
-  endpoint added







## 2026-04-01 [`053d219`](https://github.com/timelessco/recollect/commit/053d219ca55da7644941ade2fd1309d22d2b979f)


No changes



## 2026-04-01 [`2859a3e`](https://github.com/timelessco/recollect/commit/2859a3e939e7c41d9777707901bb2545a8204bba)


No changes



## 2026-04-01 [`5d0d77a`](https://github.com/timelessco/recollect/commit/5d0d77af19d61afcbf85922aa17105b4134b9016)


No changes



## 2026-04-01 [`5bb733a`](https://github.com/timelessco/recollect/commit/5bb733acd7be7ddcd81545c11cc9c00a61ba57eb)


No changes



## 2026-04-01 [`dd13972`](https://github.com/timelessco/recollect/commit/dd13972571440bd9c1a247793c908b36c2f474db)


No changes



## 2026-04-01 [`af43922`](https://github.com/timelessco/recollect/commit/af439220cb443758cedee7248829e24d1d35a991)


No changes



## 2026-04-01 [`8783dea`](https://github.com/timelessco/recollect/commit/8783dea0891bd3380e14be0b5a71f8ce99abbda6)


No changes



## 2026-04-01 [`060e20c`](https://github.com/timelessco/recollect/commit/060e20c88ae4dad9e441d8a0bed5d931339810cc)


No changes



## 2026-04-01 [`4e27f81`](https://github.com/timelessco/recollect/commit/4e27f8188b7a537f74fdde7172cdf3640007ac16)


No changes



## 2026-04-02 [`2db8ccf`](https://github.com/timelessco/recollect/commit/2db8ccfe38e0f4709b2dbd457842846d3863d84b)


No changes



## 2026-04-02 [`37a64b7`](https://github.com/timelessco/recollect/commit/37a64b773cdee280a38abc3467df32747b7a8d45)



### API Changes

### POST /v2/bookmark/add-bookmark-multiple-categories
-  endpoint added







## 2026-04-06 [`37289ee`](https://github.com/timelessco/recollect/commit/37289ee82c5c42198ea28f2148358f6400f9c487)


No changes



## 2026-04-07 [`ba454b7`](https://github.com/timelessco/recollect/commit/ba454b7b2ddb84b60c4319b2253e664a869bdb05)


No changes



## 2026-04-07 [`e64b786`](https://github.com/timelessco/recollect/commit/e64b786f0e01ece662f4d0eb0573ddc324dab73f)


No changes



## 2026-04-07 [`3def7a9`](https://github.com/timelessco/recollect/commit/3def7a91028f3ff030c0de831226570041ee4960)


No changes



## 2026-04-07 [`ce16beb`](https://github.com/timelessco/recollect/commit/ce16beb7743adc4734b879826b856b18b8c281f7)


No changes


