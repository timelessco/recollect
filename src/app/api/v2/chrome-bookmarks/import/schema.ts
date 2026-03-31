import { z } from "zod";

export const ChromeBookmarkImportInputSchema = z.object({
  bookmarks: z
    .array(
      z.object({
        category_name: z
          .string()
          .nullable()
          .meta({ description: "Chrome folder name to use as category" }),
        inserted_at: z.iso
          .datetime()
          .nullable()
          .or(z.literal(""))
          .meta({ description: "Original bookmark creation date (ISO 8601)" }),
        title: z.string().nullable().meta({ description: "Bookmark title" }),
        url: z.url().meta({ description: "Bookmark URL" }),
      }),
    )
    .min(1, { error: "At least one bookmark required" })
    .max(500, { error: "Maximum 500 bookmarks per request" })
    .meta({ description: "Array of Chrome bookmarks to import" }),
});

export type ChromeBookmarkImportInput = z.infer<typeof ChromeBookmarkImportInputSchema>;

export const ChromeBookmarkImportOutputSchema = z.object({
  queued: z.int().meta({ description: "Number of bookmarks successfully queued for processing" }),
  skipped: z
    .int()
    .meta({ description: "Number of bookmarks skipped (duplicates within batch or existing)" }),
});

export type ChromeBookmarkImportOutput = z.infer<typeof ChromeBookmarkImportOutputSchema>;
