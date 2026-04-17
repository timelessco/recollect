import { z } from "zod";

export const FetchUserProfileInputSchema = z.object({
  avatar: z
    .string()
    .optional()
    .meta({ description: "OAuth avatar URL to sync as profile picture" }),
});

export const FetchUserProfileOutputSchema = z.array(
  z.object({
    ai_features_toggle: z.unknown().meta({ description: "AI feature settings (JSON)" }),
    api_key: z.string().nullable().meta({ description: "Encrypted Gemini API key" }),
    bookmark_count: z.number().nullable().meta({ description: "Total number of bookmarks" }),
    bookmarks_view: z.unknown().nullable().meta({ description: "Default bookmark view settings" }),
    category_order: z.array(z.number().nullable()).nullable().meta({
      description:
        "Ordered array of category IDs. Elements may be null for categories deleted without compacting the ordering array.",
    }),
    display_name: z.string().nullable().meta({ description: "User's display name" }),
    email: z.string().nullable().meta({ description: "User's email address" }),
    id: z.string().meta({ description: "User's unique identifier" }),
    last_synced_instagram_id: z
      .string()
      .nullable()
      .meta({ description: "Last synced Instagram post ID" }),
    last_synced_twitter_id: z
      .string()
      .nullable()
      .meta({ description: "Last synced Twitter post ID" }),
    favorite_categories: z
      .array(z.number())
      .nullable()
      .meta({ description: "IDs of categories marked as favorites" }),
    onboarded_at: z.string().nullable().meta({
      description: "Timestamp when the user dismissed the welcome modal; null for first-timers",
    }),
    preferred_og_domains: z
      .array(z.string())
      .nullable()
      .meta({ description: "Domains with preferred Open Graph image handling" }),
    profile_pic: z.string().nullable().meta({ description: "URL of the user's profile picture" }),
    provider: z.string().nullable().meta({ description: "OAuth authentication provider" }),
    user_name: z.string().nullable().meta({ description: "User's chosen username" }),
  }),
);
