import { type NextApiResponse } from "next/dist/shared/lib/utils";
import * as Sentry from "@sentry/nextjs";
import { type PostgrestError } from "@supabase/supabase-js";
import axios from "axios";
import { type VerifyErrors } from "jsonwebtoken";
import { type z } from "zod";

import {
	type AddBookmarkMinDataPayloadTypes,
	type NextApiRequest,
	type SingleListData,
} from "../../../../../types/apiTypes";
import { getBookmarkBodySchema } from "../../../../../utils/api/bookmark/add";
import { formatErrorMessage } from "../../../../../utils/api/bookmark/errorHandling";
import {
	ADD_BOOKMARK_MIN_DATA_API,
	getBaseUrl,
	NEXT_API_URL,
} from "../../../../../utils/constants";
import {
	apiCookieParser,
	checkIfUrlAnImage,
} from "../../../../../utils/helpers";
import { apiSupabaseClient } from "../../../../../utils/supabaseServerClient";

type ApiResponse = {
	data: SingleListData[] | null;
	error: PostgrestError | VerifyErrors | string | null;
	message: string | null;
};

type MinDataApiResponse = {
	data: ApiResponse;
	status: number;
};

/**
 * Helper function to call the min-data API
 */
const callMinDataApi = async (
	bodyData: z.infer<ReturnType<typeof getBookmarkBodySchema>>,
	cookies: { [key: string]: string },
): Promise<MinDataApiResponse> => {
	try {
		const minDataResponse = await axios.post(
			`${getBaseUrl()}${NEXT_API_URL}${ADD_BOOKMARK_MIN_DATA_API}`,
			bodyData,
			{
				headers: {
					Cookie: apiCookieParser(cookies),
				},
			},
		);

		return {
			status: minDataResponse.status,
			data: minDataResponse.data,
		};
	} catch (error) {
		const errorMessage = formatErrorMessage(error);
		Sentry.captureException("Error calling min-data API", {
			extra: { error: errorMessage },
		});
		return {
			status: 500,
			data: {
				error: "Failed to process bookmark",
				message: errorMessage,
				data: null,
			},
		};
	}
};

/**
 * /api/v1/bookmarks/add/data:
 *   post:
 *     summary: Add a new bookmark
 *     description: Main endpoint to add a new bookmark. Orchestrates min-data, screenshot and remaining data processing.
 *     tags:
 *       - Bookmarks
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *               - category_id
 *               - update_access
 *             properties:
 *               url:
 *                 type: string
 *                 description: URL to bookmark
 *               category_id:
 *                 type: number
 *                 description: Category ID to add bookmark to
 *               update_access:
 *                 type: boolean
 *                 description: Whether user has update access
 *     responses:
 *       200:
 *         description: Bookmark added successfully
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - User does not have update access
 *       409:
 *         description: Bookmark already exists in category
 *       500:
 *         description: Internal server error
 */
export default async function handler(
	request: NextApiRequest<AddBookmarkMinDataPayloadTypes>,
	response: NextApiResponse<ApiResponse>,
) {
	const supabase = apiSupabaseClient(request, response);

	if (request.method !== "POST") {
		response.status(405).send({
			error: "Only POST requests allowed",
			message: "Only POST requests allowed",
			data: null,
		});
		return;
	}

	// Validate request body
	const schema = getBookmarkBodySchema();
	let bodyData;
	try {
		bodyData = schema.parse(request.body);
	} catch (parseError) {
		const errorMessage = formatErrorMessage(parseError);

		response.status(400).send({
			error: "Invalid request body",
			message: errorMessage,
			data: null,
		});
		return;
	}

	// Call min-data API and forward the response
	const { status, data } = await callMinDataApi(
		bodyData,
		(request?.cookies as { [key: string]: string }) ?? {},
	);

	// If min-data API failed, return error
	if (status !== 200 || !data?.data?.length) {
		response.status(status).json(data);
		return;
	}

	// Get bookmark ID from response
	const bookmarkData = data.data[0];
	if (!bookmarkData?.id) {
		response.status(500).json({
			error: "Failed to create bookmark",
			message: "No bookmark ID returned from min-data API",
			data: null,
		});
		return;
	}

	// Send immediate response to client with the bookmark data
	response.status(status).json(data);

	// Queue the remaining work (screenshot and remaining data processing)
	try {
		// Check if URL is an image
		const isUrlOfMimeType = await checkIfUrlAnImage(bodyData?.url);

		// Queue message with all necessary data for background processing
		const queuePayload = {
			bookmarkId: bookmarkData.id,
			url: bodyData.url,
			userId: bookmarkData.user_id,
			favIcon: bookmarkData.meta_data?.favIcon ?? null,
			isImage: isUrlOfMimeType,
		};

		const queueResult = await supabase.schema("pgmq_public").rpc("send", {
			queue_name: "add-bookmark-url-queue",
			message: queuePayload,
		});

		if (queueResult.error) {
			console.error("Failed to queue background job:", queueResult.error);
			Sentry.captureException("Failed to queue background job", {
				extra: {
					error: queueResult.error,
					bookmarkId: bookmarkData.id,
				},
			});
		} else {
			console.log(`✅ Queued background job for bookmark ${bookmarkData.id}`);
		}
	} catch (error) {
		// Log error but don't fail the request since we already sent the response
		const errorMessage = formatErrorMessage(error);
		console.error("Error queuing background job:", errorMessage);
		Sentry.captureException("Error queuing background job", {
			extra: { error: errorMessage, bookmarkId: bookmarkData.id },
		});
	}
}
