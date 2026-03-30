import { z } from "zod";

export const AddBookmarkMinDataInputSchema = z.object({
  category_id: z.int().min(0).meta({ description: "Target category ID (0 = uncategorized)" }),
  update_access: z.boolean().meta({ description: "Whether the user has update access" }),
  url: z.url().meta({ description: "Bookmark URL to add" }),
});

const BookmarkRow = z.object({
  category_id: z.int().meta({ description: "Category ID the bookmark belongs to" }),
  description: z.string().nullable().meta({ description: "Bookmark description from OG scraping" }),
  enriched_at: z.string().nullable().meta({ description: "Timestamp of last enrichment" }),
  enrichment_status: z.string().nullable().meta({ description: "Enrichment pipeline status" }),
  id: z.int().meta({ description: "Bookmark unique identifier" }),
  inserted_at: z.string().meta({ description: "Timestamp when bookmark was created" }),
  make_discoverable: z.string().nullable().meta({ description: "Discoverability status" }),
  meta_data: z.unknown().meta({ description: "Enriched metadata (favicon, media type, iframe)" }),
  ogImage: z.string().nullable().meta({ description: "Open Graph image URL" }),
  screenshot: z.string().nullable().meta({ description: "Screenshot image URL" }),
  sort_index: z.string().nullable().meta({ description: "Sort order index" }),
  title: z.string().nullable().meta({ description: "Bookmark title from OG scraping" }),
  trash: z.string().nullable().meta({ description: "Trash timestamp if soft-deleted" }),
  type: z.string().nullable().meta({ description: "Bookmark type (bookmark, tweet, etc.)" }),
  url: z.string().nullable().meta({ description: "Bookmark URL" }),
  user_id: z.string().meta({ description: "Owner user ID" }),
});

export const AddBookmarkMinDataOutputSchema = z.array(BookmarkRow);
