import type { BookmarkRealtimeRow } from "./bookmark-realtime-payload";
import type { ImgMetadataType, PaginatedBookmarks, SingleListData } from "@/types/apiTypes";
import type { QueryClient } from "@tanstack/react-query";

import { BOOKMARKS_KEY } from "@/utils/constants";
import { toDbType } from "@/utils/type-utils";

/**
 * Merge enrichment-pipeline fields from a Realtime payload into an existing
 * cache entry. Preserves client-only fields (addedCategories, addedTags) and
 * server-joined fields (user_id profile shape). Merges meta_data at the field
 * level so unrelated keys set by earlier writes are retained.
 */
function mergeEnrichmentFields(existing: SingleListData, row: BookmarkRealtimeRow): SingleListData {
  const nextMetaData: ImgMetadataType = row.meta_data
    ? {
        ...existing.meta_data,
        ...toDbType(row.meta_data),
      }
    : existing.meta_data;

  return {
    ...existing,
    description:
      typeof row.description === "string" && row.description
        ? row.description
        : existing.description,
    meta_data: nextMetaData,
    ogImage: typeof row.ogImage === "string" && row.ogImage ? row.ogImage : existing.ogImage,
    title: typeof row.title === "string" && row.title ? row.title : existing.title,
  };
}

/**
 * Splice a Realtime row update into every React Query bookmark cache entry
 * that currently contains that bookmark id. Iterates all `[BOOKMARKS_KEY,
 * userId, …]` queries so paginated, search, and alternate category views stay
 * in sync.
 *
 * Never inserts — if the id isn't in a given cache entry, that entry is
 * skipped. The splice is idempotent: repeated identical payloads produce the
 * same cache state.
 *
 * @returns number of cache entries that were updated.
 */
export function spliceBookmarkAcrossCaches(
  queryClient: QueryClient,
  userId: string,
  row: BookmarkRealtimeRow,
): number {
  const entries = queryClient.getQueriesData<PaginatedBookmarks>({
    queryKey: [BOOKMARKS_KEY, userId],
  });

  let updatedCount = 0;

  for (const [queryKey, data] of entries) {
    if (!data?.pages?.length) {
      continue;
    }

    const containsId = data.pages.some((page) => page.some((bookmark) => bookmark.id === row.id));
    if (!containsId) {
      continue;
    }

    queryClient.setQueryData<PaginatedBookmarks>(queryKey, (old) => {
      if (!old) {
        return old;
      }
      return {
        ...old,
        pages: old.pages.map((page) =>
          page.map((bookmark) =>
            bookmark.id === row.id ? mergeEnrichmentFields(bookmark, row) : bookmark,
          ),
        ),
      };
    });

    updatedCount += 1;
  }

  return updatedCount;
}
