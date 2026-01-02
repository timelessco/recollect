import { z } from "zod";

import { createSupabaseGetApiHandler } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { createApiClient } from "@/lib/supabase/api";
import { MAIN_TABLE_NAME, PAGINATION_LIMIT } from "@/utils/constants";

const ROUTE = "fetch-discoverable-bookmarks";

const FetchDiscoverBookmarksQuerySchema = z.object({
	page: z.coerce.number().int().nonnegative(),
});

const FetchDiscoverBookmarksResponseSchema = z.array(z.any()).nullable();

const getRange = (page: number) => {
	const rangeStart = page * PAGINATION_LIMIT;
	const rangeEnd = (page + 1) * PAGINATION_LIMIT - 1;

	return { rangeEnd, rangeStart };
};

export const GET = createSupabaseGetApiHandler({
	inputSchema: FetchDiscoverBookmarksQuerySchema,
	outputSchema: FetchDiscoverBookmarksResponseSchema,
	route: ROUTE,
	handler: async ({ input, route }) => {
		const { page } = input;
		const { rangeEnd, rangeStart } = getRange(page);

		// Entry point log
		console.log(`[${route}] API called:`, {
			page,
			rangeStart,
			rangeEnd,
		});

		const { supabase } = await createApiClient();

		const { data, error } = await supabase
			.from(MAIN_TABLE_NAME)
			.select("*")
			.eq("trash", false)
			.not("make_discoverable", "is", null)
			.order("make_discoverable", { ascending: false })
			.range(rangeStart, rangeEnd);

		if (error) {
			return apiError({
				route,
				message: "Failed to fetch discoverable bookmarks",
				error,
				operation: "fetch_discoverable_bookmarks",
				extra: {
					page,
					rangeStart,
					rangeEnd,
				},
			});
		}

		console.log(`[${route}] Discoverable bookmarks fetched successfully:`, {
			count: data?.length ?? 0,
		});

		return data;
	},
});
