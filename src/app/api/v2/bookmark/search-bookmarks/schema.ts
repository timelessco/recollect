import { z } from "zod";

export const SearchBookmarksInputSchema = z.object({
  category_id: z.string().optional().meta({
    description:
      "Category context — DISCOVER_URL for public search, numeric string for user category, or special URL like TRASH_URL",
  }),
  offset: z.coerce
    .number()
    .int()
    .min(0)
    .optional()
    .default(0)
    .meta({ description: "Pagination offset" }),
  search: z
    .string()
    .min(1, "Search parameter is required")
    .meta({ description: "Search query text — supports @domain.com site scope and #tag filters" }),
});

export type SearchBookmarksInput = z.infer<typeof SearchBookmarksInputSchema>;

/**
 * Single search result item — camelCase mapped from RPC snake_case output.
 * Fields match the `search_bookmarks_url_tag_scope` RPC return type.
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
  inserted_at: z
    .string()
    .nullable()
    .meta({ description: "Timestamp when the bookmark was created" }),
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

export const SearchBookmarksOutputSchema = z.array(SearchBookmarkItemSchema).meta({
  description: "Array of search results with camelCase field mapping applied",
});

export type SearchBookmarksOutput = z.infer<typeof SearchBookmarksOutputSchema>;
