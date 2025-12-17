import { type NextRequest } from "next/server";
import { z } from "zod";

import { apiError, apiSuccess, apiWarn } from "@/lib/api-helpers/response";
import { createApiClient } from "@/lib/supabase/api";
import { MAIN_TABLE_NAME, PAGINATION_LIMIT } from "@/utils/constants";
import { HttpStatus } from "@/utils/error-utils/common";

const ROUTE = "fetch-discover-bookmarks";

const FetchDiscoverBookmarksQuerySchema = z.object({
	from: z
		.string()
		.optional()
		.transform((val) => {
			if (!val) {
				return 0;
			}

			const parsed = Number.parseInt(val, 10);
			return Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
		}),
});

// Response schema - validates array of bookmark objects
// Using z.any() for complex nested types (user_id, meta_data, etc.) as they're validated by TypeScript
const FetchDiscoverBookmarksResponseSchema = z.array(z.any());

const getRange = (from: number) => {
	const start = Number.isNaN(from) || from < 0 ? 0 : from;
	const rangeStart = start;
	const rangeEnd = start + PAGINATION_LIMIT - 1;

	return { rangeEnd, rangeStart };
};

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const fromParam = searchParams.get("from") ?? "0";

		// Parse and validate query parameters
		const queryParseResult = FetchDiscoverBookmarksQuerySchema.safeParse({
			from: fromParam,
		});

		if (!queryParseResult.success) {
			return apiWarn({
				route: ROUTE,
				message: "Invalid query parameters",
				status: HttpStatus.BAD_REQUEST,
				context: { errors: queryParseResult.error.issues },
			});
		}

		const from = queryParseResult.data.from;
		const { rangeEnd, rangeStart } = getRange(from);

		// Entry point log
		console.log(`[${ROUTE}] API called:`, {
			from,
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
				route: ROUTE,
				message: "Failed to fetch discoverable bookmarks",
				error,
				operation: "fetch_discoverable_bookmarks",
				extra: {
					from,
					rangeStart,
					rangeEnd,
				},
			});
		}

		console.log(`[${ROUTE}] Discoverable bookmarks fetched successfully:`, {
			count: data?.length ?? 0,
		});

		return apiSuccess({
			route: ROUTE,
			data: data ?? [],
			schema: FetchDiscoverBookmarksResponseSchema,
		});
	} catch (error) {
		return apiError({
			route: ROUTE,
			message: "An unexpected error occurred",
			error,
			operation: "fetch_discover_bookmarks_unexpected",
		});
	}
}
