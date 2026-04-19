---
paths:
  - "src/async/**"
  - "**/use-*mutation*.ts"
---

## React Query / Caching

Paginated and search caches both use `PaginatedBookmarks` (bare `SingleListData[][]` pages). Search query key 3rd segment: always `buildSearchCategorySegment(CATEGORY_ID)` from `use-bookmark-mutation-context.ts` — never `searchSlugKey(categoryData)` (fails on cold loads). `secondaryQueryKey` only supported by `useReactQueryOptimisticMutation`; raw `useMutation` hooks rely on broad `[BOOKMARKS_KEY, userId]` invalidation.
