import { z } from "zod";

export const ChromeBookmarkImportInputSchema = z.object({
  bookmarks: z
    .array(
      z.object({
        category_name: z.string().nullable(),
        description: z.string().nullable(),
        inserted_at: z.iso.datetime().nullable().or(z.literal("")),
        ogImage: z.string().nullable(),
        title: z.string().nullable(),
        url: z.url(),
      }),
    )
    .min(1, { error: "At least one bookmark required" })
    .max(500, { error: "Maximum 500 bookmarks per request" }),
});

export const ChromeBookmarkImportOutputSchema = z.object({
  queued: z.number(),
  skipped: z.number(),
});
