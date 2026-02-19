import { z } from "zod";

export const FetchDiscoverableByIdQuerySchema = z.object({
	id: z.coerce
		.number()
		.int()
		.positive()
		.meta({ description: "Bookmark ID to fetch", example: 42 }),
});

export type FetchDiscoverableByIdQuery = z.infer<
	typeof FetchDiscoverableByIdQuerySchema
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

const TagSchema = z.object({
	id: z.number().meta({ description: "Tag ID" }),
	name: z.string().meta({ description: "Tag name" }),
});

const CategorySchema = z.object({
	id: z.number().meta({ description: "Category ID" }),
	category_name: z.string().meta({ description: "Category display name" }),
	category_slug: z.string().meta({ description: "URL-safe category slug" }),
	icon: z.string().nullable().meta({ description: "Icon identifier" }),
	icon_color: z.string().meta({ description: "Icon color hex code" }),
});

const BookmarkViewDataTypesSchema = z.object({
	bookmarksView: z.string().meta({ description: "View layout type" }),
	cardContentViewArray: z
		.array(z.string())
		.meta({ description: "Visible card content fields" }),
	moodboardColumns: z
		.array(z.number())
		.meta({ description: "Column widths for moodboard view" }),
	sortBy: z.string().meta({ description: "Sort field" }),
});

const ProfilesBookmarksViewSchema = z.union([
	z.record(z.string(), BookmarkViewDataTypesSchema),
	BookmarkViewDataTypesSchema,
]);

const ProfilesTableTypesSchema = z.object({
	bookmarks_view: ProfilesBookmarksViewSchema.meta({
		description: "View configuration keyed by category ID or legacy flat",
	}),
	category_order: z
		.array(z.number())
		.meta({ description: "Ordered category IDs" }),
	display_name: z.string().meta({ description: "Display name" }),
	id: z.string().meta({ description: "User ID" }),
	preferred_og_domains: z
		.array(z.string())
		.nullable()
		.optional()
		.meta({ description: "Domains that prefer OG images" }),
	profile_pic: z.string().meta({ description: "Profile picture URL" }),
	user_name: z.string().meta({ description: "Username" }),
});

export const FetchDiscoverableByIdResponseSchema = z.object({
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
	addedTags: z
		.array(TagSchema)
		.optional()
		.meta({ description: "Tags assigned to this bookmark" }),
	addedCategories: z
		.array(CategorySchema)
		.optional()
		.meta({ description: "Categories assigned to this bookmark" }),
	user_id: ProfilesTableTypesSchema.nullable().meta({
		description: "Owner profile data",
	}),
});

export type FetchDiscoverableByIdResponse = z.infer<
	typeof FetchDiscoverableByIdResponseSchema
>;
