import type { SingleListData } from "@/types/apiTypes";

/**
 * A bookmark has visual signals when its `image_keywords` payload is the
 * structured shape (OKLAB colors, detected objects, AI content types) produced
 * by the current enrichment pipeline, and at least one of those arrays is non-empty.
 */
export function hasVisualSignals(bookmark: Pick<SingleListData, "meta_data">): boolean {
  const keywords = bookmark.meta_data?.image_keywords;
  if (!keywords || Array.isArray(keywords)) {
    return false;
  }

  const structured = keywords as {
    colors?: unknown;
    object?: unknown;
    type?: unknown;
  };

  return (
    (Array.isArray(structured.colors) && structured.colors.length > 0) ||
    (Array.isArray(structured.object) && structured.object.length > 0) ||
    (Array.isArray(structured.type) && structured.type.length > 0)
  );
}

/**
 * Whether the bookmark has at least one user-curated similarity signal — tag or category.
 */
export function hasTagsOrCategories(
  bookmark: Pick<SingleListData, "addedTags" | "addedCategories">,
): boolean {
  const tagCount = bookmark.addedTags?.length ?? 0;
  const categoryCount = bookmark.addedCategories?.length ?? 0;
  return tagCount > 0 || categoryCount > 0;
}

/**
 * Button-enable gate for "See similar": at least one signal type present so the
 * RPC has something to match against.
 */
export function canFindSimilar(
  bookmark: Pick<SingleListData, "meta_data" | "addedTags" | "addedCategories">,
): boolean {
  return hasVisualSignals(bookmark) || hasTagsOrCategories(bookmark);
}
