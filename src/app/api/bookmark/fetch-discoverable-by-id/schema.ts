import { z } from "zod";

export const FetchDiscoverableByIdQuerySchema = z.object({
  id: z.coerce.number().int().positive().meta({ description: "Bookmark ID to fetch", example: 42 }),
});

export type FetchDiscoverableByIdQuery = z.infer<typeof FetchDiscoverableByIdQuerySchema>;

const MetadataSchema = z.object({
  coverImage: z.string().nullable().optional().meta({ description: "Cover image URL" }),
  favIcon: z.string().nullable().optional().meta({ description: "Favicon URL" }),
  height: z.number().nullable().optional().meta({ description: "Image height in pixels" }),
  iframeAllowed: z
    .boolean()
    .nullable()
    .optional()
    .meta({ description: "Whether iframe embedding is allowed" }),
  image_keywords: z
    .union([z.array(z.string()), z.record(z.string(), z.string())])
    .optional()
    .meta({
      description: "Keywords extracted from image (array for legacy, object for structured)",
    }),
  img_caption: z.string().nullable().optional().meta({ description: "Image caption text" }),
  isOgImagePreferred: z
    .boolean()
    .optional()
    .meta({ description: "Whether to prefer OG image over screenshot" }),
  isPageScreenshot: z
    .boolean()
    .nullable()
    .optional()
    .meta({ description: "Whether stored image is a page screenshot" }),
  mediaType: z
    .string()
    .nullable()
    .optional()
    .meta({ description: "Media type of the bookmarked content" }),
  ocr: z.string().nullable().optional().meta({ description: "OCR text extracted from image" }),
  ogImgBlurUrl: z
    .string()
    .nullable()
    .optional()
    .meta({ description: "Blurhash placeholder for OG image" }),
  screenshot: z.string().nullable().optional().meta({ description: "Screenshot URL" }),
  twitter_avatar_url: z
    .string()
    .nullable()
    .optional()
    .meta({ description: "Twitter avatar URL if content is a tweet" }),
  video_url: z
    .string()
    .nullable()
    .optional()
    .meta({ description: "Video URL if content is a video" }),
  width: z.number().nullable().optional().meta({ description: "Image width in pixels" }),
});

const TagSchema = z.object({
  id: z.number().meta({ description: "Tag ID" }),
  name: z.string().meta({ description: "Tag name" }),
});

const CategorySchema = z.object({
  category_name: z.string().meta({ description: "Category display name" }),
  category_slug: z.string().meta({ description: "URL-safe category slug" }),
  icon: z.string().nullable().meta({ description: "Icon identifier" }),
  icon_color: z.string().meta({ description: "Icon color hex code" }),
  id: z.number().meta({ description: "Category ID" }),
});

export const FetchDiscoverableByIdResponseSchema = z.object({
  addedCategories: z
    .array(CategorySchema)
    .optional()
    .meta({ description: "Categories assigned to this bookmark" }),
  addedTags: z.array(TagSchema).optional().meta({ description: "Tags assigned to this bookmark" }),
  category_id: z.number().meta({ description: "Primary category ID for this bookmark" }),
  description: z.string().nullable().meta({ description: "Page or OG description" }),
  id: z.number().meta({ description: "Bookmark ID" }),
  inserted_at: z.string().meta({ description: "ISO timestamp when bookmark was created" }),
  make_discoverable: z.string().nullable().meta({
    description: "ISO timestamp when made discoverable, null if not discoverable",
  }),
  meta_data: MetadataSchema.nullable().meta({
    description: "Extended metadata JSONB",
  }),
  ogImage: z.string().nullable().meta({ description: "OG image URL" }),
  screenshot: z.string().nullable().meta({ description: "Screenshot URL" }),
  sort_index: z.string().nullable().meta({ description: "Fractional index for manual ordering" }),
  title: z.string().nullable().meta({ description: "Page title" }),
  trash: z
    .string()
    .nullable()
    .meta({ description: "ISO timestamp when trashed, null if not trashed" }),
  type: z.string().nullable().meta({ description: "Content type" }),
  url: z.string().nullable().meta({ description: "Bookmarked URL" }),
});

export type FetchDiscoverableByIdResponse = z.infer<typeof FetchDiscoverableByIdResponseSchema>;
