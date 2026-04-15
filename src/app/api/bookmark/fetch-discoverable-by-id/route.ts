import type { FetchDiscoverableByIdResponse } from "./schema";

import { createGetApiHandler } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { createApiClient } from "@/lib/supabase/api";
import {
  BOOKMARK_CATEGORIES_TABLE_NAME,
  BOOKMARK_TAGS_TABLE_NAME,
  MAIN_TABLE_NAME,
} from "@/utils/constants";
import { HttpStatus } from "@/utils/error-utils/common";
import { toDbType } from "@/utils/type-utils";

import { FetchDiscoverableByIdQuerySchema, FetchDiscoverableByIdResponseSchema } from "./schema";

const ROUTE = "fetch-discoverable-by-id";

export const GET = createGetApiHandler({
  handler: async ({ input, route }) => {
    const { id } = input;

    console.log("[route] API called:", { id });
    const { supabase } = await createApiClient();

    // Fetch the main bookmark data
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
				trash,
				type,
				meta_data,
				sort_index,
				make_discoverable
			`,
      )
      .eq("id", id)
      .is("trash", null)
      .not("make_discoverable", "is", null)
      .maybeSingle();

    if (error) {
      return apiError({
        error,
        extra: { id },
        message: "Failed to fetch discoverable bookmark",
        operation: "fetch_discoverable_bookmark_by_id",
        route,
      });
    }

    if (!data) {
      return apiWarn({
        context: { id },
        message: "Bookmark not found or not discoverable",
        route,
        status: HttpStatus.NOT_FOUND,
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
        error: tagsError,
        extra: { id },
        message: "Failed to fetch bookmark tags",
        operation: "fetch_bookmark_tags",
        route,
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
        error: categoriesError,
        extra: { id },
        message: "Failed to fetch bookmark categories",
        operation: "fetch_bookmark_categories",
        route,
      });
    }

    const addedTags =
      tagsData
        ?.filter((item) => item.tag_id !== null)
        .map((item) => ({
          id: item.tag_id?.id ?? 0,
          name: item.tag_id?.name,
        })) ?? [];

    const addedCategories =
      categoriesData
        ?.filter((item) => item.category_id !== null)
        .map((item) => ({
          category_name: item.category_id?.category_name ?? "",
          category_slug: item.category_id?.category_slug ?? "",
          icon: item.category_id?.icon ?? "",
          icon_color: item.category_id?.icon_color ?? "",
          id: item.category_id?.id ?? 0,
        })) ?? [];

    console.log(`[${route}] Discoverable bookmark fetched successfully:`, {
      bookmarkId: data.id,
      categoriesCount: addedCategories.length,
      tagsCount: addedTags.length,
    });

    return toDbType<FetchDiscoverableByIdResponse>({
      ...data,
      addedCategories,
      addedTags,
    });
  },
  inputSchema: FetchDiscoverableByIdQuerySchema,
  outputSchema: FetchDiscoverableByIdResponseSchema,
  route: ROUTE,
});
