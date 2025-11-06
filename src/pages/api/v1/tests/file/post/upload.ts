// you might want to use regular 'fs' and not a promise one
import { log } from "console";
import { type NextApiRequest, type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { type PostgrestError } from "@supabase/supabase-js";
import axios from "axios";
import { type VerifyErrors } from "jsonwebtoken";
import { isEmpty } from "lodash";
import isNil from "lodash/isNil";

import {
	type FileNameType,
	type ImgMetadataType,
	type SingleListData,
} from "../../../../../../types/apiTypes";
import {
	getBaseUrl,
	MAIN_TABLE_NAME,
	NEXT_API_URL,
	R2_MAIN_BUCKET_NAME,
	STORAGE_FILES_PATH,
	UPLOAD_FILE_REMAINING_DATA_API,
} from "../../../../../../utils/constants";
import { blurhashFromURL } from "../../../../../../utils/getBlurHash";
import {
	getAxiosConfigWithAuth,
	isUserInACategory,
	parseUploadFileName,
} from "../../../../../../utils/helpers";
import { r2Helpers } from "../../../../../../utils/r2Client";
import { apiSupabaseClient } from "../../../../../../utils/supabaseServerClient";
import { checkIfUserIsCategoryOwnerOrCollaborator } from "../../../../bookmark/add-bookmark-min-data";

// NOTE: THIS API IS ONLY USED IN TEST CASES
// As the upload api needs supabase in the FE and in test cases we cannot use supabase, we use this api which is tailored to be used in test cases
// This api uploads an existing file in the S3 bucket as a new bookmark and this bookmark can be used for testing needs

/*
If the uploaded file is a video then this function is called
This adds the video thumbnail into S3
Then it generates the meta_data for the thumbnail, this data has the blurHash thumbnail
Image caption is not generated for the thumbnail
*/
const videoLogic = async (
	data: {
		category_id: string;
		name: string;
		thumbnailPath: string | null;
		type: string;
		uploadFileNamePath: string;
	},
	userId: SingleListData["user_id"]["id"],
	fileName: FileNameType,
) => {
	// Get the thumbnail path from the client-side upload
	const thumbnailPath = data?.thumbnailPath;

	if (!thumbnailPath) {
		throw new Error("ERROR: thumbnailPath is missing for video file");
	}

	// Move thumbnail from temp location to final location
	const finalThumbnailPath = `${STORAGE_FILES_PATH}/${userId}/thumbnail-${fileName}.png`;

	// For R2, we need to copy the object manually by getting and uploading
	// First get the object from temp location
	const { error: getError } = await r2Helpers.listObjects(
		R2_MAIN_BUCKET_NAME,
		thumbnailPath,
	);

	if (!isNil(getError)) {
		// eslint-disable-next-line @typescript-eslint/no-base-to-string
		throw new Error(`ERROR: getError ${getError}`);
	}

	// Since we can't directly copy in R2, we'll assume the thumbnail is already in the right place
	// or handle this differently in a real implementation

	// Delete the temp thumbnail if it exists
	await r2Helpers.deleteObject(R2_MAIN_BUCKET_NAME, thumbnailPath);

	// Get the public URL for the final thumbnail
	const { data: thumbnailUrl, error: thumbnailUrlError } =
		r2Helpers.getPublicUrl(finalThumbnailPath);

	if (!isNil(thumbnailUrlError)) {
		throw new Error(`ERROR: thumbnailUrlError ${String(thumbnailUrlError)}`);
	}

	const ogImage = thumbnailUrl?.publicUrl;

	let imgData;
	if (thumbnailUrl?.publicUrl) {
		try {
			imgData = await blurhashFromURL(thumbnailUrl?.publicUrl);
		} catch (error) {
			log("Blur hash error", error);
			Sentry.captureException(`Blur hash error ${error}`);
			imgData = {};
		}
	}

	const meta_data = {
		img_caption: null,
		width: imgData?.width ?? null,
		height: imgData?.height ?? null,
		ogImgBlurUrl: imgData?.encoded ?? null,
		favIcon: null,
		twitter_avatar_url: null,
		ocr: null,
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
	response: NextApiResponse<{
		data?: Array<{
			id: SingleListData["id"];
		}> | null;
		error: string | null;
		success: boolean;
	}>,
) => {
	const supabase = apiSupabaseClient(request, response);

	const data = request.body as {
		category_id: string;
		name: string;
		thumbnailPath: string | null;
		type: string;
		uploadFileNamePath: string;
	};

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
		mediaType: "",
		isPageScreenshot: null,
		video_url: null,
	};
	const isVideo = fileType?.includes("video");

	let ogImage;

	if (!isVideo) {
		// if file is not a video
		// const { ogImage: image, meta_data: metaData } =
		// 	await notVideoLogic(storageData);

		ogImage = storageData?.publicUrl;
		// meta_data = metaData;
	} else {
		// if file is a video
		const { ogImage: image, meta_data: metaData } = await videoLogic(
			data,
			userId as string,
			uploadPath,
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
			.json({ data: DatabaseData, error: null, success: true });

		try {
			if (!isEmpty(DatabaseData) && !isVideo) {
				await axios.post(
					`${getBaseUrl()}${NEXT_API_URL}${UPLOAD_FILE_REMAINING_DATA_API}`,
					{
						id: DatabaseData[0]?.id,
						publicUrl: storageData?.publicUrl,
					},
					getAxiosConfigWithAuth(request),
				);
			} else {
				console.error("Remaining upload api error: upload data is empty");
				Sentry.captureException(
					`Remaining upload api error: upload data is empty`,
				);
			}
		} catch (remainingerror) {
			console.error(remainingerror);
			Sentry.captureException(`Remaining upload api error ${remainingerror}`);
		}
	} else {
		response.status(500).json({
			success: false,
			error: (publicUrlError ?? DBerror) as string,
		});
	}
};
