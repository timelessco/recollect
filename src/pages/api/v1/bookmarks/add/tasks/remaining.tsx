// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiResponse } from "next/dist/shared/lib/utils";
import * as Sentry from "@sentry/nextjs";
import { type PostgrestError } from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";

import {
	type AddBookmarkRemainingDataPayloadTypes,
	type NextApiRequest,
	type SingleListData,
} from "../../../../../../types/apiTypes";
import {
	getFavIconUrl,
	processBookmarkImages,
	remainingBookmarkSchema,
	updateBookmarkWithRemainingData,
} from "../../../../../../utils/api/bookmark/remaining";
import { MAIN_TABLE_NAME } from "../../../../../../utils/constants";
import { apiSupabaseServiceClient } from "../../../../../../utils/supabaseServerClient";

/**
 * Response data type for the remaining data API
 */
type Data = {
	data: SingleListData[] | null;
	error: PostgrestError | VerifyErrors | string | null;
	message: string | null;
};

// @openapi
// /api/v1/bookmarks/add/tasks/remaining:
//   post:
//     summary: Add remaining bookmark data
//     description: Processes and stores remaining bookmark data including images and metadata
//     tags:
//       - Bookmarks
//     requestBody:
//       required: true
//       content:
//         application/json:
//           schema:
//             type: object
//             required:
//               - id
//               - url
//             properties:
//               id:
//                 type: string
//                 description: Bookmark ID
//               url:
//                 type: string
//                 description: Bookmark URL
//               favIcon:
//                 type: string
//                 nullable: true
//                 description: Favicon URL
//               userId:
//                 type: string
//                 description: User ID (required when called from background jobs)
//     responses:
//       200:
//         description: Remaining data added successfully
//       400:
//         description: Invalid request body
//       401:
//         description: Unauthorized
//       404:
//         description: Bookmark not found
//       500:
//         description: Internal server error
export default async function handler(
	request: NextApiRequest<AddBookmarkRemainingDataPayloadTypes>,
	response: NextApiResponse<Data>,
) {
	try {
		// Validate request body
		const validationResult = remainingBookmarkSchema.safeParse(request.body);
		if (!validationResult.success) {
			response.status(400).json({
				data: null,
				error: `Remaining data api Error in payload data: ${JSON.stringify(
					request.body,
					null,
					2,
				)}`,
				message: null,
			});
			return;
		}

		const { url, favIcon, id, userId: requestUserId } = validationResult.data;

		// Use service client to bypass cookie authentication
		// This is necessary when called from background jobs where cookies may be expired
		const supabase = apiSupabaseServiceClient();

		// Get userId from request body (for background jobs)
		const userId = requestUserId;

		if (!userId) {
			response.status(400).json({
				data: null,
				error: "userId is required in request body",
				message: null,
			});
			return;
		}

		// Fetch current bookmark data
		const { data: currentData, error: currentDataError } = await supabase
			.from(MAIN_TABLE_NAME)
			.select("ogImage, meta_data, description")
			.match({ id, user_id: userId })
			.single();

		if (currentDataError) {
			Sentry.captureException("Failed to fetch current bookmark data", {
				extra: { error: currentDataError },
			});
			response.status(500).json({
				data: null,
				error: "Failed to fetch current bookmark data",
				message: null,
			});
			return;
		}

		if (!currentData) {
			response.status(404).json({
				data: null,
				error: "Bookmark not found",
				message: null,
			});
			return;
		}

		// Process images and generate metadata
		const {
			// uploadedImageThatIsAUrl,
			uploadedCoverImageUrl,
			ogImageMetaDataGeneration,
			imageUrlForMetaDataGeneration,
			metadata,
		} = await processBookmarkImages(url, userId, currentData, supabase);

		// Get favicon
		const favIconUrl = await getFavIconUrl(url, favIcon);

		// Prepare metadata for update
		const existingMetaData = currentData?.meta_data ?? {};
		const meta_data = {
			img_caption: metadata?.imageCaption,
			width: metadata?.imgData?.width,
			height: metadata?.imgData?.height,
			ogImgBlurUrl: metadata?.imgData?.encoded,
			favIcon: favIconUrl,
			ocr: metadata?.imageOcrValue,
			screenshot: existingMetaData?.screenshot ?? null,
			coverImage: uploadedCoverImageUrl,
			twitter_avatar_url: null,
			isOgImagePreferred: existingMetaData?.isOgImagePreferred,
			mediaType: existingMetaData?.mediaType,
			iframeAllowed: existingMetaData?.iframeAllowed,
			isPageScreenshot: existingMetaData?.isPageScreenshot,
		};

		// Update bookmark with remaining data
		const { data, error } = await updateBookmarkWithRemainingData(supabase, {
			id,
			userId,
			metaData: meta_data,
			description: currentData?.description ?? metadata?.imageCaption ?? null,
			ogImage: currentData?.meta_data?.isOgImagePreferred
				? ogImageMetaDataGeneration
				: imageUrlForMetaDataGeneration,
		});

		if (error) {
			response.status(500).json({
				data: null,
				error,
				message: null,
			});
			return;
		}

		response.status(200).json({
			data,
			error: null,
			message: null,
		});
	} catch (error) {
		console.error("Unexpected error in remaining data handler:", error);
		Sentry.captureException("Unexpected error in remaining data handler", {
			extra: { error },
		});
		response.status(500).json({
			data: null,
			error: "An unexpected error occurred",
			message: null,
		});
	}
}
