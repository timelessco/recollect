import { type NextApiRequest, type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { type PostgrestError } from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";

import { type SingleListData } from "../../../types/apiTypes";
import { MAIN_TABLE_NAME, PAGINATION_LIMIT } from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

type Data = {
	data: SingleListData[] | null;
	error: PostgrestError | VerifyErrors | { message: string } | null;
};

const getRange = (from: number) => {
	const start = Number.isNaN(from) || from < 0 ? 0 : from;
	const rangeStart = start;
	const rangeEnd = start + PAGINATION_LIMIT - 1;

	return { rangeEnd, rangeStart };
};

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse<Data>,
) {
	try {
		if (request.method !== "GET") {
			response.status(405).json({
				data: null,
				error: { message: "Method not allowed" },
			});
			return;
		}

		const supabase = apiSupabaseClient(request, response);

		const from = Number.parseInt((request.query.from as string) ?? "0", 10);
		const { rangeEnd, rangeStart } = getRange(from);

		// Entry point log
		console.log("fetch-discover-bookmarks API called:", {
			from,
			rangeStart,
			rangeEnd,
		});

		const {
			data,
			error,
		}: { data: SingleListData[] | null; error: Data["error"] } = await supabase
			.from(MAIN_TABLE_NAME)
			.select("*")
			.eq("trash", false)
			.not("make_discoverable", "is", null)
			.order("make_discoverable", { ascending: false })
			.range(rangeStart, rangeEnd);

		if (error) {
			console.error("Error fetching discoverable bookmarks:", error);
			Sentry.captureException(error, {
				tags: {
					operation: "fetch_discoverable_bookmarks",
				},
				extra: {
					from,
					rangeStart,
					rangeEnd,
				},
			});
			response.status(500).json({ data: null, error });
			return;
		}

		console.log("Discoverable bookmarks fetched successfully:", {
			count: data?.length ?? 0,
		});
		response.status(200).json({ data, error: null });
	} catch (error) {
		console.error("Unexpected error in fetch-discover-bookmarks:", error);
		Sentry.captureException(error, {
			tags: {
				operation: "fetch_discover_bookmarks_unexpected",
			},
		});
		response.status(500).json({
			data: null,
			error: { message: "An unexpected error occurred" },
		});
	}
}
