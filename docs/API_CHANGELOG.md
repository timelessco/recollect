
## 2026-04-11 [`ed8f502`](https://github.com/timelessco/recollect/commit/ed8f502159490339203b67f6915854844966e1cc)



### API Changes

### PATCH /v2/profiles/mark-onboarded
-  endpoint added


### PATCH /v2/profiles/mark-onboarding-complete
- :warning: api path removed without deprecation







## 2026-04-13 [`9167465`](https://github.com/timelessco/recollect/commit/91674655483bd06d4da13dec73d30e8ab6995de4)



### API Changes

### PATCH /v2/share/update-shared-category-user-role
-  added the new optional request property 'updateData/category_views'







## 2026-04-13 [`9e6bdff`](https://github.com/timelessco/recollect/commit/9e6bdfffe5da44a5cf9d691a605e0745f1047b55)



### API Changes

### PATCH /v2/category/update-category-order
- :warning: the response property '/items/category_order/items/' became nullable for the status '200'


### GET /v2/profiles/fetch-user-profile
- :warning: the response property '/items/category_order/items/' became nullable for the status '200'
-  added the required property '/items/favorite_categories' to the response with the '200' status


### PATCH /v2/profiles/update-user-profile
- :warning: the response property '/items/category_order/items/' became nullable for the status '200'






