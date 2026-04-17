import { z } from "zod";

import { instagramType } from "@/utils/constants";

export const InstagramSyncInputSchema = z.object({
  bookmarks: z
    .array(
      z.object({
        description: z.string().default(""),
        meta_data: z.record(z.string(), z.unknown()).default({}),
        ogImage: z.string().nullish(),
        saved_at: z.iso.datetime(),
        title: z.string().default(""),
        type: z.literal(instagramType).default(instagramType),
        url: z.url().refine((url) => {
          const parsed = new URL(url);
          return parsed.hostname === "instagram.com" || parsed.hostname === "www.instagram.com";
        }, "Must be a valid Instagram URL"),
      }),
    )
    .min(1, "At least one bookmark required")
    .max(500, "Maximum 500 bookmarks per request"),
  historicalSyncComplete: z.boolean().optional(),
  isHistoricalRun: z.boolean().optional(),
});

export const InstagramSyncOutputSchema = z.object({
  inserted: z.number(),
  skipped: z.number(),
});
