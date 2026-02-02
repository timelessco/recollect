// you might want to use regular 'fs' and not a promise one
import { type NextApiRequest, type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import {
	type PostgrestError,
	type SupabaseClient,
} from "@supabase/supabase-js";
import axios from "axios";
import { type VerifyErrors } from "jsonwebtoken";
import { isEmpty } from "lodash";

import imageToText from "../../../async/ai/imageToText";
import ocr from "../../../async/ai/ocr";
import { getMediaType } from "../../../async/supabaseCrudHelpers";
import {
	type ImgMetadataType,
	type SingleListData,
	type UploadFileApiResponse,
} from "../../../types/apiTypes";
import {
	AUDIO_OG_IMAGE_FALLBACK_URL,
	BOOKMARK_CATEGORIES_TABLE_NAME,
	getBaseUrl,
	MAIN_TABLE_NAME,
	NEXT_API_URL,
	PDF_MIME_TYPE,
	STORAGE_FILES_PATH,
	UPLOAD_FILE_REMAINING_DATA_API,
} from "../../../utils/constants";
import { blurhashFromURL } from "../../../utils/getBlurHash";
import {
	getAxiosConfigWithAuth,
	isUserInACategory,
	parseUploadFileName,
} from "../../../utils/helpers";
import { storageHelpers } from "../../../utils/storageClient";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";
import { vet } from "../../../utils/try";
import { checkIfUserIsCategoryOwnerOrCollaborator } from "../bookmark/add-bookmark-min-data";

type BodyDataType = {
	category_id: string;
	name: string;
	thumbnailPath: string | null;
	type: string;
	uploadFileNamePath: string;
};

/*
If the uploaded file is a video then this function is called
This gets the public URL from the thumbnail path uploaded by the client
Then it generates the meta_data for the thumbnail, this data has the blurHash thumbnail
Image caption is not generated for the thumbnail
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
	const { data: thumbnailUrl } = storageHelpers.getPublicUrl(thumbnailPath);

	const ogImage = thumbnailUrl?.publicUrl;

	let imgData;
	let ocrData;
	let ocrStatus: "success" | "limit_reached" | "no_text" = "no_text";
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
					thumbnailUrl: thumbnailUrl?.publicUrl,
				},
			});
			imgData = {};
		}

		// Handle OCR processing
		// OCR returns { text, status } object
		try {
			const ocrResult = await ocr(thumbnailUrl?.publicUrl, supabase, userId);
			ocrData = ocrResult.text;
			ocrStatus = ocrResult.status;
		} catch (error) {
			console.error("OCR processing failed:", error);
			Sentry.captureException(error, {
				tags: {
					operation: "ocr_processing",
					thumbnailUrl: thumbnailUrl?.publicUrl,
				},
			});
			ocrData = null;
			ocrStatus = "no_text";
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
					thumbnailUrl: thumbnailUrl?.publicUrl,
				},
			});
			imageCaption = null;
		}
	}

	const meta_data = {
		img_caption: imageCaption ?? null,
		image_caption: imageCaption ?? null,
		width: imgData?.width ?? null,
		height: imgData?.height ?? null,
		ogImgBlurUrl: imgData?.encoded ?? null,
		favIcon: null,
		twitter_avatar_url: null,
		ocr: ocrData ?? null,
		ocr_status: ocrStatus,
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

export default async (
	request: NextApiRequest,
	response: NextApiResponse<UploadFileApiResponse>,
) => {
	try {
		const supabase = apiSupabaseClient(request, response);

		// Check for auth errors
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

		console.log("upload-file API called:", {
			userId,
			fileName,
			fileType,
			categoryId,
		});

		const uploadPath = parseUploadFileName(data?.uploadFileNamePath);
		// if the uploaded file is valid this happens
		const storagePath = `${STORAGE_FILES_PATH}/${userId}/${uploadPath}`;

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

			if (!checkIfUserIsCategoryOwnerOrCollaboratorValue) {
				console.warn("User authorization failed for category:", { categoryId });
				response.status(500).json({
					error:
						"User is neither owner or collaborator for the collection or does not have edit access",
					success: false,
				});
				return;
			}
		}

		// NOTE: the file upload to the bucket takes place in the client side itself due to vercel 4.5mb constraint https://vercel.com/guides/how-to-bypass-vercel-body-size-limit-serverless-functions
		// the public url for the uploaded file is got
		const { data: storageData, error: publicUrlError } =
			storageHelpers.getPublicUrl(storagePath);

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

		const mediaType = (await getMediaType(storageData?.publicUrl)) as string;

		let meta_data: ImgMetadataType = {
			img_caption: null,
			image_caption: null,
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

		const isAudio = fileType?.includes("audio");

		let ogImage;

		if (!isVideo) {
			console.log("Processing audio file:", {
				fileType,
			});

			// if file is not a video
			ogImage = storageData?.publicUrl;
			if (isAudio) {
				console.log("Processing audio file:", {
					fileType,
				});
				ogImage = AUDIO_OG_IMAGE_FALLBACK_URL;
			}
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
		}

		// we upload the final data in DB
		const { data: DatabaseData, error: DBerror } = (await supabase
			.from(MAIN_TABLE_NAME)
			.insert([
				{
					url: storageData?.publicUrl,
					title: fileName,
					user_id: userId,
					description: (meta_data?.img_caption as string) || "",
					ogImage,
					type: fileType,
					meta_data,
				},
			])
			.select(`id`)) as unknown as {
			data: Array<{ id: SingleListData["id"] }>;
			error: PostgrestError | VerifyErrors | string | null;
		};

		console.log("Database insert result:", {
			bookmarkId: DatabaseData?.[0]?.id,
		});

		if (DBerror) {
			console.error("Error inserting file to database:", DBerror);
			Sentry.captureException(DBerror, {
				tags: {
					operation: "insert_file_to_database",
					userId,
				},
				extra: { fileName, fileType },
			});
			response
				.status(500)
				.json({ success: false, error: "Error uploading file" });
			return;
		}

		// Add category association via junction table
		if (DatabaseData?.[0]?.id) {
			const { error: junctionError } = await supabase
				.from(BOOKMARK_CATEGORIES_TABLE_NAME)
				.insert({
					bookmark_id: DatabaseData[0].id,
					category_id: categoryIdLogic,
					user_id: userId,
				});

			if (junctionError) {
				console.error("Error inserting category association:", junctionError);
				Sentry.captureException(junctionError, {
					tags: {
						operation: "insert_bookmark_category_junction",
						userId,
					},
					extra: {
						bookmarkId: DatabaseData[0].id,
						categoryId: categoryIdLogic,
					},
				});
			}
		}

		// Skip remaining upload API for PDFs
		if (fileType === PDF_MIME_TYPE) {
			console.log("File type is pdf, so not calling the remaining upload api");
			response
				.status(200)
				.json({ data: DatabaseData, success: true, error: null });
			return;
		}

		// Skip remaining upload API for videos or empty data
		if (isEmpty(DatabaseData) || isVideo) {
			console.log(
				"File type is video or no data, so not calling the remaining upload api",
			);
			response
				.status(200)
				.json({ data: DatabaseData, success: true, error: null });
			return;
		}

		// Call remaining upload API
		const remainingUploadBody = {
			id: DatabaseData[0]?.id,
			publicUrl: storageData?.publicUrl,
			mediaType: meta_data?.mediaType,
		};
		console.log("Calling remaining upload API:", { remainingUploadBody });

		const [remainingUploadError] = await vet(() =>
			axios.post(
				`${getBaseUrl()}${NEXT_API_URL}${UPLOAD_FILE_REMAINING_DATA_API}`,
				remainingUploadBody,
				getAxiosConfigWithAuth(request),
			),
		);

		if (remainingUploadError) {
			console.error("Remaining upload API error:", remainingUploadError);
			Sentry.captureException(remainingUploadError, {
				tags: {
					operation: "remaining_upload_api",
					userId,
				},
				extra: {
					bookmarkId: DatabaseData[0]?.id,
				},
			});
		}

		console.log("File uploaded successfully:", {
			bookmarkId: DatabaseData?.[0]?.id,
		});
		response
			.status(200)
			.json({ data: DatabaseData, success: true, error: null });
	} catch (error) {
		console.error("Unexpected error in upload-file:", error);
		Sentry.captureException(error, {
			tags: {
				operation: "upload_file_unexpected",
			},
		});
		response.status(500).json({
			success: false,
			error: "An unexpected error occurred",
		});
	}
};
