import { createGetApiHandler } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { createApiClient } from "@/lib/supabase/api";
import { MAIN_TABLE_NAME, PAGINATION_LIMIT } from "@/utils/constants";

import { FetchDiscoverBookmarksQuerySchema, FetchDiscoverBookmarksResponseSchema } from "./schema";

const ROUTE = "fetch-bookmarks-discoverable";

const getRange = (page: number) => {
  const rangeStart = page * PAGINATION_LIMIT;
  const rangeEnd = (page + 1) * PAGINATION_LIMIT - 1;

  return { rangeEnd, rangeStart };
};

export const GET = createGetApiHandler({
  handler: async ({ input, route }) => {
    const { page } = input;
    const { rangeEnd, rangeStart } = getRange(page);

    console.log(`[${route}] API called:`, {
      page,
      rangeEnd,
      rangeStart,
    });

    const { supabase } = await createApiClient();

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
      .is("trash", null)
      .not("make_discoverable", "is", null)
      .order("make_discoverable", { ascending: true })
      .range(rangeStart, rangeEnd);

    if (error) {
      return apiError({
        error,
        extra: {
          page,
          rangeEnd,
          rangeStart,
        },
        message: "Failed to fetch discoverable bookmarks",
        operation: "fetch_discoverable_bookmarks",
        route,
      });
    }

    console.log(`[${route}] Discoverable bookmarks fetched successfully:`, {
      count: data.length,
    });

    return data;
  },
  inputSchema: FetchDiscoverBookmarksQuerySchema,
  outputSchema: FetchDiscoverBookmarksResponseSchema,
  route: ROUTE,
});
