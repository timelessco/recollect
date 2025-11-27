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

// @openapi
// /api/v1/bookmarks/add/tasks/min-data:
//   post:
//     summary: Add minimum bookmark data
//     description: Adds initial bookmark data with basic metadata and checks for duplicates
//     tags:
//       - Bookmarks
//     requestBody:
//       required: true
//       content:
//         application/json:
//           schema:
//             type: object
//             required:
//               - url
//               - category_id
//               - update_access
//             properties:
//               url:
//                 type: string
//                 description: URL to bookmark
//               category_id:
//                 type: number
//                 description: Category ID to add bookmark to
//               update_access:
//                 type: boolean
//                 description: Whether user has update access
//     responses:
//       200:
//         description: Minimum bookmark data added successfully
//       400:
//         description: Invalid request body
//       401:
//         description: Unauthorized
//       403:
//         description: Forbidden - User does not have update access
//       409:
//         description: Bookmark already exists in category
//       500:
//         description: Internal server error
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
		const parseResult = schema.safeParse(request.body);
		if (!parseResult.success) {
			console.warn("Invalid request body:", parseResult.error);
			Sentry.captureException(parseResult.error, {
				tags: {
					operation: "validate_request_body",
				},
			});
			sendErrorResponse(response, 400, "Invalid request body");
			return;
		}

		const bodyData = parseResult.data;

		const {
			category_id: categoryId,
			update_access: updateAccess,
			url,
		} = bodyData;

		if (!updateAccess) {
			console.warn("User does not have update access:", { url });
			sendErrorResponse(response, 403, "User does not have update access");
			return;
		}

		// Initialize Supabase client and get user data
		const supabase = apiSupabaseClient(request, response);
		const userData = await supabase?.auth?.getUser();
		const userId = userData?.data?.user?.id;
		const email = userData?.data?.user?.email;

		if (!userId || !email) {
			console.warn("User authentication failed:", { userId, email });
			sendErrorResponse(response, 401, "Unauthorized");
			return;
		}

		// Entry point log
		console.log("Add bookmark min-data API called:", {
			userId,
			url,
			categoryId,
		});

		// Compute final category ID and check permissions
		const computedCategoryId = computeCategoryId(updateAccess, categoryId);
		const isOgImagePreferred = isUrlFromPreferredOgSite(url);

		console.log("Computed category ID:", { computedCategoryId });

		if (computedCategoryId !== 0) {
			// Check user permissions and duplicate bookmarks for categorized items
			const accessCheckResult = await checkIfUserIsCategoryOwnerOrCollaborator(
				supabase,
				computedCategoryId,
				userId,
				email,
			);

			if (!accessCheckResult.ok) {
				console.error("Error checking user access:", {
					error: accessCheckResult.error ?? "Unknown error",
					categoryId: computedCategoryId,
					userId,
				});
				Sentry.captureException(
					new Error(accessCheckResult.error ?? "Unknown error"),
					{
						tags: {
							operation: "check_user_access",
							userId,
						},
						extra: {
							categoryId: computedCategoryId,
						},
					},
				);
				sendErrorResponse(
					response,
					500,
					accessCheckResult.error ?? "Unknown error",
				);
				return;
			}

			if (!accessCheckResult.value) {
				console.warn(
					"User is neither owner or collaborator for the collection or does not have edit access:",
					{
						userId,
						categoryId: computedCategoryId,
					},
				);
				sendErrorResponse(
					response,
					403,
					"User is neither owner or collaborator for the collection or does not have edit access",
				);
				return;
			}

			const bookmarkExistsResult = await checkIfBookmarkExists(
				supabase,
				url,
				computedCategoryId,
			);

			if (!bookmarkExistsResult.ok) {
				console.error("Error checking if bookmark exists:", {
					error: bookmarkExistsResult.error ?? "Unknown error",
					url,
					categoryId: computedCategoryId,
					userId,
				});
				Sentry.captureException(
					new Error(bookmarkExistsResult.error ?? "Unknown error"),
					{
						tags: {
							operation: "check_bookmark_exists",
							userId,
						},
						extra: {
							url,
							categoryId: computedCategoryId,
						},
					},
				);
				sendErrorResponse(
					response,
					500,
					bookmarkExistsResult.error ?? "Unknown error",
				);
				return;
			}

			if (bookmarkExistsResult.value) {
				console.warn("Duplicate bookmark attempt:", {
					url,
					categoryId: computedCategoryId,
				});
				sendErrorResponse(
					response,
					409,
					"Bookmark already present in this category",
				);
				return;
			}
		}

		// Get URL metadata and process it
		console.log("Scraping URL metadata:", { url });
		const { scrapperResponse, scraperApiError } = await scrapeUrlMetadata(url);
		const { ogImageToBeAdded, iframeAllowedValue } = await processUrlMetadata(
			url,
			isOgImagePreferred,
			scrapperResponse?.data?.OgImage,
		);
		console.log("URL metadata scraped:", {
			hasTitle: Boolean(scrapperResponse?.data?.title),
			hasOgImage: Boolean(ogImageToBeAdded),
		});

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
			console.error("Data is empty after insert:", {
				url,
				userId,
				categoryId: computedCategoryId,
			});
			Sentry.captureException(new Error("Data is empty after insert"), {
				tags: {
					operation: "insert_bookmark",
					userId,
				},
			});
			sendErrorResponse(response, 400, "Data is empty after insert");
			return;
		}

		if (!isNull(databaseError)) {
			console.error("Error inserting bookmark:", databaseError);
			Sentry.captureException(databaseError, {
				tags: {
					operation: "insert_bookmark",
					userId,
				},
				extra: {
					url,
					categoryId: computedCategoryId,
				},
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
		console.log("Bookmark inserted successfully:", { id: data[0]?.id });
		response
			.status(200)
			.json({ data, error: scraperApiError ?? null, message: null });
	} catch (error) {
		// Catch any unhandled errors
		console.error("Unexpected error in add bookmark min-data API:", error);
		Sentry.captureException(error, {
			tags: {
				operation: "add_bookmark_min_data_unexpected",
			},
		});
		sendErrorResponse(
			response,
			500,
			"An unexpected error occurred",
			"An unexpected error occurred",
		);
	}
}
