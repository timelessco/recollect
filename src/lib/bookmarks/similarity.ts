import type { SingleListData } from "@/types/apiTypes";

/**
 * A bookmark has a scoreable visual signal when its `image_keywords` payload
 * contains either non-empty `colors` or non-empty `type` — the two signals
 * that most reliably contribute points to `match_similar_bookmarks`.
 */
export function hasVisualSignals(bookmark: Pick<SingleListData, "meta_data">): boolean {
  const keywords = bookmark.meta_data?.image_keywords;
  if (!keywords || Array.isArray(keywords)) {
    return false;
  }

  const structured = keywords as {
    colors?: unknown;
    type?: unknown;
  };

  return (
    (Array.isArray(structured.colors) && structured.colors.length > 0) ||
    (Array.isArray(structured.type) && structured.type.length > 0)
  );
}

/**
 * Button-enable gate for "See similar": source must have a scoreable visual
 * signal (colors or type). Tags and categories are not used by the ranker
 * so don't qualify a bookmark on their own.
 */
export function canFindSimilar(bookmark: Pick<SingleListData, "meta_data">): boolean {
  return hasVisualSignals(bookmark);
}
