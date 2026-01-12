import { type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import {
	type PostgrestError,
	type SupabaseClient,
} from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";

import imageToText from "../../../../../../async/ai/imageToText";
import ocr from "../../../../../../async/ai/ocr";
import { getMediaType } from "../../../../../../async/supabaseCrudHelpers";
import {
	type ImgMetadataType,
	type NextApiRequest,
	type SingleListData,
	type UploadFileApiResponse,
} from "../../../../../../types/apiTypes";
import {
	MAIN_TABLE_NAME,
	PDF_MIME_TYPE,
	STORAGE_FILES_PATH,
} from "../../../../../../utils/constants";
import { blurhashFromURL } from "../../../../../../utils/getBlurHash";
import {
	isUserInACategory,
	parseUploadFileName,
} from "../../../../../../utils/helpers";
import { r2Helpers } from "../../../../../../utils/r2Client";
import { apiSupabaseClient } from "../../../../../../utils/supabaseServerClient";
import { checkIfUserIsCategoryOwnerOrCollaborator } from "../../../../bookmark/add-bookmark-min-data";

type BodyDataType = {
	category_id: string;
	name: string;
	thumbnailPath: string | null;
	type: string;
	uploadFileNamePath: string;
};

/**
 * If the uploaded file is a video then this function is called
 * This gets the public URL from the thumbnail path uploaded by the client
 * Then it generates the meta_data for the thumbnail, this data has the blurHash thumbnail
 * Image caption is generated for the thumbnail
 */
const videoLogic = async (
	data: BodyDataType,
	supabase: SupabaseClient,
	userId: string,
) => {
	// Since thumbnails are now uploaded client-side, we just need to get the thumbnail URL
	// The thumbnailPath in data should now be the actual path in R2
	const thumbnailPath = data?.thumbnailPath;

	if (!thumbnailPath) {
		throw new Error("ERROR: thumbnailPath is missing for video file");
	}

	// Get the public URL for the uploaded thumbnail
	const { data: thumbnailUrl } = r2Helpers.getPublicUrl(thumbnailPath);

	const ogImage = thumbnailUrl?.publicUrl;

	let imgData;
	let ocrData;
	let imageCaption;
	if (thumbnailUrl?.publicUrl) {
		// Handle blurhash generation
		try {
			imgData = await blurhashFromURL(thumbnailUrl?.publicUrl);
		} catch (error) {
			console.error("Blur hash generation failed:", error);
			Sentry.captureException(error, {
				tags: {
					operation: "blurhash_generation",
					userId,
				},
				extra: {
					thumbnailUrl: thumbnailUrl?.publicUrl,
				},
			});
			imgData = {};
		}

		// Handle OCR processing
		try {
			ocrData = await ocr(thumbnailUrl?.publicUrl, supabase, userId);
		} catch (error) {
			console.error("OCR processing failed:", error);
			Sentry.captureException(error, {
				tags: {
					operation: "ocr_processing",
					userId,
				},
				extra: {
					thumbnailUrl: thumbnailUrl?.publicUrl,
				},
			});
			ocrData = null;
		}

		// Handle image caption generation
		try {
			imageCaption = await imageToText(
				thumbnailUrl?.publicUrl,
				supabase,
				userId,
			);
		} catch (error) {
			console.error("Image caption generation failed:", error);
			Sentry.captureException(error, {
				tags: {
					operation: "image_caption_generation",
					userId,
				},
				extra: {
					thumbnailUrl: thumbnailUrl?.publicUrl,
				},
			});
			imageCaption = null;
		}
	}

	const meta_data = {
		img_caption: imageCaption ?? null,
		width: imgData?.width ?? null,
		height: imgData?.height ?? null,
		ogImgBlurUrl: imgData?.encoded ?? null,
		favIcon: null,
		twitter_avatar_url: null,
		ocr: ocrData ?? null,
		coverImage: null,
		screenshot: null,
		isOgImagePreferred: false,
		mediaType: "",
		iframeAllowed: false,
		isPageScreenshot: null,
		video_url: null,
	};

	return { ogImage, meta_data };
};

/**
 * /api/v1/file/upload/tasks/min-data:
 *   post:
 *     summary: Upload file with minimal data
 *     description: Handles file upload and inserts minimal data into database. For videos, processes thumbnail metadata.
 *     tags:
 *       - Files
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category_id
 *               - name
 *               - type
 *               - uploadFileNamePath
 *             properties:
 *               category_id:
 *                 type: string
 *                 description: Category ID to add file to
 *               name:
 *                 type: string
 *                 description: File name
 *               thumbnailPath:
 *                 type: string
 *                 nullable: true
 *                 description: Path to thumbnail (for videos)
 *               type:
 *                 type: string
 *                 description: MIME type of the file
 *               uploadFileNamePath:
 *                 type: string
 *                 description: Storage path for the uploaded file
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: User does not have permission for this category
 *       500:
 *         description: Internal server error
 */
export default async function handler(
	request: NextApiRequest<BodyDataType>,
	response: NextApiResponse<UploadFileApiResponse>,
) {
	try {
		const supabase = apiSupabaseClient(request, response);

		// Authentication check
		const { data: userData, error: userError } = await supabase.auth.getUser();
		const userId = userData?.user?.id;
		const email = userData?.user?.email;

		if (userError || !userId) {
			console.warn("User authentication failed:", {
				error: userError?.message,
			});
			response.status(401).json({
				success: false,
				error: "Unauthorized",
			});
			return;
		}

		// Get data from JSON body
		const data = request.body as BodyDataType;
		const categoryId = data?.category_id;
		const categoryIdLogic = categoryId
			? isUserInACategory(categoryId)
				? categoryId
				: 0
			: 0;

		const fileName = parseUploadFileName(data?.name ?? "");
		const fileType = data?.type;

		console.log("upload-file min-data API called:", {
			userId,
			fileName,
			fileType,
			categoryId,
		});

		const uploadPath = parseUploadFileName(data?.uploadFileNamePath);
		// if the uploaded file is valid this happens
		const storagePath = `${STORAGE_FILES_PATH}/${userId}/${uploadPath}`;

		// Check category permissions if not using default category (0)
		if (
			Number.parseInt(categoryId as string, 10) !== 0 &&
			typeof categoryId === "number"
		) {
			const checkIfUserIsCategoryOwnerOrCollaboratorValue =
				await checkIfUserIsCategoryOwnerOrCollaborator(
					supabase,
					categoryId as number,
					userId as string,
					email as string,
					response,
				);

			// Note: helper function already sends error response if needed
			if (!checkIfUserIsCategoryOwnerOrCollaboratorValue) {
				console.warn("User authorization failed for category:", { categoryId });
				// Don't send response here - helper already sent it if there was an error
				// Only send 403 if user lacks permission (not a DB error)
				if (!response.headersSent) {
					response.status(403).json({
						error:
							"User is neither owner or collaborator for the collection or does not have edit access",
						success: false,
					});
				}

				return;
			}
		}

		// NOTE: the file upload to the bucket takes place in the client side itself due to vercel 4.5mb constraint
		// https://vercel.com/guides/how-to-bypass-vercel-body-size-limit-serverless-functions
		// Get the public url for the uploaded file
		const { data: storageData, error: publicUrlError } =
			r2Helpers.getPublicUrl(storagePath);

		// Check for public URL error immediately
		if (publicUrlError) {
			console.error("Error getting public URL:", publicUrlError);
			Sentry.captureException(publicUrlError, {
				tags: {
					operation: "get_public_url",
					userId,
				},
				extra: {
					storagePath,
				},
			});
			response.status(500).json({
				success: false,
				error: "Error getting file URL",
			});
			return;
		}

		console.log("Public URL retrieved successfully:", {
			publicUrl: storageData?.publicUrl,
		});

		const mediaType = (await getMediaType(storageData?.publicUrl)) as string;

		let meta_data: ImgMetadataType = {
			img_caption: null,
			width: null,
			height: null,
			ogImgBlurUrl: null,
			favIcon: null,
			twitter_avatar_url: null,
			ocr: null,
			coverImage: null,
			screenshot: null,
			isOgImagePreferred: false,
			iframeAllowed: false,
			mediaType,
			isPageScreenshot: null,
			video_url: null,
		};
		const isVideo = fileType?.includes("video");

		let ogImage;

		if (!isVideo) {
			// if file is not a video
			ogImage = storageData?.publicUrl;
		} else {
			// if file is a video
			console.log("Processing video file:", {
				thumbnailPath: data.thumbnailPath,
			});

			const { ogImage: image, meta_data: metaData } = await videoLogic(
				data,
				supabase,
				userId ?? "",
			);

			ogImage = image;
			meta_data = metaData;

			console.log("Video processing completed:", {
				hasOgImage: Boolean(image),
				hasMetaData: Boolean(metaData),
			});
		}

		// Insert the file data into database
		const { data: databaseData, error: dbError } = (await supabase
			.from(MAIN_TABLE_NAME)
			.insert([
				{
					url: storageData?.publicUrl,
					title: fileName,
					user_id: userId,
					description: (meta_data?.img_caption as string) || "",
					ogImage,
					category_id: categoryIdLogic,
					type: fileType,
					meta_data,
				},
			])
			.select(`id`)) as unknown as {
			data: Array<{ id: SingleListData["id"] }>;
			error: PostgrestError | VerifyErrors | string | null;
		};

		// Check for database error immediately
		if (dbError) {
			console.error("Error inserting file to database:", dbError);
			Sentry.captureException(dbError, {
				tags: {
					operation: "insert_file_to_database",
					userId,
				},
				extra: { fileName, fileType },
			});
			response.status(500).json({
				success: false,
				error: "Error uploading file",
			});
			return;
		}

		console.log("File uploaded successfully:", {
			bookmarkId: databaseData?.[0]?.id,
			fileType,
			isPdf: fileType === PDF_MIME_TYPE,
			isVideo,
		});

		response.status(200).json({
			data: databaseData,
			success: true,
			error: null,
		});
	} catch (error) {
		console.error("Unexpected error in upload-file min-data:", error);
		Sentry.captureException(error, {
			tags: {
				operation: "upload_file_min_data_unexpected",
			},
		});
		response.status(500).json({
			success: false,
			error: "An unexpected error occurred",
		});
	}
}
