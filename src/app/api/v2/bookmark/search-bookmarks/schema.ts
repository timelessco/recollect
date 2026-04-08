import { z } from "zod";

export const SearchBookmarksInputSchema = z.object({
  category_id: z.string().optional().meta({
    description:
      "Category context — DISCOVER_URL for public search, numeric string for user category, or special URL like TRASH_URL",
  }),
  cursor: z.string().optional().default("").meta({
    description:
      "Opaque pagination cursor from a previous response's next_cursor. Empty (or omitted) returns the first page. Treat as opaque — internal shape is base64url JSON {phase, offset}.",
  }),
  search: z.string().min(1, "Search parameter is required").meta({
    description:
      "Search query — supports @domain.com site scope and #tag/#color filters. Each #token is a tag candidate; tokens that parse as a CSS color name or hex are also color candidates (multi-color is AND).",
  }),
});

export type SearchBookmarksInput = z.infer<typeof SearchBookmarksInputSchema>;

/**
 * Single search result item — camelCase mapped from RPC snake_case output.
 * Field shape matches both `search_bookmarks_url_tag_scope` and
 * `search_bookmarks_color_array_scope` (identical RETURNS TABLE).
 */
const SearchBookmarkItemSchema = z.object({
  addedCategories: z.unknown().nullable().meta({
    description: "Categories the bookmark belongs to (camelCase mapped from added_categories)",
  }),
  addedTags: z
    .unknown()
    .nullable()
    .meta({ description: "Tags associated with the bookmark (camelCase mapped from added_tags)" }),
  description: z.string().nullable().meta({ description: "Bookmark description" }),
  id: z.int().meta({ description: "Bookmark ID" }),
  inserted_at: z.string().nullable().meta({ description: "Created timestamp" }),
  make_discoverable: z.string().nullable().meta({ description: "Discover page visibility flag" }),
  meta_data: z.unknown().nullable().meta({ description: "Bookmark metadata JSON" }),
  ogImage: z
    .string()
    .nullable()
    .meta({ description: "Open Graph image URL (camelCase mapped from ogimage)" }),
  screenshot: z.string().nullable().meta({ description: "Screenshot image URL" }),
  sort_index: z.string().nullable().meta({ description: "Sort index for ordering" }),
  title: z.string().nullable().meta({ description: "Bookmark title" }),
  trash: z.unknown().nullable().meta({ description: "Trash status — null if not trashed" }),
  type: z
    .string()
    .nullable()
    .meta({ description: "Bookmark type (e.g., bookmark, tweet, instagram)" }),
  url: z.string().nullable().meta({ description: "Bookmark URL" }),
  user_id: z.string().nullable().meta({ description: "Owner user ID" }),
});

export const SearchBookmarksOutputSchema = z
  .object({
    items: z.array(SearchBookmarkItemSchema).meta({
      description:
        "Result items for this page. May contain a mix of tag-phase and color-phase rows when the tag phase exhausts mid-page.",
    }),
    next_cursor: z.string().nullable().meta({
      description: "Cursor for the next page, or null when both phases are exhausted.",
    }),
  })
  .meta({
    description: "Paginated search results with opaque cursor for the two-phase tag→color stream",
  });

export type SearchBookmarksOutput = z.infer<typeof SearchBookmarksOutputSchema>;
