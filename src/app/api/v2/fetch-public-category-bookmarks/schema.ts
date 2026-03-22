import { z } from "zod";

export const FetchPublicCategoryBookmarksInputSchema = z.object({
  category_slug: z
    .string()
    .min(1)
    .meta({ description: "URL-safe slug of the category", example: "design" }),
  limit: z.coerce.number().int().min(1).max(100).optional().meta({
    description: "Number of bookmarks per page (1-100)",
    example: 25,
  }),
  page: z.coerce.number().int().min(0).optional().meta({
    description: "Zero-based page number for pagination",
    example: 0,
  }),
  user_name: z.string().min(1).meta({
    description: "Username of the category owner",
    example: "johndoe",
  }),
});

export const FetchPublicCategoryBookmarksOutputSchema = z.object({
  bookmarks: z.array(z.unknown()).meta({
    description: "Array of bookmark objects for the category",
  }),
  categoryName: z.string().nullable().meta({
    description: "Display name of the category",
  }),
  categoryViews: z.unknown().nullable().meta({
    description: "Category view settings (sortBy, bookmarksView, etc.)",
  }),
  icon: z.string().nullable().meta({
    description: "Category icon identifier",
  }),
  iconColor: z.string().nullable().meta({
    description: "Category icon color hex code",
  }),
  isPublic: z.boolean().nullable().meta({
    description: "Whether the category is publicly shared",
  }),
});
