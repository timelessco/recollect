import { z } from "zod";

export const BookmarksInsertInputSchema = z.object({
  data: z
    .array(
      z.object({
        description: z
          .string()
          .nullable()
          .optional()
          .meta({ description: "Bookmark description or excerpt" }),
        ogImage: z
          .string()
          .nullable()
          .optional()
          .meta({ description: "Open Graph image URL for the bookmark" }),
        title: z.string().meta({ description: "Bookmark title" }),
        type: z.string().nullable().optional().meta({ description: "Bookmark type or format" }),
        url: z.url().meta({ description: "URL of the bookmarked page" }),
      }),
    )
    .min(1),
});

export const BookmarksInsertOutputSchema = z.object({
  insertedCount: z.int().meta({ description: "Number of bookmarks successfully inserted" }),
});
