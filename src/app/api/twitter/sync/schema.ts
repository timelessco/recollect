import { z } from "zod";

import { tweetType } from "@/utils/constants";

export const TwitterSyncInputSchema = z.object({
  bookmarks: z
    .array(
      z.object({
        description: z.string().default(""),
        inserted_at: z.iso.datetime().optional(),
        meta_data: z.record(z.string(), z.unknown()).default({}),
        ogImage: z.string().nullish(),
        sort_index: z.string().default(""),
        title: z.string().default(""),
        type: z.literal(tweetType).default(tweetType),
        url: z.url(),
      }),
    )
    .min(1, "At least one bookmark required")
    .max(500, "Maximum 500 bookmarks per request"),
  historicalSyncComplete: z.boolean().optional(),
  isHistoricalRun: z.boolean().optional(),
});

export const TwitterSyncOutputSchema = z.object({
  inserted: z.number(),
  skipped: z.number(),
});
