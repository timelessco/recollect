import { z } from "zod";

import { tweetType } from "@/utils/constants";

export const V2TwitterSyncInputSchema = z.object({
  bookmarks: z
    .array(
      z.object({
        description: z
          .string()
          .default("")
          .meta({ description: "Optional tweet body / description text" }),
        inserted_at: z.iso.datetime().optional().meta({
          description:
            "Optional ISO 8601 timestamp (with `Z` suffix) when the tweet was bookmarked on Twitter/X",
        }),
        meta_data: z.record(z.string(), z.unknown()).default({}).meta({
          description: "Free-form Twitter/X metadata stored alongside the bookmark",
        }),
        ogImage: z.string().nullish().meta({
          description: "Twitter/X CDN image URL captured at sync time (e.g. `pbs.twimg.com`)",
        }),
        sort_index: z.string().default("").meta({
          description:
            "Twitter/X sort index (opaque string) used for stable ordering against the source timeline",
        }),
        title: z
          .string()
          .default("")
          .meta({ description: "Optional tweet title or author handle" }),
        type: z
          .literal(tweetType)
          .default(tweetType)
          .meta({ description: "Bookmark type literal — must be `tweet`" }),
        url: z.url().meta({ description: "Tweet URL (twitter.com or x.com)" }),
      }),
    )
    .min(1, "At least one bookmark required")
    .max(500, "Maximum 500 bookmarks per request")
    .meta({ description: "Batch of Twitter/X bookmarks to enqueue (1–500 per request)" }),
});

export const V2TwitterSyncOutputSchema = z.object({
  inserted: z.int().meta({ description: "Number of new bookmarks queued for async processing" }),
  skipped: z.int().meta({
    description:
      "Number of bookmarks skipped — duplicates within the batch plus URLs already stored for this user",
  }),
});
