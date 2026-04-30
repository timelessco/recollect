import { z } from "zod";

export const RaindropImportInputSchema = z.object({
  bookmarks: z
    .array(
      z.object({
        category_name: z
          .string()
          .nullable()
          .meta({ description: "Raindrop collection name to use as category" }),
        description: z
          .string()
          .nullable()
          .meta({ description: "Bookmark description from Raindrop" }),
        inserted_at: z.iso
          .datetime()
          .nullable()
          .or(z.literal(""))
          .meta({ description: "Original bookmark creation date (ISO 8601)" }),
        ogImage: z
          .string()
          .nullable()
          .meta({ description: "Open Graph image URL captured by Raindrop" }),
        title: z.string().nullable().meta({ description: "Bookmark title" }),
        url: z.url().meta({ description: "Bookmark URL" }),
      }),
    )
    .min(1, { error: "At least one bookmark required" })
    .max(500, { error: "Maximum 500 bookmarks per request" })
    .meta({ description: "Array of Raindrop.io bookmarks to import" }),
});

export type RaindropImportInput = z.infer<typeof RaindropImportInputSchema>;

export const RaindropImportOutputSchema = z.object({
  queued: z.int().meta({ description: "Number of bookmarks successfully queued for processing" }),
  skipped: z
    .int()
    .meta({ description: "Number of bookmarks skipped (duplicates within batch or existing)" }),
});

export type RaindropImportOutput = z.infer<typeof RaindropImportOutputSchema>;
