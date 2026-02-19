import { z } from "zod";

export const FetchPublicBookmarkByIdQuerySchema = z.object({
	bookmark_id: z
		.string()
		.regex(/^\d+$/u, "Bookmark ID must be numeric")
		.transform(Number)
		.meta({
			description: "Numeric bookmark ID as string query parameter",
			example: "42",
		}),
	user_name: z
		.string()
		.regex(/^[\w-]{1,39}$/u, "Invalid username format")
		.min(1)
		.max(39)
		.meta({
			description: "Username of the bookmark owner",
			example: "johndoe",
		}),
	category_slug: z
		.string()
		.regex(/^[\w-]+$/u, "Invalid category slug format")
		.min(1)
		.max(100)
		.meta({
			description: "URL-safe slug of the public category",
			example: "web-development",
		}),
});

export type FetchPublicBookmarkByIdQuery = z.infer<
	typeof FetchPublicBookmarkByIdQuerySchema
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
});

const ProfileSchema = z.object({
	user_name: z
		.string()
		.nullable()
		.meta({ description: "Username of the bookmark owner" }),
});

const BookmarkSchema = z.object({
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
	trash: z
		.string()
		.nullable()
		.meta({ description: "ISO timestamp when trashed, null if not trashed" }),
	type: z.string().nullable().meta({ description: "Content type" }),
	meta_data: MetadataSchema.nullable().meta({
		description: "Extended metadata JSONB",
	}),
	make_discoverable: z.string().nullable().meta({
		description:
			"ISO timestamp when made discoverable, null if not discoverable",
	}),
	user_id: ProfileSchema.meta({ description: "Owner profile data" }),
});

export const FetchPublicBookmarkByIdResponseSchema = BookmarkSchema.nullable();

export type FetchPublicBookmarkByIdResponse = z.infer<
	typeof FetchPublicBookmarkByIdResponseSchema
>;
