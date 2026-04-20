import { z } from "zod";

export const V2SyncFolderBookmarksInputSchema = z.object({
  mappings: z
    .array(
      z.object({
        category_name: z.string().min(1, { error: "Category name is required" }).meta({
          description:
            "Target collection name — must exactly match an existing folder created via sync-folders.",
        }),
        url: z.url().meta({
          description: "Tweet URL (twitter.com or x.com) previously enqueued via sync.",
        }),
      }),
    )
    .min(1, { error: "At least one mapping required" })
    .max(500, { error: "Maximum 500 mappings per request" })
    .meta({
      description: "Batch of bookmark-to-collection mappings to enqueue (1–500 per request).",
    }),
});

export const V2SyncFolderBookmarksOutputSchema = z.object({
  queued: z.int().meta({ description: "Number of mapping messages successfully queued." }),
});
