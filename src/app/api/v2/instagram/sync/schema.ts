import { z } from "zod";

import { instagramType } from "@/utils/constants";

export const V2InstagramSyncInputSchema = z.object({
  bookmarks: z
    .array(
      z.object({
        description: z
          .string()
          .default("")
          .meta({ description: "Optional Instagram post caption or description" }),
        meta_data: z.record(z.string(), z.unknown()).default({}).meta({
          description:
            "Free-form Instagram metadata (e.g. `saved_collection_names`) stored alongside the bookmark",
        }),
        ogImage: z
          .string()
          .nullish()
          .meta({ description: "Instagram CDN image URL captured at sync time" }),
        saved_at: z.iso.datetime().meta({
          description:
            "ISO 8601 timestamp (with `Z` suffix) when the user saved the post on Instagram",
        }),
        title: z.string().default("").meta({ description: "Optional Instagram post title" }),
        type: z
          .literal(instagramType)
          .default(instagramType)
          .meta({ description: "Bookmark type literal — must be `instagram`" }),
        url: z
          .url()
          .refine((url) => {
            const parsed = new URL(url);
            return parsed.hostname === "instagram.com" || parsed.hostname === "www.instagram.com";
          }, "Must be a valid Instagram URL")
          .meta({ description: "Instagram post URL (instagram.com or www.instagram.com)" }),
      }),
    )
    .min(1, "At least one bookmark required")
    .max(500, "Maximum 500 bookmarks per request")
    .meta({ description: "Batch of Instagram bookmarks to enqueue (1–500 per request)" }),
});

export const V2InstagramSyncOutputSchema = z.object({
  inserted: z.int().meta({ description: "Number of new bookmarks queued for async processing" }),
  skipped: z.int().meta({
    description:
      "Number of bookmarks skipped — duplicates within the batch plus URLs already stored for this user",
  }),
});
