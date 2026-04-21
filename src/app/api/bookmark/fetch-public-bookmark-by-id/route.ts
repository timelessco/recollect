import type { FetchPublicBookmarkByIdResponse } from "./schema";

import { createGetApiHandler } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { createServerServiceClient } from "@/lib/supabase/service";
import {
  BOOKMARK_CATEGORIES_TABLE_NAME,
  CATEGORIES_TABLE_NAME,
  MAIN_TABLE_NAME,
} from "@/utils/constants";
import { toDbType } from "@/utils/type-utils";

import {
  FetchPublicBookmarkByIdQuerySchema,
  FetchPublicBookmarkByIdResponseSchema,
} from "./schema";

const ROUTE = "fetch-public-bookmark-by-id";

/**
 * @deprecated Use /api/v2/bookmark/fetch-public-bookmark-by-id instead. Retained for iOS and extension clients.
 */
export const GET = createGetApiHandler({
  handler: async ({ input, route }) => {
    const { bookmark_id: bookmarkId, category_slug: categorySlug, user_name: userName } = input;

    console.log(`[${route}] API called:`, {
      bookmarkId,
      categorySlug,
      userName,
    });

    const supabase = createServerServiceClient();

    const { data: categoryData, error: categoryError } = await supabase
      .from(CATEGORIES_TABLE_NAME)
      .select(
        `
				id,
				user_id (
					user_name
				),
				is_public
			`,
      )
      .eq("category_slug", categorySlug)
      .maybeSingle();

    if (categoryError) {
      return apiError({
        error: categoryError,
        extra: { categorySlug },
        message: "Failed to fetch category",
        operation: "fetch_category",
        route,
      });
    }

    if (!categoryData) {
      console.log(`[${route}] Category not found:`, { categorySlug });
      return apiWarn({
        context: { categorySlug },
        message: "Category not found",
        route,
        status: 404,
      });
    }

    // Verify username matches
    if (categoryData.user_id?.user_name !== userName) {
      console.log(`[${route}] Username mismatch:`, {
        expected: categoryData.user_id?.user_name,
        provided: userName,
      });
      return apiWarn({
        context: { categorySlug, userName },
        message: "Username mismatch",
        route,
        status: 404,
      });
    }

    if (!categoryData.is_public) {
      console.log(`[${route}] Category is not public:`, { categorySlug });
      return apiWarn({
        context: { categorySlug },
        message: "Category is not public",
        route,
        status: 403,
      });
    }

    const categoryId = categoryData.id;

    console.log(`[${route}] Category verified:`, {
      categoryId,
      isPublic: categoryData.is_public,
    });

    const { data: bookmarkData, error: bookmarkError } = await supabase
      .from(MAIN_TABLE_NAME)
      .select(
        `
				*,
				${BOOKMARK_CATEGORIES_TABLE_NAME}!inner (
					category_id
				),
				user_id!inner (
					user_name
				)
			`,
      )
      .eq("id", bookmarkId)
      .eq(`${BOOKMARK_CATEGORIES_TABLE_NAME}.category_id`, categoryId)
      .is("trash", null)
      .maybeSingle();

    if (bookmarkError) {
      return apiError({
        error: bookmarkError,
        extra: { bookmarkId, categoryId },
        message: "Failed to fetch bookmark",
        operation: "fetch_bookmark",
        route,
      });
    }

    if (!bookmarkData) {
      console.log(`[${route}] Bookmark not found in category:`, {
        bookmarkId,
        categoryId,
      });
      return apiWarn({
        context: { bookmarkId, categoryId },
        message: "Bookmark not found in category",
        route,
        status: 404,
      });
    }

    const { [BOOKMARK_CATEGORIES_TABLE_NAME]: _removed, ...cleanedBookmark } = bookmarkData;

    console.log(`[${route}] Bookmark fetched successfully:`, {
      bookmarkId: cleanedBookmark.id,
    });

    return toDbType<FetchPublicBookmarkByIdResponse>(cleanedBookmark);
  },
  inputSchema: FetchPublicBookmarkByIdQuerySchema,
  outputSchema: FetchPublicBookmarkByIdResponseSchema,
  route: ROUTE,
});
