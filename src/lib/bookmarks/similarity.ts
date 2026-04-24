import type { SingleListData } from "@/types/apiTypes";

/**
 * A bookmark has a scoreable visual signal when its `image_keywords` payload
 * contains either non-empty `colors` or non-empty `type`. These are the only
 * two signals contributing points to `match_similar_bookmarks` — aspect-ratio
 * is a filter (can't produce matches alone), and object/tags/categories/domain
 * were dropped in Phase A. See supabase/migrations/20260424063452_*.
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
 * signal (colors or type). Tags/categories/domain were dropped from the
 * Phase A ranker and no longer qualify a bookmark for similarity search.
 */
export function canFindSimilar(bookmark: Pick<SingleListData, "meta_data">): boolean {
  return hasVisualSignals(bookmark);
}
