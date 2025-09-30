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
import { getBaseUrl, NEXT_API_URL } from "../../../../../utils/constants";
import {
	apiCookieParser,
	checkIfUrlAnImage,
} from "../../../../../utils/helpers";

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
			`${getBaseUrl()}${NEXT_API_URL}v1/bookmarks/add/tasks/min-data`,
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
 * Helper function to call the remaining data API
 */
const callRemainingApi = async (
	minDataResponse: ApiResponse,
	url: string,
	cookies: { [key: string]: string },
): Promise<MinDataApiResponse> => {
	try {
		// Get the bookmark ID from the min-data response
		const bookmarkData = minDataResponse.data?.[0];
		if (!bookmarkData?.id) {
			throw new Error("No bookmark ID found in min-data response");
		}

		const remainingResponse = await axios.post(
			`${getBaseUrl()}${NEXT_API_URL}v1/bookmarks/add/tasks/remaining`,
			{
				id: bookmarkData.id,
				url,
				favIcon: bookmarkData.meta_data?.favIcon ?? null,
			},
			{
				headers: {
					Cookie: apiCookieParser(cookies),
				},
			},
		);

		return {
			status: remainingResponse.status,
			data: remainingResponse.data,
		};
	} catch (error) {
		const errorMessage = formatErrorMessage(error);
		Sentry.captureException("Error calling remaining API", {
			extra: { error: errorMessage },
		});
		return {
			status: 500,
			data: {
				error: "Failed to process remaining bookmark data",
				message: errorMessage,
				data: null,
			},
		};
	}
};

/**
 * Helper function to call the screenshot API
 */
const callScreenshotApi = async (
	minDataResponse: ApiResponse,
	url: string,
	cookies: { [key: string]: string },
): Promise<MinDataApiResponse> => {
	try {
		const screenshotResponse = await axios.post(
			`${getBaseUrl()}${NEXT_API_URL}v1/bookmarks/add/tasks/screenshot`,
			{
				id: minDataResponse.data?.[0]?.id,
				url,
			},
			{
				headers: {
					Cookie: apiCookieParser(cookies),
				},
			},
		);

		return {
			status: screenshotResponse.status,
			data: screenshotResponse.data,
		};
	} catch (error) {
		// If it's an axios error with a response, pass through the original error from the screenshot API
		if (axios.isAxiosError(error) && error.response) {
			return {
				status: error.response.status,
				data: error.response.data,
			};
		}

		// For network or other errors, return a generic error
		const errorMessage = formatErrorMessage(error);
		Sentry.captureException("Network error calling screenshot API", {
			extra: { error: errorMessage },
		});
		return {
			status: 500,
			data: {
				error: "Failed to reach screenshot service",
				message: errorMessage,
				data: null,
			},
		};
	}
};

/**
 * @swagger
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
	} else {
		response.status(200).json({
			error: null,
			message: null,
			data: data.data,
		});
	}

	// Check if URL is an image
	const isUrlOfMimeType = await checkIfUrlAnImage(bodyData?.url);

	try {
		if (!isUrlOfMimeType) {
			// For non-image URLs, call screenshot API first
			const screenshotResult = await callScreenshotApi(
				data,
				bodyData.url,
				(request?.cookies as { [key: string]: string }) ?? {},
			);

			if (screenshotResult.status !== 200) {
				console.log("Screenshot Failed");
			} else {
				console.log("Screenshot Success");
			}
		}

		// After screenshot (for non-images) or directly (for images), call remaining API
		const remainingResult = await callRemainingApi(
			data,
			bodyData.url,
			(request?.cookies as { [key: string]: string }) ?? {},
		);

		// Return the remaining API result
		response.status(remainingResult.status).json(remainingResult.data);
	} catch (error) {
		const errorMessage = formatErrorMessage(error);
		Sentry.captureException("Error in processing APIs queue", {
			extra: { error: errorMessage },
		});
		response.status(500).json({
			error: "Failed to process bookmark completely",
			message: errorMessage,
			data: null,
		});
	}
}
