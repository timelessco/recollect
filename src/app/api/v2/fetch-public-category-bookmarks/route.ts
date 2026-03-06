import { type PostgrestError } from "@supabase/supabase-js";

import {
	FetchPublicCategoryBookmarksInputSchema,
	FetchPublicCategoryBookmarksOutputSchema,
} from "./schema";
import { createGetApiHandler } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import {
	BOOKMARK_CATEGORIES_TABLE_NAME,
	CATEGORIES_TABLE_NAME,
	MAIN_TABLE_NAME,
	PAGINATION_LIMIT,
} from "@/utils/constants";
import { createServiceClient } from "@/utils/supabaseClient";

const ROUTE = "v2-fetch-public-category-bookmarks";

export const GET = createGetApiHandler({
	inputSchema: FetchPublicCategoryBookmarksInputSchema,
	outputSchema: FetchPublicCategoryBookmarksOutputSchema,
	route: ROUTE,
	handler: async ({ input, route }) => {
		const { category_slug: categorySlug, user_name: userName } = input;
		const page = Math.max(0, Math.floor(input.page ?? 0));
		const limit = Math.max(
			1,
			Math.min(100, Math.floor(input.limit ?? PAGINATION_LIMIT)),
		);

		console.log(`[${route}] API called:`, { categorySlug, userName });

		const supabase = createServiceClient();

		const { data: categoryData, error: categoryError } = (await supabase
			.from(CATEGORIES_TABLE_NAME)
			.select(
				`
				id,
				user_id (
					email,
					user_name
				),
				category_views,
				icon,
				icon_color,
				category_name,
				is_public
			`,
			)
			.eq("category_slug", categorySlug)) as unknown as {
			data: Array<{
				category_name: string | null;
				category_views: unknown;
				icon: string | null;
				icon_color: string | null;
				id: number;
				is_public: boolean | null;
				user_id: {
					email: string | null;
					user_name: string | null;
				};
			}>;
			error: PostgrestError;
		};

		if (categoryError) {
			return apiError({
				route,
				message: "Failed to fetch category",
				error: categoryError,
				operation: "fetch_category",
				extra: { categorySlug },
			});
		}

		if (categoryData.at(0)?.user_id?.user_name !== userName) {
			console.log(`[${route}] Username mismatch from URL query`);
			return apiWarn({
				route,
				message: "Username mismatch from URL query",
				status: 404,
				context: { categorySlug, userName },
			});
		}

		const category = categoryData.at(0);
		const sortBy = (category?.category_views as { sortBy?: string } | null)
			?.sortBy;
		const categoryId = category?.id;

		if (!categoryId) {
			return apiWarn({
				route,
				message: "Category not found",
				status: 404,
				context: { categorySlug },
			});
		}

		let query = supabase
			.from(MAIN_TABLE_NAME)
			.select(
				`
				*,
				${BOOKMARK_CATEGORIES_TABLE_NAME}!inner (
					category_id (
						id,
						category_name,
						category_slug,
						is_public,
						icon,
						icon_color
					)
				),
				user_id!inner (id, profile_pic)
			`,
			)
			.eq(`${BOOKMARK_CATEGORIES_TABLE_NAME}.category_id`, categoryId)
			.is("trash", null);

		if (sortBy === "date-sort-ascending") {
			query = query.order("id", { ascending: false });
		}

		if (sortBy === "date-sort-descending") {
			query = query.order("id", { ascending: true });
		}

		if (sortBy === "alphabetical-sort-ascending") {
			query = query.order("title", { ascending: true });
		}

		if (sortBy === "alphabetical-sort-descending") {
			query = query.order("title", { ascending: false });
		}

		const from = page * limit;
		const to = from + limit - 1;
		query = query.range(from, to);

		const { data: rawData, error: bookmarkError } = await query;

		if (bookmarkError) {
			return apiError({
				route,
				message: "Failed to fetch bookmarks",
				error: bookmarkError,
				operation: "fetch_public_category_bookmarks",
				extra: { categoryId, categorySlug },
			});
		}

		const bookmarks = (rawData as Array<Record<string, unknown>>)?.map(
			(item) => {
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { [BOOKMARK_CATEGORIES_TABLE_NAME]: _junction, ...rest } = item;
				return rest;
			},
		);

		return {
			bookmarks: bookmarks ?? [],
			categoryName: category?.category_name ?? null,
			categoryViews: category?.category_views ?? null,
			icon: category?.icon ?? null,
			iconColor: category?.icon_color ?? null,
			isPublic: category?.is_public ?? null,
		};
	},
});
