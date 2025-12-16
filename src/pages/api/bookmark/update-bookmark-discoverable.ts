import { type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { type PostgrestError } from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";
import { isEmpty } from "lodash";
import { z } from "zod";

import {
	type NextApiRequest,
	type SingleListData,
} from "../../../types/apiTypes";
import { MAIN_TABLE_NAME } from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

type DataResponse = SingleListData[] | null;
type ErrorResponse = PostgrestError | VerifyErrors | { message: string } | null;

type Data = {
	data: DataResponse;
	error: ErrorResponse;
};

const bodySchema = z.object({
	bookmark_id: z
		.number()
		.int()
		.positive("Bookmark ID must be a positive integer"),
	make_discoverable: z.boolean(),
});

export default async function handler(
	request: NextApiRequest<{
		bookmark_id: number;
		make_discoverable: boolean;
	}>,
	response: NextApiResponse<Data>,
): Promise<void> {
	try {
		if (request.method !== "POST") {
			response
				.status(405)
				.json({ data: null, error: { message: "Method not allowed" } });
			return;
		}

		const supabase = apiSupabaseClient(request, response);

		const { data: userData, error: userError } = await supabase.auth.getUser();
		const userId = userData?.user?.id;

		if (userError || !userId) {
			console.warn("User authentication failed:", {
				error: userError?.message,
			});
			response.status(401).json({
				data: null,
				error: { message: "Unauthorized" },
			});
			return;
		}

		const parseResult = bodySchema.safeParse(request.body);

		if (!parseResult.success) {
			console.warn("Invalid request body:", {
				error: parseResult.error.message,
			});
			response.status(400).json({
				data: null,
				error: { message: `Invalid request: ${parseResult.error.message}` },
			});
			return;
		}

		const { bookmark_id: bookmarkId, make_discoverable: makeDiscoverable } =
			parseResult.data;

		// Entry point log
		console.log("update-bookmark-discoverable API called:", {
			userId,
			bookmarkId,
			makeDiscoverable,
		});

		const { data, error }: { data: DataResponse; error: ErrorResponse } =
			await supabase
				.from(MAIN_TABLE_NAME)
				.update({
					make_discoverable: makeDiscoverable ? new Date().toISOString() : null,
				})
				.match({ id: bookmarkId, user_id: userId })
				.select();

		if (error) {
			console.error("Error updating bookmark discoverable status:", error);
			Sentry.captureException(error, {
				tags: {
					operation: "update_bookmark_discoverable",
					userId,
				},
				extra: {
					bookmarkId,
					makeDiscoverable,
				},
			});
			response.status(500).json({ data: null, error });
			return;
		}

		if (isEmpty(data)) {
			console.warn("Bookmark not found or user lacks permission:", {
				bookmarkId,
				userId,
			});
			response.status(404).json({
				data: null,
				error: { message: "Bookmark not found or you lack permission" },
			});
			return;
		}

		console.log("Bookmark discoverable status updated successfully:", {
			bookmarkId: data?.[0]?.id,
			makeDiscoverable,
		});
		response.status(200).json({ data, error: null });
	} catch (error) {
		console.error("Unexpected error in update-bookmark-discoverable:", error);
		Sentry.captureException(error, {
			tags: {
				operation: "update_bookmark_discoverable_unexpected",
			},
		});
		response.status(500).json({
			data: null,
			error: { message: "An unexpected error occurred" },
		});
	}
}
