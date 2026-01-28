import { z } from "zod";

import { createGetApiHandler } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { createApiClient } from "@/lib/supabase/api";
import {
	BOOKMARK_CATEGORIES_TABLE_NAME,
	BOOKMARK_TAGS_TABLE_NAME,
	MAIN_TABLE_NAME,
} from "@/utils/constants";
import { HttpStatus } from "@/utils/error-utils/common";

const ROUTE = "fetch-discoverable-by-id";

const FetchDiscoverableByIdQuerySchema = z.object({
	id: z.coerce.number().int().positive(),
});

const MetadataSchema = z.object({
	coverImage: z.string().nullable().optional(),
	favIcon: z.string().nullable().optional(),
	height: z.number().nullable().optional(),
	iframeAllowed: z.boolean().nullable().optional(),
	img_caption: z.string().nullable().optional(),
	isOgImagePreferred: z.boolean().optional(),
	isPageScreenshot: z.boolean().nullable().optional(),
	mediaType: z.string().nullable().optional(),
	ocr: z.string().nullable().optional(),
	ogImgBlurUrl: z.string().nullable().optional(),
	screenshot: z.string().nullable().optional(),
	twitter_avatar_url: z.string().nullable().optional(),
	video_url: z.string().nullable().optional(),
	width: z.number().nullable().optional(),
});

// Simplified schemas for what's actually returned
const TagSchema = z.object({
	id: z.number(),
	name: z.string(),
});

const CategorySchema = z.object({
	id: z.number(),
	category_name: z.string(),
	category_slug: z.string(),
	icon: z.string().nullable(),
	icon_color: z.string(),
});

const BookmarkViewDataTypesSchema = z.object({
	bookmarksView: z.string(),
	cardContentViewArray: z.array(z.string()),
	moodboardColumns: z.array(z.number()),
	sortBy: z.string(),
});

const ProfilesTableTypesSchema = z.object({
	bookmarks_view: BookmarkViewDataTypesSchema,
	category_order: z.array(z.number()),
	display_name: z.string(),
	id: z.string(),
	preferred_og_domains: z.array(z.string()).nullable().optional(),
	profile_pic: z.string(),
	user_name: z.string(),
});

const DiscoverableBookmarkSchema = z.object({
	id: z.number(),
	inserted_at: z.string(),
	title: z.string().nullable(),
	url: z.string().nullable(),
	description: z.string().nullable(),
	ogImage: z.string().nullable(),
	screenshot: z.string().nullable(),
	category_id: z.number(),
	trash: z.string().nullable(),
	type: z.string().nullable(),
	meta_data: MetadataSchema.nullable(),
	sort_index: z.string().nullable(),
	make_discoverable: z.string().nullable(),
	addedTags: z.array(TagSchema).optional(),
	addedCategories: z.array(CategorySchema).optional(),
	user_id: ProfilesTableTypesSchema.nullable(),
});

const FetchDiscoverableByIdResponseSchema = DiscoverableBookmarkSchema;

export const GET = createGetApiHandler({
	inputSchema: FetchDiscoverableByIdQuerySchema,
	outputSchema: FetchDiscoverableByIdResponseSchema,
	route: ROUTE,
	handler: async ({ input, route }) => {
		const { id } = input;

		console.log("[route] API called:", { id });
		const { supabase } = await createApiClient();

		// Fetch the main bookmark data with user profile
		const { data, error } = await supabase
			.from(MAIN_TABLE_NAME)
			.select(
				`
				id,
				inserted_at,
				title,
				url,
				description,
				ogImage,
				screenshot,
				category_id,
				trash,
				type,
				meta_data,
				sort_index,
				make_discoverable,
				user_id (
					bookmarks_view,
					category_order,
					display_name,
 					id,
					preferred_og_domains,
					profile_pic,
 					user_name
				)
			`,
			)
			.eq("id", id)
			.is("trash", null)
			.not("make_discoverable", "is", null)
			.maybeSingle();

		if (error) {
			return apiError({
				route,
				message: "Failed to fetch discoverable bookmark",
				error,
				operation: "fetch_discoverable_bookmark_by_id",
				extra: { id },
			});
		}

		if (!data) {
			return apiWarn({
				route,
				message: "Bookmark not found or not discoverable",
				status: HttpStatus.NOT_FOUND,
				context: { id },
			});
		}

		// Fetch tags via junction table
		const { data: tagsData, error: tagsError } = await supabase
			.from(BOOKMARK_TAGS_TABLE_NAME)
			.select(
				`
				bookmark_id,
				tag_id (
					id,
					name
				)
			`,
			)
			.eq("bookmark_id", id);

		if (tagsError) {
			return apiError({
				route,
				message: "Failed to fetch bookmark tags",
				error: tagsError,
				operation: "fetch_bookmark_tags",
				extra: { id },
			});
		}

		// Fetch categories via junction table
		const { data: categoriesData, error: categoriesError } = await supabase
			.from(BOOKMARK_CATEGORIES_TABLE_NAME)
			.select(
				`
				bookmark_id,
				category_id (
					id,
					category_name,
					category_slug,
					icon,
					icon_color
				)
			`,
			)
			.eq("bookmark_id", id);

		if (categoriesError) {
			return apiError({
				route,
				message: "Failed to fetch bookmark categories",
				error: categoriesError,
				operation: "fetch_bookmark_categories",
				extra: { id },
			});
		}

		// Map tags to the expected format, filtering out null join rows
		const addedTags =
			(
				tagsData as unknown as Array<{
					bookmark_id: number;
					tag_id: { id: number; name: string } | null;
				}>
			)
				?.filter((item) => item.tag_id !== null)
				.map((item) => ({
					id: item.tag_id?.id ?? 0,
					name: item.tag_id?.name,
				})) ?? [];

		// Map categories to the expected format, filtering out null join rows
		const addedCategories =
			(
				categoriesData as unknown as Array<{
					bookmark_id: number;
					category_id: {
						id: number;
						category_name: string;
						category_slug: string;
						icon: string | null;
						icon_color: string;
					} | null;
				}>
			)
				?.filter((item) => item.category_id !== null)
				.map((item) => ({
					id: item.category_id?.id ?? 0,
					category_name: item.category_id?.category_name ?? "",
					category_slug: item.category_id?.category_slug ?? "",
					icon: item.category_id?.icon ?? "",
					icon_color: item.category_id?.icon_color ?? "",
				})) ?? [];

		console.log(`[${route}] Discoverable bookmark fetched successfully:`, {
			bookmarkId: data.id,
			tagsCount: addedTags.length,
			categoriesCount: addedCategories.length,
		});

		// Type assertion for the complete response
		const response = {
			...data,
			addedTags,
			addedCategories,
		} as z.infer<typeof DiscoverableBookmarkSchema>;

		return response;
	},
});
