import { produce } from "immer";

import type { PaginatedBookmarks, SingleListData, UserTagsData } from "@/types/apiTypes";
import type { Draft } from "immer";

import { logCacheMiss } from "@/utils/cache-debug-helpers";

/**
 * Update a specific bookmark within paginated infinite query data using Immer.
 * Returns new data with the bookmark updated, or unchanged if not found.
 * @param data - The paginated bookmarks data
 * @param bookmarkId - The ID of the bookmark to update
 * @param updater - Function that mutates the bookmark (Immer handles immutability)
 */
export function updateBookmarkInPaginatedData(
  data: PaginatedBookmarks | undefined,
  bookmarkId: number,
  updater: (bookmark: Draft<SingleListData>) => void,
): PaginatedBookmarks | undefined {
  if (!data?.pages) {
    return data;
  }

  let bookmarkFound = false;

  const result = produce(data, (draft) => {
    for (const page of draft.pages) {
      // Skip undefined pages
      if (!page) {
        continue;
      }

      const bookmark = page.find((bm) => bm.id === bookmarkId);
      if (bookmark) {
        updater(bookmark);
        bookmarkFound = true;
        // Early exit after bookmark found and updated
        return;
      }
    }
  });

  if (!bookmarkFound) {
    logCacheMiss("Cache Update", "Bookmark not found in paginated cache", {
      bookmarkId,
      pageCount: data.pages.length,
    });
  }

  return result;
}

/**
 * Swap a temp tag ID with the real tag from server response.
 * Use inside an Immer updater function.
 * @param bookmark - Draft bookmark from Immer
 * @param tempId - The temporary ID used for optimistic update
 * @param realTag - The real tag data from server response
 * @param realTag.id - The real tag ID
 * @param realTag.name - The real tag name
 * @returns true if temp tag was found and swapped, false otherwise
 */
export function swapTempTagId(
  bookmark: Draft<SingleListData>,
  tempId: number,
  realTag: { id: number; name: null | string },
): boolean {
  const tag = bookmark.addedTags?.find((existing) => existing.id === tempId);
  if (tag) {
    tag.id = realTag.id;
    tag.name = realTag.name ?? tag.name;
    return true;
  }

  logCacheMiss("Cache Update", "Temp tag not found in bookmark", {
    bookmarkId: bookmark.id,
    existingTagIds: bookmark.addedTags?.map((t) => t.id) ?? [],
    realTagId: realTag.id,
    tempId,
  });
  return false;
}

/**
 * Update user tags cache with Immer.
 * Replaces a temp tag with real tag data from server.
 * @param data - The user tags cache data
 * @param tempId - The temporary ID to replace
 * @param realTag - The real tag data from server
 * @param realTag.id - The real tag ID
 * @param realTag.name - The real tag name
 * @param [realTag.user_id] - The user ID (optional)
 * @param [realTag.created_at] - The creation timestamp (optional)
 */
export function swapTempTagInUserTagsCache(
  data: UserTagsData[] | undefined,
  tempId: number,
  realTag: {
    created_at?: string;
    id: number;
    name: null | string;
    user_id?: string;
  },
): UserTagsData[] | undefined {
  if (!data) {
    return data;
  }

  return produce(data, (draft) => {
    const tag = draft.find((existing) => existing.id === tempId);
    if (!tag) {
      logCacheMiss("Cache Update", "Temp tag not found in user tags cache", {
        tagCount: draft.length,
        tempId,
      });
      return;
    }

    tag.id = realTag.id;
    tag.name = realTag.name ?? tag.name;
    if (realTag.user_id) {
      tag.user_id = realTag.user_id;
    }

    if (realTag.created_at) {
      tag.created_at = realTag.created_at;
    }
  });
}
