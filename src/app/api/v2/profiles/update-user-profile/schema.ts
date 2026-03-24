import { z } from "zod";

const UpdateDataSchema = z
  .object({
    ai_features_toggle: z
      .unknown()
      .optional()
      .meta({ description: "AI feature settings to update" }),
    bookmark_count: z.int().nullable().optional().meta({ description: "Updated bookmark count" }),
    bookmarks_view: z.unknown().optional().meta({ description: "Updated bookmark view settings" }),
    category_order: z
      .array(z.int())
      .nullable()
      .optional()
      .meta({ description: "Updated ordered array of category IDs" }),
    display_name: z.string().nullable().optional().meta({ description: "Updated display name" }),
    email: z.string().nullable().optional().meta({ description: "Updated email address" }),
    favorite_categories: z
      .array(z.int())
      .optional()
      .meta({ description: "Ordered list of favorite category IDs" }),
    preferred_og_domains: z
      .array(z.string())
      .nullable()
      .optional()
      .meta({ description: "Updated preferred OG image domains" }),
    profile_pic: z
      .string()
      .nullable()
      .optional()
      .meta({ description: "Updated profile picture URL" }),
    provider: z.string().nullable().optional().meta({ description: "Updated OAuth provider" }),
    user_name: z.string().nullable().optional().meta({ description: "Updated username" }),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "At least one field required",
  });

export const UpdateUserProfileInputSchema = z.object({
  updateData: UpdateDataSchema,
});

export const UpdateUserProfileOutputSchema = z.array(
  z.object({
    ai_features_toggle: z.unknown().meta({ description: "AI feature settings (JSON)" }),
    api_key: z.string().nullable().meta({ description: "Encrypted Gemini API key" }),
    bookmark_count: z.number().nullable().meta({ description: "Total number of bookmarks" }),
    bookmarks_view: z.unknown().nullable().meta({ description: "Default bookmark view settings" }),
    category_order: z
      .array(z.number())
      .nullable()
      .meta({ description: "Ordered array of category IDs" }),
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
    preferred_og_domains: z
      .array(z.string())
      .nullable()
      .meta({ description: "Domains with preferred Open Graph image handling" }),
    profile_pic: z.string().nullable().meta({ description: "URL of the user's profile picture" }),
    provider: z.string().nullable().meta({ description: "OAuth authentication provider" }),
    user_name: z.string().nullable().meta({ description: "User's chosen username" }),
  }),
);
