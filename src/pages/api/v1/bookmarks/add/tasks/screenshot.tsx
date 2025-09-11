import { type NextApiResponse } from "next/dist/shared/lib/utils";
import * as Sentry from "@sentry/nextjs";
import { type PostgrestError } from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";

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
	uploadRemainingBookmarkData,
	uploadScreenshot,
} from "../../../../../../utils/api/bookmark/screenshot";
import { apiSupabaseClient } from "../../../../../../utils/supabaseServerClient";

/**
 * Response data type for the screenshot API
 */
type Data = {
	data: SingleListData[] | null;
	error: PostgrestError | VerifyErrors | string | null;
};

/**
 * @swagger
 * /api/v1/bookmarks/add/tasks/screenshot:
 *   post:
 *     summary: Add bookmark screenshot
 *     description: Captures and stores screenshot of the bookmarked URL
 *     tags:
 *       - Bookmarks
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - url
 *             properties:
 *               id:
 *                 type: string
 *                 description: Bookmark ID
 *               url:
 *                 type: string
 *                 description: URL to capture screenshot of
 *     responses:
 *       200:
 *         description: Screenshot added successfully
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export default async function handler(
	request: NextApiRequest<AddBookmarkScreenshotPayloadTypes>,
	response: NextApiResponse<Data>,
) {
	try {
		// Validate request body using Zod schema
		const validationResult = screenshotRequestSchema.safeParse(request.body);
		if (!validationResult.success) {
			response.status(400).json({
				data: null,
				error: `Screenshot api Error in payload data: ${JSON.stringify(
					request.body,
					null,
					2,
				)}`,
			});
			return;
		}

		// Initialize Supabase client and get user ID
		const supabase = apiSupabaseClient(request, response);
		const userId = (await supabase?.auth?.getUser())?.data?.user?.id as string;

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
		const { title, description, isPageScreenshot } =
			screenshotResult.data.metaData ?? {};

		// Upload screenshot to R2 storage
		const publicURL = await uploadScreenshot(base64data, userId);

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
			title?.slice(0, MAX_LENGTH) ?? existingBookmarkData?.title;
		const updatedDescription =
			description?.slice(0, MAX_LENGTH) ?? existingBookmarkData?.description;

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
			throw new Error("ERROR: update screenshot in DB error");
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
		return;
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
