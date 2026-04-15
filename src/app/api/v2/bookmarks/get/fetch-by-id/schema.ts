import { z } from "zod";

export const FetchByIdInputSchema = z.object({
  id: z.coerce.number().int().meta({ description: "Bookmark ID" }),
});

const CategorySchema = z.object({
  category_name: z.string().nullable().meta({ description: "Display name of the category" }),
  category_slug: z.string().meta({ description: "URL-safe slug of the category" }),
  icon: z.string().nullable().meta({ description: "Category icon identifier" }),
  icon_color: z.string().nullable().meta({ description: "Category icon color hex code" }),
  id: z.int().meta({ description: "Category unique identifier" }),
});

const BookmarkSchema = z.object({
  addedCategories: z
    .array(CategorySchema)
    .meta({ description: "Array of categories this bookmark belongs to" }),
  category_id: z.int().meta({ description: "Primary category ID" }),
  description: z.string().nullable().meta({ description: "Bookmark description or excerpt" }),
  id: z.int().meta({ description: "Bookmark unique identifier" }),
  inserted_at: z.string().meta({ description: "Timestamp when bookmark was created" }),
  make_discoverable: z
    .string()
    .nullable()
    .meta({ description: "Whether bookmark is publicly discoverable" }),
  meta_data: z.unknown().meta({ description: "Parsed metadata from the bookmarked page" }),
  ogImage: z.string().nullable().meta({ description: "Open Graph image URL" }),
  screenshot: z.string().nullable().meta({ description: "Screenshot URL of the bookmarked page" }),
  sort_index: z.string().nullable().meta({ description: "Sort position within the category" }),
  title: z.string().nullable().meta({ description: "Bookmark title" }),
  trash: z.string().nullable().meta({ description: "Whether bookmark is in trash" }),
  type: z.string().nullable().meta({ description: "Bookmark type or format" }),
  url: z.string().nullable().meta({ description: "Bookmarked URL" }),
  user_id: z.string().meta({ description: "Owner user ID" }),
});

export const FetchByIdOutputSchema = z.array(BookmarkSchema);
