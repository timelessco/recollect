// you might want to use regular 'fs' and not a promise one
import { log } from "console";
import { type NextApiRequest, type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import {
	type PostgrestError,
	type SupabaseClient,
} from "@supabase/supabase-js";
import axios from "axios";
import { decode } from "base64-arraybuffer";
import { IncomingForm } from "formidable";
import { type VerifyErrors } from "jsonwebtoken";
import { isEmpty } from "lodash";
import isNil from "lodash/isNil";

import { insertEmbeddings } from "../../../../../../async/supabaseCrudHelpers/ai/embeddings";
import {
	type FileNameType,
	type ImgMetadataType,
	type ParsedFormDataType,
	type SingleListData,
	type UploadFileApiResponse,
} from "../../../../../../types/apiTypes";
import {
	FILES_STORAGE_NAME,
	getBaseUrl,
	MAIN_TABLE_NAME,
	NEXT_API_URL,
	UPLOAD_FILE_REMAINING_DATA_API,
} from "../../../../../../utils/constants";
import { blurhashFromURL } from "../../../../../../utils/getBlurHash";
import {
	apiCookieParser,
	isUserInACategory,
	parseUploadFileName,
} from "../../../../../../utils/helpers";
import { apiSupabaseClient } from "../../../../../../utils/supabaseServerClient";
import { checkIfUserIsCategoryOwnerOrCollaborator } from "../../../../bookmark/add-bookmark-min-data";

// NOTE: THIS API IS ONLY USED IN TEST CASES
// As the upload api needs supabase in the FE and in test cases we cannot use supabase, we use this api which is tailored to be used in test cases
// This api uploads an existing file in the S3 bucket as a new bookmark and this bookmark can be used for testing needs

type StorageDataType = {
	publicUrl: string;
};

/* 
If the uploaded file is a video then this function is called 
This adds the video thumbnail into S3 
Then it generates the meta_data for the thumbnail, this data has the blurHash thumbnail
Image caption is not generated for the thumbnail 
*/
const videoLogic = async (
	data: { fields: ParsedFormDataType["fields"] },
	userId: SingleListData["user_id"]["id"],
	fileName: FileNameType,
	supabase: SupabaseClient,
) => {
	// if the file is a video, we upload the video thumbnail base64 to s3 and then we get the images blur hash and set the img s3 url as ogImage and blur hash in meta data
	const base64 = data?.fields?.thumbnailBase64?.[0]?.split("base64,")[1];

	const videoStoragePath = `public/${userId}/thumbnail-${fileName}`;

	const { error: thumbnailError } = await supabase.storage
		.from(FILES_STORAGE_NAME)
		.upload(videoStoragePath, decode(base64 ?? ""), {
			contentType: "image/png",
			upsert: true,
		});

	if (!isNil(thumbnailError)) {
		throw new Error(`ERROR: thumbnailError ${thumbnailError?.message}`);
	}

	const { data: thumbnailUrl, error: thumbnailUrlError } = supabase.storage
		.from(FILES_STORAGE_NAME)
		.getPublicUrl(videoStoragePath) as {
		data: StorageDataType;
		error: UploadFileApiResponse["error"];
	};

	if (!isNil(thumbnailUrlError)) {
		throw new Error(`ERROR: thumbnailUrlError ${thumbnailUrlError?.toString}`);
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

	const data = {
		fields: {
			category_id: request?.body?.category_id,
			name: [request?.body?.name],
			thumbnailBase64: request?.body?.thumbnailBase64,
			type: [request?.body?.type],
			uploadFileNamePath: [request?.body?.uploadFileNamePath],
		},
	};

	const categoryId = data?.fields?.category_id?.[0];

	const categoryIdLogic = categoryId
		? isUserInACategory(categoryId)
			? categoryId
			: 0
		: 0;

	const userData = await supabase?.auth?.getUser();

	const userId = userData?.data?.user?.id;
	const email = userData?.data?.user?.email;

	const fileName = parseUploadFileName(data?.fields?.name?.[0] ?? "");
	const fileType = data?.fields?.type?.[0];

	const uploadPath = parseUploadFileName(
		data?.fields?.uploadFileNamePath?.[0] as string,
	);
	// if the uploaded file is valid this happens
	const storagePath = `public/${userId}/${uploadPath}`;

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
	const { data: storageData, error: publicUrlError } = supabase.storage
		.from(FILES_STORAGE_NAME)
		.getPublicUrl(storagePath) as {
		data: StorageDataType;
		error: UploadFileApiResponse["error"];
	};

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
			data as unknown as { fields: ParsedFormDataType["fields"] },
			userId as string,
			uploadPath,
			supabase,
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
					{
						headers: {
							Cookie: apiCookieParser(request?.cookies),
						},
					},
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

		// create embeddings
		try {
			await insertEmbeddings([DatabaseData[0]?.id], request?.cookies);
		} catch {
			console.error("create embeddings error");
			Sentry.captureException("create embeddings error");
		}
	} else {
		response.status(500).json({
			success: false,
			error: (publicUrlError ?? DBerror) as string,
		});
	}
};
