import { z } from "zod";

export const FetchSimilarInputSchema = z.object({
  bookmark_id: z.coerce
    .number()
    .int()
    .min(1)
    .meta({ description: "Source bookmark ID to find similar bookmarks for" }),
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

export const FetchSimilarOutputSchema = z.array(
  z.object({
    addedCategories: z
      .array(CategorySchema)
      .meta({ description: "Categories stitched from junction table" }),
    addedTags: z.array(TagSchema).meta({ description: "Tags stitched from junction table" }),
    description: z.string().nullable().meta({ description: "Bookmark description" }),
    enriched_at: z.string().nullable().meta({ description: "Enrichment timestamp" }),
    enrichment_status: z.string().nullable().meta({ description: "Enrichment pipeline status" }),
    id: z.int().meta({ description: "Bookmark ID" }),
    inserted_at: z.string().meta({ description: "Creation timestamp" }),
    make_discoverable: z.string().nullable().meta({ description: "Discoverable timestamp if set" }),
    meta_data: z.unknown().nullable().meta({ description: "Enriched metadata object" }),
    ogImage: z.string().nullable().meta({ description: "Open Graph image URL" }),
    screenshot: z.string().nullable().meta({ description: "Screenshot URL" }),
    similarity_score: z
      .int()
      .meta({ description: "Additive similarity score vs. source bookmark" }),
    sort_index: z.string().nullable().meta({ description: "Sort index for tweets" }),
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
