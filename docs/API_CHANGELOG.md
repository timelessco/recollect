
## 2026-03-12 [`fb475db`](https://github.com/timelessco/recollect/commit/fb475dbcb7e4da3860e59605fcb854f0cc8c9d5b)


### POST /category/create-user-category
-  added the new optional request property 'icon'
-  added the new optional request property 'icon_color'




## 2026-03-13 [`6e11a2e`](https://github.com/timelessco/recollect/commit/6e11a2e6ad4c684dc4c0e0cfe7bd6c56e31af194)


### POST /category/delete-user-category
- :warning: the 'category_id' request property's min was set to '0.00'
-  added the new optional request property 'keep_bookmarks'




## 2026-03-16 [`4b5467d`](https://github.com/timelessco/recollect/commit/4b5467d8ef349bb79cd02406c105c8127b439a9c)


### POST /category/update-user-category
- :warning: removed the required property 'data/items/is_favorite' from the response with the '200' status
- :warning: removed the request property 'updateData/is_favorite'


### POST /profiles/toggle-favorite-category
-  endpoint added


### PATCH /v2/profiles/update-user-profile
-  added the new optional request property 'updateData/favorite_categories'
-  added the required property 'data/items/favorite_categories' to the response with the '200' status




## 2026-03-17 [`3c66461`](https://github.com/timelessco/recollect/commit/3c6646102af2f99dd7560dc07cb2dd2b6cada0ca)


### POST /pdf-thumbnail
-  endpoint added




## 2026-03-17 [`3fa62d9`](https://github.com/timelessco/recollect/commit/3fa62d98f3df3dbf2d2c3dbb6cba8a16ccafd1c3)


### POST /instagram/last-synced-id
-  api tag 'Instagram' added


### POST /profiles/toggle-favorite-category
-  api tag 'Profiles' added


### POST /twitter/last-synced-id
-  api tag 'Twitter' added



