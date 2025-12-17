import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { createApiClient } from "@/lib/supabase/api";
import { MAIN_TABLE_NAME, PAGINATION_LIMIT } from "@/utils/constants";
import { HttpStatus } from "@/utils/error-utils/common";

const ROUTE = "fetch-discover-bookmarks";

const FetchDiscoverBookmarksQuerySchema = z.object({
	page: z.coerce.number().int().nonnegative(),
});

const getRange = (page: number) => {
	const rangeStart = page * PAGINATION_LIMIT;
	const rangeEnd = (page + 1) * PAGINATION_LIMIT - 1;

	return { rangeEnd, rangeStart };
};

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const pageParam = searchParams.get("page");

		// Parse and validate query parameters
		const queryParseResult = FetchDiscoverBookmarksQuerySchema.safeParse({
			page: pageParam,
		});

		if (!queryParseResult.success) {
			return apiWarn({
				route: ROUTE,
				message: "Invalid query parameters",
				status: HttpStatus.BAD_REQUEST,
				context: { errors: queryParseResult.error.issues },
			});
		}

		const page = queryParseResult.data.page;
		const { rangeEnd, rangeStart } = getRange(page);

		// Entry point log
		console.log(`[${ROUTE}] API called:`, {
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
				route: ROUTE,
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

		console.log(`[${ROUTE}] Discoverable bookmarks fetched successfully:`, {
			count: data?.length ?? 0,
		});

		return NextResponse.json({ data, error: null }, { status: HttpStatus.OK });
	} catch (error) {
		return apiError({
			route: ROUTE,
			message: "An unexpected error occurred",
			error,
			operation: "fetch_discover_bookmarks_unexpected",
		});
	}
}
