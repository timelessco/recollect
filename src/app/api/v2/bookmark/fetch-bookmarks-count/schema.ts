import { z } from "zod";

export const FetchBookmarksCountInputSchema = z.object({});

export const FetchBookmarksCountOutputSchema = z.object({
  allCount: z.number().meta({ description: "Total non-trash bookmarks" }),
  audioCount: z.number().meta({ description: "Audio media type count" }),
  categoryCount: z
    .array(
      z.object({
        category_id: z.number().meta({ description: "Category ID" }),
        count: z.number().meta({ description: "Bookmark count in this category" }),
      }),
    )
    .meta({ description: "Per-category bookmark counts" }),
  documentsCount: z.number().meta({ description: "Document media type count" }),
  imagesCount: z.number().meta({ description: "Image media type count" }),
  instagramCount: z.number().meta({ description: "Instagram type count" }),
  linksCount: z.number().meta({ description: "Link type bookmark count" }),
  trashCount: z.number().meta({ description: "Bookmarks with non-null trash" }),
  tweetsCount: z.number().meta({ description: "Tweet type count" }),
  uncategorizedCount: z
    .number()
    .meta({ description: "Bookmarks in category_id 0 (Uncategorized)" }),
  videosCount: z.number().meta({ description: "Video media type count" }),
});
