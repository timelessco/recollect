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
import isNil from "lodash/isNil";

import imageToText from "../../../async/ai/imageToText";
import ocr from "../../../async/ai/ocr";
import { getMediaType } from "../../../async/supabaseCrudHelpers";
import {
	type ImgMetadataType,
	type SingleListData,
	type UploadFileApiResponse,
} from "../../../types/apiTypes";
import {
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
import { r2Helpers } from "../../../utils/r2Client";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";
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
		video_url: thumbnailUrl?.publicUrl ?? null,
	};

	return { ogImage, meta_data };
};

export default async (
	request: NextApiRequest,
	response: NextApiResponse<UploadFileApiResponse>,
) => {
	const supabase = apiSupabaseClient(request, response);

	// Get data from JSON body
	const data = request.body as BodyDataType;

	const categoryId = data?.category_id;

	const categoryIdLogic = categoryId
		? isUserInACategory(categoryId)
			? categoryId
			: 0
		: 0;

	const userData = await supabase?.auth?.getUser();

	const userId = userData?.data?.user?.id;
	const email = userData?.data?.user?.email;

	const fileName = parseUploadFileName(data?.name ?? "");
	const fileType = data?.type;

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
		r2Helpers.getPublicUrl(storagePath);

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
		mediaType: (await getMediaType(storageData?.publicUrl)) as string,
		isPageScreenshot: null,
		video_url: null,
	};
	const isVideo = fileType?.includes("video");

	let ogImage;

	if (!isVideo) {
		// if file is not a video
		try {
			ogImage = storageData?.publicUrl;
		} catch (error) {
			if (error instanceof Error) {
				throw new TypeError("Failed to generate PNG from PDF" + error.message);
			}

			// Optional: set a fallback image
			ogImage = storageData?.publicUrl;
		}
	} else {
		// if file is a video
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
				category_id: categoryIdLogic,
				type: fileType,
				meta_data,
			},
		])
		.select(`id`)) as unknown as {
		data: Array<{ id: SingleListData["id"] }>;
		error: PostgrestError | VerifyErrors | string | null;
	};

	if (isNil(publicUrlError) && isNil(DBerror)) {
		response
			.status(200)
			.json({ data: DatabaseData, success: true, error: null });

		try {
			if (fileType !== PDF_MIME_TYPE) {
				if (!isEmpty(DatabaseData) && !isVideo) {
					await axios.post(
						`${getBaseUrl()}${NEXT_API_URL}${UPLOAD_FILE_REMAINING_DATA_API}`,
						{
							id: DatabaseData[0]?.id,
							publicUrl: storageData?.publicUrl,
							mediaType: meta_data?.mediaType,
						},
						getAxiosConfigWithAuth(request),
					);
				} else {
					console.error("Remaining upload api error: upload data is empty");
					Sentry.captureException(
						`Remaining upload api error: upload data is empty`,
					);
				}
			}
		} catch (remainingerror) {
			console.error(remainingerror);
			Sentry.captureException(`Remaining upload api error ${remainingerror}`);
		}
	} else {
		response
			.status(500)
			.json({ success: false, error: publicUrlError ?? DBerror });
	}
};
