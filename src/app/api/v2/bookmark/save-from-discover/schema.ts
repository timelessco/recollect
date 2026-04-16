import { z } from "zod";

export const SaveFromDiscoverInputSchema = z.object({
  category_ids: z
    .array(z.int().min(0))
    .min(1)
    .meta({ description: "Target collection IDs (0 = Everything)" }),
  source_bookmark_id: z.int().meta({ description: "Discover bookmark ID to save" }),
});

const BookmarkRow = z.object({
  description: z.string().nullable().meta({ description: "Bookmark description" }),
  enriched_at: z.string().nullable().meta({ description: "Timestamp of last enrichment" }),
  enrichment_status: z.string().nullable().meta({ description: "Enrichment pipeline status" }),
  id: z.int().meta({ description: "Bookmark unique identifier" }),
  inserted_at: z.string().meta({ description: "Timestamp when bookmark was created" }),
  make_discoverable: z.string().nullable().meta({ description: "Discoverability status" }),
  meta_data: z.unknown().meta({ description: "Enriched metadata (favicon, media type, iframe)" }),
  ogImage: z.string().nullable().meta({ description: "Open Graph image URL" }),
  sort_index: z.string().nullable().meta({ description: "Sort order index" }),
  title: z.string().nullable().meta({ description: "Bookmark title" }),
  trash: z.string().nullable().meta({ description: "Trash timestamp if soft-deleted" }),
  type: z.string().nullable().meta({ description: "Bookmark type" }),
  url: z.string().nullable().meta({ description: "Bookmark URL" }),
  user_id: z.string().meta({ description: "Owner user ID" }),
});

export const SaveFromDiscoverOutputSchema = z.array(BookmarkRow);
