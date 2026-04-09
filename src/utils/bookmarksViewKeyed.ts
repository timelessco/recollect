import type { BookmarkViewDataTypes, ProfilesBookmarksView } from "../types/apiTypes";

import { EVERYTHING_URL, PAGE_VIEW_SLUGS } from "./constants";

/**
 * Page key for keyed bookmarks_view: slug if in PAGE_VIEW_SLUGS, else "everything".
 */
export function getPageViewKey(slug: null | string): string {
  if (!slug) {
    return EVERYTHING_URL;
  }

  return (PAGE_VIEW_SLUGS as readonly string[]).includes(slug) ? slug : EVERYTHING_URL;
}

/**
 * Resolve view data for a page from keyed bookmarks_view.
 */
export function getPageViewData(
  bookmarksView: null | ProfilesBookmarksView | undefined,
  pageKey: string,
): BookmarkViewDataTypes | undefined {
  if (!bookmarksView || typeof bookmarksView !== "object") {
    return undefined;
  }

  return bookmarksView[pageKey] ?? bookmarksView[EVERYTHING_URL];
}
