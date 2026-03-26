import { isNil } from "lodash";

import type { SingleListData } from "@/types/apiTypes";

export type BookmarkAnimationState = "complete" | "entering" | "loaded" | "none" | "processing";

/**
 * Derives the animation state for a bookmark based on store state.
 * Used by animation wrapper and card components to determine which
 * animations to apply.
 */
export function getBookmarkAnimationState(
  post: SingleListData,
  animatingUrls: Set<string>,
  loadingIds: Set<number>,
): BookmarkAnimationState {
  if (!animatingUrls.has(post.url)) {
    return "none";
  }

  // Optimistic entry — no server data yet
  if (isNil(post.id)) {
    return "entering";
  }

  // Screenshot or thumbnail is being generated
  if (loadingIds.has(post.id)) {
    return "processing";
  }

  // Has an image ready for blur-up reveal
  if (post.ogImage || post.meta_data?.ogImgBlurUrl) {
    return "complete";
  }

  // Min-data arrived but no image yet
  return "loaded";
}
