import { createGetApiHandler } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { createServerServiceClient } from "@/lib/supabase/service";
import {
  BOOKMARK_CATEGORIES_TABLE_NAME,
  CATEGORIES_TABLE_NAME,
  MAIN_TABLE_NAME,
  PAGINATION_LIMIT,
} from "@/utils/constants";

import {
  FetchPublicCategoryBookmarksInputSchema,
  FetchPublicCategoryBookmarksOutputSchema,
} from "./schema";

const ROUTE = "v2-fetch-public-category-bookmarks";

export const GET = createGetApiHandler({
  handler: async ({ input, route }) => {
    const { category_slug: categorySlug, user_name: userName } = input;
    const page = Math.max(0, Math.floor(input.page ?? 0));
    const limit = Math.max(1, Math.min(100, Math.floor(input.limit ?? PAGINATION_LIMIT)));

    console.log(`[${route}] API called:`, { categorySlug, userName });

    const supabase = createServerServiceClient();

    const { data: categoryData, error: categoryError } = await supabase
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
      .eq("category_slug", categorySlug);

    if (categoryError) {
      return apiError({
        error: categoryError,
        extra: { categorySlug },
        message: "Failed to fetch category",
        operation: "fetch_category",
        route,
      });
    }

    if (categoryData.at(0)?.user_id?.user_name !== userName) {
      console.log(`[${route}] Username mismatch from URL query`);
      return apiWarn({
        context: { categorySlug, userName },
        message: "Username mismatch from URL query",
        route,
        status: 404,
      });
    }

    const category = categoryData.at(0);
    const views = category?.category_views;
    const rawSortBy =
      typeof views === "object" && views !== null && !Array.isArray(views)
        ? views.sortBy
        : undefined;
    const sortBy = typeof rawSortBy === "string" ? rawSortBy : undefined;
    const categoryId = category?.id;

    if (!categoryId) {
      return apiWarn({
        context: { categorySlug },
        message: "Category not found",
        route,
        status: 404,
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
        error: bookmarkError,
        extra: { categoryId, categorySlug },
        message: "Failed to fetch bookmarks",
        operation: "fetch_public_category_bookmarks",
        route,
      });
    }

    const bookmarks = rawData?.map((item) => {
      const { [BOOKMARK_CATEGORIES_TABLE_NAME]: _junction, ...rest } = item;
      return rest;
    });

    return {
      bookmarks: bookmarks ?? [],
      categoryName: category?.category_name ?? null,
      categoryViews: category?.category_views ?? null,
      icon: category?.icon ?? null,
      iconColor: category?.icon_color ?? null,
      isPublic: category?.is_public ?? null,
    };
  },
  inputSchema: FetchPublicCategoryBookmarksInputSchema,
  outputSchema: FetchPublicCategoryBookmarksOutputSchema,
  route: ROUTE,
});
