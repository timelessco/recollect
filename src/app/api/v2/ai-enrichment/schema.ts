import { z } from "zod";

export const AiEnrichmentInputSchema = z.object({
  id: z.int().meta({ description: "Bookmark ID" }),
  isInstagramBookmark: z
    .boolean()
    .default(false)
    .meta({ description: "Whether this bookmark was imported from Instagram" }),
  isRaindropBookmark: z
    .boolean()
    .default(false)
    .meta({ description: "Whether this bookmark was imported from Raindrop" }),
  isTwitterBookmark: z
    .boolean()
    .default(false)
    .meta({ description: "Whether this bookmark was imported from Twitter" }),
  message: z
    .object({
      message: z
        .object({
          meta_data: z
            .object({
              favIcon: z.string().meta({ description: "Favicon URL of the bookmarked page" }),
              instagram_profile_pic: z
                .string()
                .nullable()
                .optional()
                .meta({ description: "Instagram profile picture URL" }),
              instagram_username: z
                .string()
                .max(30)
                .optional()
                .meta({ description: "Instagram username (max 30 chars)" }),
              isOgImagePreferred: z
                .boolean()
                .optional()
                .meta({ description: "Whether OG image is preferred over screenshot" }),
              isPageScreenshot: z
                .boolean()
                .nullable()
                .optional()
                .meta({ description: "Whether the image is a page screenshot" }),
              saved_collection_names: z
                .array(z.string().max(255))
                .max(100)
                .optional()
                .meta({ description: "Collection names for auto-assignment (max 100)" }),
              twitter_avatar_url: z
                .string()
                .optional()
                .meta({ description: "Twitter user avatar URL" }),
              video_url: z
                .string()
                .nullable()
                .optional()
                .meta({ description: "Video URL for Twitter/Instagram bookmarks" }),
            })
            .meta({ description: "Bookmark metadata from the queue message" }),
        })
        .meta({ description: "Inner queue message payload" }),
      msg_id: z.int().meta({ description: "Queue message ID" }),
    })
    .meta({ description: "pgmq queue message wrapper" }),
  ogImage: z.url({ message: "ogImage must be a valid URL" }).meta({
    description: "Open Graph image URL (camelCase)",
  }),
  queue_name: z
    .string()
    .min(1, { message: "queue_name is required" })
    .meta({ description: "Name of the pgmq queue" }),
  url: z.url({ message: "url must be a valid URL" }).meta({
    description: "Bookmark URL to enrich",
  }),
  user_id: z
    .uuid({ message: "user_id must be a valid UUID" })
    .meta({ description: "User ID who owns the bookmark" }),
});

export type AiEnrichmentInput = z.infer<typeof AiEnrichmentInputSchema>;

export const AiEnrichmentOutputSchema = z.object({
  message: z.string().meta({ description: "Success confirmation message" }),
});

export type AiEnrichmentOutput = z.infer<typeof AiEnrichmentOutputSchema>;
