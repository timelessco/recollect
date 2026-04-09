import { z } from "zod";

export const SyncFolderBookmarksInputSchema = z.object({
  mappings: z
    .array(
      z.object({
        category_name: z.string().min(1, { error: "Category name is required" }),
        url: z.url(),
      }),
    )
    .min(1, { error: "At least one mapping required" })
    .max(500, { error: "Maximum 500 mappings per request" }),
});

export const SyncFolderBookmarksOutputSchema = z.object({
  queued: z.int(),
});
