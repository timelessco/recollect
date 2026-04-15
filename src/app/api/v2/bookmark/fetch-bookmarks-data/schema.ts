import { z } from "zod";

export const FetchBookmarksDataInputSchema = z.object({
  category_id: z.string().meta({
    description:
      "Category context — numeric ID, 'trash', 'tweets', 'links', 'instagram', 'uncategorized', or 'discover'",
  }),
  from: z.coerce
    .number()
    .int()
    .min(0)
    .optional()
    .default(0)
    .meta({ description: "Pagination offset (0-based)" }),
  sort_by: z.string().optional().meta({
    description:
      "Sort field — date-sort-ascending, date-sort-descending, alphabetical-sort-ascending, alphabetical-sort-descending, url-sort-ascending, url-sort-descending",
  }),
});

const TagSchema = z.object({
  id: z.int().meta({ description: "Tag ID" }),
  name: z.string().nullable().meta({ description: "Tag name" }),
});

const CategorySchema = z.object({
  category_name: z.string().nullable().meta({ description: "Category display name" }),
  category_slug: z.string().meta({ description: "Category URL slug" }),
  icon: z.string().nullable().meta({ description: "Category icon identifier" }),
  icon_color: z.string().nullable().meta({ description: "Category icon color" }),
  id: z.int().meta({ description: "Category ID" }),
});

export const FetchBookmarksDataOutputSchema = z.array(
  z.object({
    addedCategories: z
      .array(CategorySchema)
      .meta({ description: "Categories stitched from junction table" }),
    description: z.string().nullable().meta({ description: "Bookmark description" }),
    enriched_at: z.string().nullable().meta({ description: "Enrichment timestamp" }),
    enrichment_status: z.string().nullable().meta({ description: "Enrichment pipeline status" }),
    id: z.int().meta({ description: "Bookmark ID" }),
    inserted_at: z.string().meta({ description: "Creation timestamp" }),
    make_discoverable: z.string().nullable().meta({ description: "Discoverable timestamp if set" }),
    meta_data: z.unknown().nullable().meta({ description: "Enriched metadata object" }),
    ogImage: z.string().nullable().meta({ description: "Open Graph image URL" }),
    sort_index: z.string().nullable().meta({ description: "Sort index for tweets" }),
    addedTags: z.array(TagSchema).meta({ description: "Tags stitched from junction table" }),
    title: z.string().nullable().meta({ description: "Bookmark title" }),
    trash: z.string().nullable().meta({ description: "Trash timestamp if trashed" }),
    type: z
      .string()
      .nullable()
      .meta({ description: "Bookmark type (bookmark, tweet, instagram, MIME type)" }),
    url: z.string().nullable().meta({ description: "Bookmark URL" }),
    user_id: z
      .unknown()
      .meta({ description: "User ID — string or FK join object for shared categories" }),
  }),
);
