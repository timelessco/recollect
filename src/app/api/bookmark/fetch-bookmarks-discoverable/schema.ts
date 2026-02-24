import { z } from "zod";

export const FetchDiscoverBookmarksQuerySchema = z.object({
	page: z.coerce
		.number()
		.int()
		.nonnegative()
		.meta({ description: "Zero-based page number for pagination", example: 0 }),
});

export type FetchDiscoverBookmarksQuery = z.infer<
	typeof FetchDiscoverBookmarksQuerySchema
>;

const MetadataSchema = z.object({
	coverImage: z
		.string()
		.nullable()
		.optional()
		.meta({ description: "Cover image URL" }),
	favIcon: z
		.string()
		.nullable()
		.optional()
		.meta({ description: "Favicon URL" }),
	height: z
		.number()
		.nullable()
		.optional()
		.meta({ description: "Image height in pixels" }),
	iframeAllowed: z
		.boolean()
		.nullable()
		.optional()
		.meta({ description: "Whether iframe embedding is allowed" }),
	img_caption: z
		.string()
		.nullable()
		.optional()
		.meta({ description: "Image caption text" }),
	image_keywords: z
		.array(z.string())
		.optional()
		.meta({ description: "Keywords extracted from image" }),
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
	ocr: z
		.string()
		.nullable()
		.optional()
		.meta({ description: "OCR text extracted from image" }),
	ogImgBlurUrl: z
		.string()
		.nullable()
		.optional()
		.meta({ description: "Blurhash placeholder for OG image" }),
	screenshot: z
		.string()
		.nullable()
		.optional()
		.meta({ description: "Screenshot URL" }),
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
	width: z
		.number()
		.nullable()
		.optional()
		.meta({ description: "Image width in pixels" }),
	additionalVideos: z
		.array(z.string())
		.nullable()
		.optional()
		.meta({ description: "Additional video URLs" }),
});

const DiscoverableBookmarkRowSchema = z.object({
	id: z.number().meta({ description: "Bookmark ID" }),
	inserted_at: z
		.string()
		.meta({ description: "ISO timestamp when bookmark was created" }),
	title: z.string().nullable().meta({ description: "Page title" }),
	url: z.string().nullable().meta({ description: "Bookmarked URL" }),
	description: z
		.string()
		.nullable()
		.meta({ description: "Page or OG description" }),
	ogImage: z.string().nullable().meta({ description: "OG image URL" }),
	screenshot: z.string().nullable().meta({ description: "Screenshot URL" }),
	category_id: z
		.number()
		.meta({ description: "Primary category ID for this bookmark" }),
	trash: z
		.string()
		.nullable()
		.meta({ description: "ISO timestamp when trashed, null if not trashed" }),
	type: z.string().nullable().meta({ description: "Content type" }),
	meta_data: MetadataSchema.nullable().meta({
		description: "Extended metadata JSONB",
	}),
	sort_index: z
		.string()
		.nullable()
		.meta({ description: "Fractional index for manual ordering" }),
	make_discoverable: z.string().nullable().meta({
		description:
			"ISO timestamp when made discoverable, null if not discoverable",
	}),
});

export const FetchDiscoverBookmarksResponseSchema = z.array(
	DiscoverableBookmarkRowSchema,
);

export type FetchDiscoverBookmarksResponse = z.infer<
	typeof FetchDiscoverBookmarksResponseSchema
>;
