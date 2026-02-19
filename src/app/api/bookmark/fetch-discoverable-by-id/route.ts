import {
	FetchDiscoverableByIdQuerySchema,
	FetchDiscoverableByIdResponseSchema,
	type FetchDiscoverableByIdResponse,
} from "./schema";
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
		} as FetchDiscoverableByIdResponse;

		return response;
	},
});
