import { createGetApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { BOOKMARK_MEDIA_CATEGORY_PREDICATES } from "@/utils/bookmark-category-filters";
import {
  AUDIO_URL,
  bookmarkType,
  CATEGORIES_TABLE_NAME,
  DOCUMENTS_URL,
  IMAGES_URL,
  instagramType,
  MAIN_TABLE_NAME,
  SHARED_CATEGORIES_TABLE_NAME,
  tweetType,
  VIDEOS_URL,
} from "@/utils/constants";

import { FetchBookmarksCountInputSchema, FetchBookmarksCountOutputSchema } from "./schema";

const ROUTE = "v2-fetch-bookmarks-count";

export const GET = createGetApiHandlerWithAuth({
  handler: async ({ route, supabase, user }) => {
    const userId = user.id;
    const userEmail = user.email;

    if (!userEmail) {
      return apiError({
        error: new Error("User email not found"),
        message: "User email not found in auth context",
        operation: "validate_user",
        route,
        userId,
      });
    }

    console.log(`[${route}] API called:`, { userId });

    // 12 parallel count queries
    const [
      allResult,
      imagesResult,
      videosResult,
      documentsResult,
      linksResult,
      trashResult,
      uncategorizedResult,
      tweetsResult,
      instagramResult,
      audioResult,
      userCategoriesResult,
      sharedCategoriesResult,
    ] = await Promise.all([
      // allCount — total non-trash bookmarks
      supabase
        .from(MAIN_TABLE_NAME)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("trash", null),
      // imagesCount
      supabase
        .from(MAIN_TABLE_NAME)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("trash", null)
        .or(BOOKMARK_MEDIA_CATEGORY_PREDICATES[IMAGES_URL]),
      // videosCount
      supabase
        .from(MAIN_TABLE_NAME)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("trash", null)
        .or(BOOKMARK_MEDIA_CATEGORY_PREDICATES[VIDEOS_URL]),
      // documentsCount
      supabase
        .from(MAIN_TABLE_NAME)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("trash", null)
        .or(BOOKMARK_MEDIA_CATEGORY_PREDICATES[DOCUMENTS_URL]),
      // linksCount
      supabase
        .from(MAIN_TABLE_NAME)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("trash", null)
        .eq("type", bookmarkType),
      // trashCount
      supabase
        .from(MAIN_TABLE_NAME)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .not("trash", "is", null),
      // uncategorizedCount (category_id: 0 via junction table)
      supabase
        .from(MAIN_TABLE_NAME)
        .select("id, bookmark_categories!inner(category_id)", {
          count: "exact",
          head: true,
        })
        .eq("bookmark_categories.category_id", 0)
        .eq("bookmark_categories.user_id", userId)
        .is("trash", null),
      // tweetsCount
      supabase
        .from(MAIN_TABLE_NAME)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("trash", null)
        .eq("type", tweetType),
      // instagramCount
      supabase
        .from(MAIN_TABLE_NAME)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("trash", null)
        .eq("type", instagramType),
      // audioCount
      supabase
        .from(MAIN_TABLE_NAME)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("trash", null)
        .or(BOOKMARK_MEDIA_CATEGORY_PREDICATES[AUDIO_URL]),
      // User's own category IDs
      supabase.from(CATEGORIES_TABLE_NAME).select("id").eq("user_id", userId),
      // Shared category IDs (includes pending — preserves v1 behavior)
      supabase.from(SHARED_CATEGORIES_TABLE_NAME).select("category_id").eq("email", userEmail),
    ]);

    // Check for errors in any of the count queries
    if (allResult.error) {
      return apiError({
        error: allResult.error,
        message: "Failed to fetch bookmark counts",
        operation: "bookmarks_count_fetch",
        route,
        userId,
      });
    }

    if (userCategoriesResult.error) {
      return apiError({
        error: userCategoriesResult.error,
        message: "Failed to fetch user categories",
        operation: "bookmarks_count_categories",
        route,
        userId,
      });
    }

    if (sharedCategoriesResult.error) {
      return apiError({
        error: sharedCategoriesResult.error,
        message: "Failed to fetch shared categories",
        operation: "bookmarks_count_shared",
        route,
        userId,
      });
    }

    // Build per-category count queries
    const userCategoryIds = userCategoriesResult.data;
    const sharedCategoryIds = sharedCategoriesResult.data;

    if (!userCategoryIds) {
      return apiError({
        error: new Error("User categories data is null"),
        message: "Failed to fetch user categories",
        operation: "bookmarks_count_categories",
        route,
        userId,
      });
    }

    if (!sharedCategoryIds) {
      return apiError({
        error: new Error("Shared categories data is null"),
        message: "Failed to fetch shared categories",
        operation: "bookmarks_count_shared",
        route,
        userId,
      });
    }

    const userCategoryIdList = userCategoryIds.map((item) => item.id);
    const sharedCategoryIdList = sharedCategoryIds.map((item) => item.category_id);

    // Deduplicate category IDs (user + shared may overlap)
    const allCategoryIds = [...new Set([...userCategoryIdList, ...sharedCategoryIdList])];

    // Parallel per-category count queries
    const categoryCountResults = await Promise.all(
      allCategoryIds.map(async (categoryId) => {
        const { count } = await supabase
          .from(MAIN_TABLE_NAME)
          .select("id, bookmark_categories!inner(category_id)", {
            count: "exact",
            head: true,
          })
          .eq("bookmark_categories.category_id", categoryId)
          .is("trash", null);

        return {
          category_id: categoryId,
          count: count ?? 0,
        };
      }),
    );

    return {
      allCount: allResult.count ?? 0,
      audioCount: audioResult.count ?? 0,
      categoryCount: categoryCountResults,
      documentsCount: documentsResult.count ?? 0,
      imagesCount: imagesResult.count ?? 0,
      instagramCount: instagramResult.count ?? 0,
      linksCount: linksResult.count ?? 0,
      trashCount: trashResult.count ?? 0,
      tweetsCount: tweetsResult.count ?? 0,
      uncategorizedCount: uncategorizedResult.count ?? 0,
      videosCount: videosResult.count ?? 0,
    };
  },
  inputSchema: FetchBookmarksCountInputSchema,
  outputSchema: FetchBookmarksCountOutputSchema,
  route: ROUTE,
});
