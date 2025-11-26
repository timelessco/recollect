import { type NextApiResponse } from "next/dist/shared/lib/utils";
import * as Sentry from "@sentry/nextjs";
import { type PostgrestError } from "@supabase/supabase-js";
import axios from "axios";
import { type VerifyErrors } from "jsonwebtoken";

import { getMediaType } from "../../../../../../async/supabaseCrudHelpers";
import {
	type AddBookmarkScreenshotPayloadTypes,
	type NextApiRequest,
	type SingleListData,
} from "../../../../../../types/apiTypes";
import {
	captureScreenshot,
	fetchExistingBookmarkData,
	MAX_LENGTH,
	screenshotRequestSchema,
	updateBookmarkWithScreenshot,
	uploadScreenshot,
} from "../../../../../../utils/api/bookmark/screenshot";
import {
	PDF_MIME_TYPE,
	PDF_SCREENSHOT_API,
	URL_PDF_CHECK_PATTERN,
} from "../../../../../../utils/constants";
import { apiSupabaseServiceClient } from "../../../../../../utils/supabaseServerClient";

/**
 * Response data type for the screenshot API
 */
type Data = {
	data: SingleListData[] | null;
	error: PostgrestError | VerifyErrors | string | null;
};

/**
 * /api/v1/bookmarks/add/tasks/screenshot:
 *   post:
 *     summary: Add bookmark screenshot
 *     description: Captures and stores screenshot of the bookmarked URL. This is an internal API that requires authentication.
 *     tags:
 *       - Bookmarks
 *       - Internal APIs
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - url
 *               - userId
 *             properties:
 *               id:
 *                 type: number
 *                 description: Bookmark ID
 *               url:
 *                 type: string
 *                 description: URL to capture screenshot of
 *               userId:
 *                 type: string
 *                 description: User ID (required)
 *     responses:
 *       200:
 *         description: Screenshot added successfully
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized - Invalid or missing API key
 *       500:
 *         description: Internal server error
 */
export default async function handler(
	request: NextApiRequest<AddBookmarkScreenshotPayloadTypes>,
	response: NextApiResponse<Data>,
) {
	try {
		// Authenticate internal API key
		const apiKey =
			request.headers["x-api-key"] ||
			request.headers.authorization?.replace("Bearer ", "");

		if (apiKey !== process.env.INTERNAL_API_KEY) {
			response.status(401).json({
				data: null,
				error: "Unauthorized - Invalid API key",
			});
			return;
		}

		// Validate request body using Zod schema
		const validationResult = screenshotRequestSchema.safeParse(request.body);
		if (!validationResult.success) {
			response.status(400).json({
				data: null,
				error: `Screenshot api Error in payload data: ${validationResult.error.message}`,
			});
			return;
		}

		// Use service client to bypass cookie authentication
		// This is necessary when called from background jobs where cookies may be expired
		const supabase = apiSupabaseServiceClient();

		// Get userId from request body (for background jobs)
		const userId = request.body.userId;

		if (!userId) {
			response.status(400).json({
				data: null,
				error: "userId is required in request body",
			});
			return;
		}

		const mediaType = await getMediaType(request.body.url);

		let publicURL = null;
		let pageTitle: string | undefined;
		let pageDescription: string | undefined;
		let isPageScreenshot: boolean | undefined;

		if (
			mediaType === PDF_MIME_TYPE ||
			URL_PDF_CHECK_PATTERN.test(request.body.url)
		) {
			try {
				const axiosResponse = await axios.post(
					`${process.env.RECOLLECT_SERVER_API}${PDF_SCREENSHOT_API}`,
					{
						url: request.body.url,
						userId,
					},
					{
						headers: {
							Authorization: `Bearer ${process.env.RECOLLECT_SERVER_API_KEY}`,
							"Content-Type": "application/json",
						},
						timeout: 30000,
					},
				);
				publicURL = axiosResponse?.data?.publicUrl ?? null;
				isPageScreenshot = false;
			} catch (pdfScreenshotError) {
				// Extract actual error message from axios error response
				let errorMessage = "Unknown error generating PDF screenshot";
				let statusCode = 500;

				if (axios.isAxiosError(pdfScreenshotError)) {
					statusCode = pdfScreenshotError.response?.status ?? 500;
					// Get the actual error message from the API response
					errorMessage =
						pdfScreenshotError.response?.data?.error ||
						pdfScreenshotError.response?.data?.message ||
						pdfScreenshotError.message ||
						"PDF screenshot service error";

					console.error("Error generating PDF screenshot:", {
						status: statusCode,
						message: errorMessage,
						responseData: pdfScreenshotError.response?.data,
					});
				} else {
					errorMessage =
						pdfScreenshotError instanceof Error
							? pdfScreenshotError.message
							: errorMessage;
					console.error("Error generating PDF screenshot:", errorMessage);
				}

				response.status(statusCode).json({
					data: null,
					error: errorMessage,
				});
				return;
			}
		} else {
			// Capture screenshot of the URL
			const screenshotResult = await captureScreenshot(request.body.url);
			if (!screenshotResult.success) {
				response.status(500).json({
					data: null,
					error: screenshotResult.error,
				});
				return;
			}

			// Convert screenshot data to base64
			const base64data = Buffer?.from(
				screenshotResult.data?.screenshot?.data,
				"binary",
			)?.toString("base64");
			const screenMeta = screenshotResult.data.metaData ?? {};
			pageTitle = screenMeta?.title;
			pageDescription = screenMeta?.description;
			isPageScreenshot = screenMeta?.isPageScreenshot;

			// Upload screenshot to R2 storage
			publicURL = await uploadScreenshot(base64data, userId);
			if (!publicURL) {
				response.status(500).json({
					data: null,
					error: "Failed to upload screenshot to storage",
				});
				return;
			}
		}

		// Fetch existing bookmark data to update
		const { data: existingBookmarkData, error: fetchError } =
			await fetchExistingBookmarkData(
				supabase,
				request.body.id.toString(),
				userId,
			);

		if (fetchError) {
			response.status(500).json({ data: null, error: fetchError });
			return;
		}

		// Prepare metadata for update
		const existingMetaData = existingBookmarkData?.meta_data ?? {};

		const updatedTitle =
			pageTitle?.slice(0, MAX_LENGTH) ?? existingBookmarkData?.title;
		const updatedDescription =
			pageDescription?.slice(0, MAX_LENGTH) ??
			existingBookmarkData?.description;

		// Add screenshot URL and metadata
		const updatedMetaData = {
			...existingMetaData,
			screenshot: publicURL,
			isPageScreenshot,
			coverImage: existingBookmarkData?.ogImage,
		};

		// Update bookmark with screenshot data
		const { data, error } = await updateBookmarkWithScreenshot(supabase, {
			bookmarkId: request.body.id.toString(),
			userId,
			title: updatedTitle,
			description: updatedDescription,
			metaData: updatedMetaData,
		});

		if (error) {
			response.status(500).json({ data: null, error });
			return;
		}

		// // Upload remaining bookmark data asynchronously
		// const { error: remainingUploadError } = await uploadRemainingBookmarkData(
		// 	data ?? [],
		// 	request.body.url,
		// 	request?.cookies,
		// );

		// if (remainingUploadError) {
		// 	console.error("Remaining bookmark data API error:", remainingUploadError);
		// }

		response.status(200).json({ data, error: null });
	} catch (handlerError) {
		console.error("Unexpected error:", handlerError);
		Sentry.captureException("Unexpected error in screenshot handler", {
			extra: { error: handlerError },
		});
		response.status(500).json({
			data: null,
			error: "An unexpected error occurred",
		});
	}
}
