import { type NextApiResponse } from "next/dist/shared/lib/utils";
import * as Sentry from "@sentry/nextjs";
import { type PostgrestError } from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";
import { isEmpty, isNull } from "lodash";

import { getMediaType } from "../../../../../../async/supabaseCrudHelpers";
import {
	type AddBookmarkMinDataPayloadTypes,
	type NextApiRequest,
	type SingleListData,
} from "../../../../../../types/apiTypes";
import {
	checkIfBookmarkExists,
	checkIfUserIsCategoryOwnerOrCollaborator,
	computeCategoryId,
	getBookmarkBodySchema,
	isUrlFromPreferredOgSite,
	processUrlMetadata,
	scrapeUrlMetadata,
} from "../../../../../../utils/api/bookmark/add";
import { formatErrorMessage } from "../../../../../../utils/api/bookmark/errorHandling";
import {
	bookmarkType,
	MAIN_TABLE_NAME,
} from "../../../../../../utils/constants";
import { apiSupabaseClient } from "../../../../../../utils/supabaseServerClient";

type ApiResponse = {
	data: SingleListData[] | null;
	error: PostgrestError | VerifyErrors | string | null;
	message: string | null;
};

// Helper to send error response and return void
const sendErrorResponse = (
	response: NextApiResponse<ApiResponse>,
	status: number,
	error: string,
	message?: string,
): void => {
	response
		.status(status)
		.json({ data: null, error, message: message ?? error });
};

/**
 * @swagger
 * /api/v1/bookmarks/add/tasks/min-data:
 *   post:
 *     summary: Add minimum bookmark data
 *     description: Adds initial bookmark data with basic metadata and checks for duplicates
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
 *         description: Minimum bookmark data added successfully
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
): Promise<void> {
	try {
		// Validate request method
		if (request.method !== "POST") {
			sendErrorResponse(response, 405, "Only POST requests allowed");
			return;
		}

		// Validate request body
		const schema = getBookmarkBodySchema();
		let bodyData;
		try {
			bodyData = schema.parse(request.body);
		} catch (parseError) {
			const errorMessage = formatErrorMessage(parseError);
			Sentry.captureException("Invalid request body", {
				extra: { error: errorMessage },
			});
			sendErrorResponse(response, 400, "Invalid request body", errorMessage);
			return;
		}

		const {
			category_id: categoryId,
			update_access: updateAccess,
			url,
		} = bodyData;

		if (!updateAccess) {
			sendErrorResponse(response, 403, "User does not have update access");
			return;
		}

		// Initialize Supabase client and get user data
		const supabase = apiSupabaseClient(request, response);
		const userData = await supabase?.auth?.getUser();
		const userId = userData?.data?.user?.id;
		const email = userData?.data?.user?.email;

		if (!userId || !email) {
			const errorMessage = "User ID and email not retrieved from Supabase";
			Sentry.captureException(errorMessage, { extra: { userId, email } });
			sendErrorResponse(response, 401, errorMessage);
			return;
		}

		// Compute final category ID and check permissions
		const computedCategoryId = computeCategoryId(updateAccess, categoryId);
		const isOgImagePreferred = isUrlFromPreferredOgSite(url);

		if (computedCategoryId !== 0) {
			// Check user permissions and duplicate bookmarks for categorized items
			const hasAccess = await checkIfUserIsCategoryOwnerOrCollaborator(
				supabase,
				computedCategoryId,
				userId,
				email,
				response,
			);

			if (!hasAccess) {
				sendErrorResponse(
					response,
					403,
					"User is neither owner or collaborator for the collection or does not have edit access",
				);
				return;
			}

			const isBookmarkAlreadyPresent = await checkIfBookmarkExists(
				supabase,
				url,
				computedCategoryId,
				response,
			);

			if (isBookmarkAlreadyPresent) {
				sendErrorResponse(
					response,
					409,
					"Bookmark already present in this category",
				);
				return;
			}
		}

		// Get URL metadata and process it
		const { scrapperResponse, scraperApiError } = await scrapeUrlMetadata(url);
		const { ogImageToBeAdded, iframeAllowedValue, isUrlOfMimeType } =
			await processUrlMetadata(
				url,
				isOgImagePreferred,
				scrapperResponse?.data?.OgImage,
			);

		// Insert bookmark into database
		const {
			data,
			error: databaseError,
		}: {
			data: SingleListData[] | null;
			error: PostgrestError | VerifyErrors | string | null;
		} = await supabase
			.from(MAIN_TABLE_NAME)
			.insert([
				{
					url,
					title: scrapperResponse?.data?.title,
					user_id: userId,
					description: scrapperResponse?.data?.description,
					ogImage: ogImageToBeAdded,
					category_id: computedCategoryId,
					meta_data: {
						isOgImagePreferred,
						mediaType: await getMediaType(url),
						favIcon: scrapperResponse?.data?.favIcon,
						iframeAllowed: iframeAllowedValue,
					},
					type: bookmarkType,
				},
			])
			.select();

		if (isEmpty(data) || isNull(data)) {
			const errorMessage = "Data is empty after insert";
			Sentry.captureException(errorMessage);
			sendErrorResponse(response, 400, errorMessage);
			return;
		}

		if (!isNull(databaseError)) {
			const errorMessage = formatErrorMessage(databaseError);
			Sentry.captureException("Error inserting bookmark", {
				extra: { error: errorMessage },
			});
			sendErrorResponse(
				response,
				500,
				"Failed to insert bookmark",
				errorMessage,
			);
			return;
		}

		// Send success response
		response
			.status(200)
			.json({ data, error: scraperApiError ?? null, message: null });

		// // Process remaining data for media URLs asynchronously
		// if (!isNull(data) && !isEmpty(data) && isUrlOfMimeType) {
		// 	try {
		// 		// Add remaining data like blur hash bucket uploads for media URLs
		// 		await axios.post(
		// 			`${getBaseUrl()}${NEXT_API_URL}${ADD_REMAINING_BOOKMARK_API}`,
		// 			{
		// 				id: data[0]?.id,
		// 				favIcon: scrapperResponse?.data?.favIcon,
		// 				url,
		// 			},
		// 			{
		// 				headers: {
		// 					Cookie: apiCookieParser(request?.cookies),
		// 				},
		// 			},
		// 		);
		// 	} catch (uploadError) {
		// 		// Log error but don't fail the request since this is additional processing
		// 		const errorMessage = formatErrorMessage(uploadError);
		// 		console.error("Failed to process remaining data:", errorMessage);
		// 		Sentry.captureException("Failed to process remaining bookmark data", {
		// 			extra: { error: errorMessage },
		// 		});
		// 	}
		// }
	} catch (error) {
		// Catch any unhandled errors
		const errorMessage = "Unexpected error processing bookmark";
		const formattedError = formatErrorMessage(error);
		console.error(errorMessage, formattedError);
		Sentry.captureException(errorMessage, { extra: { error: formattedError } });
		sendErrorResponse(response, 500, errorMessage, formattedError);
	}
}
