// you might want to use regular 'fs' and not a promise one
import { log } from "console";
import { type NextApiRequest, type NextApiResponse } from "next";
import { type SupabaseClient } from "@supabase/supabase-js";
import { decode } from "base64-arraybuffer";
import { IncomingForm } from "formidable";
import jwtDecode from "jwt-decode";
import isNil from "lodash/isNil";

import {
	type FileNameType,
	type ImgMetadataType,
	type ParsedFormDataType,
	type SingleListData,
	type UploadFileApiResponse,
} from "../../../types/apiTypes";
import { FILES_STORAGE_NAME, MAIN_TABLE_NAME } from "../../../utils/constants";
import { blurhashFromURL } from "../../../utils/getBlurHash";
import { isUserInACategory, parseUploadFileName } from "../../../utils/helpers";
import {
	apiSupabaseClient,
	verifyAuthToken,
} from "../../../utils/supabaseServerClient";

// first we need to disable the default body parser
export const config = {
	api: {
		bodyParser: false,
	},
};

type StorageDataType = {
	publicUrl: string;
};

// this func gets the image caption
const query = async (source: string) => {
	const isImgCaptionEnvironmentsPresent =
		process.env.IMAGE_CAPTION_TOKEN && process.env.IMAGE_CAPTION_URL;

	if (isImgCaptionEnvironmentsPresent) {
		const response = await fetch(source);
		const arrayBuffer = await response.arrayBuffer();
		const data = Buffer.from(arrayBuffer);

		try {
			const imgCaptionResponse = await fetch(
				process.env.IMAGE_CAPTION_URL as string,
				{
					headers: {
						Authorization: `Bearer ${process.env.IMAGE_CAPTION_TOKEN}`,
					},
					method: "POST",
					body: data,
				},
			);

			return imgCaptionResponse;
		} catch (error) {
			log("Img caption error", error);
			return null;
		}
	} else {
		log(`ERROR: Img caption failed due to missing tokens in env`);
		return null;
	}
};

/* 
If the uploaded file is not a video then this function is called 
this function generates the imageCaption and the meta_data for the file
*/
const notVideoLogic = async (storageData: StorageDataType) => {
	const ogImage = storageData?.publicUrl;
	const imageCaption = await query(ogImage as string);

	const jsonResponse = (await imageCaption?.json()) as Array<{
		generated_text: string;
	}>;

	let imgData;

	if (storageData?.publicUrl) {
		try {
			imgData = await blurhashFromURL(storageData?.publicUrl);
		} catch (error) {
			log("Blur hash error", error);
			imgData = {};
		}
	}

	const meta_data = {
		img_caption: jsonResponse?.[0]?.generated_text,
		width: imgData?.width ?? null,
		height: imgData?.height ?? null,
		ogImgBlurUrl: imgData?.encoded ?? null,
		favIcon: null,
	};

	return { ogImage, meta_data };
};

/* 
If the uploaded file is a video then this function is called 
This adds the video thumbnail into S3 
Then it generates the meta_data for the thumbnail, this data has the blurHash thumbnail
Image caption is not generated for the thumbnail 
*/
const videoLogic = async (
	data: ParsedFormDataType,
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
			imgData = {};
		}
	}

	const meta_data = {
		img_caption: null,
		width: imgData?.width ?? null,
		height: imgData?.height ?? null,
		ogImgBlurUrl: imgData?.encoded ?? null,
		favIcon: null,
	};

	return { ogImage, meta_data };
};

export default async (
	request: NextApiRequest,
	response: NextApiResponse<UploadFileApiResponse>,
) => {
	const supabase = apiSupabaseClient();

	// parse form with a Promise wrapper
	const data = (await new Promise((resolve, reject) => {
		const form = new IncomingForm();

		form.parse(request, (error, fields, files) => {
			if (error) {
				reject(error);
				return;
			}

			resolve({ fields, files });
		});
	})) as ParsedFormDataType;

	const accessToken = data?.fields?.access_token?.[0];

	const { error: _error } = verifyAuthToken(accessToken as string);

	if (_error) {
		response.status(500).json({ success: false, error: _error });
		throw new Error(`ERROR: token error ${_error.message}`, _error);
	}

	const categoryId = data?.fields?.category_id?.[0];

	const categoryIdLogic = categoryId
		? isUserInACategory(categoryId)
			? categoryId
			: 0
		: 0;

	const tokenDecode: { sub: string } = jwtDecode(accessToken as string);
	const userId = tokenDecode?.sub;

	const fileName = parseUploadFileName(data?.fields?.name?.[0] ?? "");
	const fileType = data?.fields?.type?.[0];

	const uploadPath = parseUploadFileName(
		data?.fields?.uploadFileNamePath?.[0] as string,
	);
	// if the uploaded file is valid this happens
	const storagePath = `public/${userId}/${uploadPath}`;

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
	};
	const isVideo = fileType?.includes("video");

	let ogImage;

	if (!isVideo) {
		// if file is not a video
		const { ogImage: image, meta_data: metaData } =
			await notVideoLogic(storageData);

		ogImage = image;
		meta_data = metaData;
	} else {
		// if file is a video
		const { ogImage: image, meta_data: metaData } = await videoLogic(
			data,
			userId,
			uploadPath,
			supabase,
		);

		ogImage = image;
		meta_data = metaData;
	}

	// we upload the final data in DB
	const { error: DBerror } = await supabase
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
		.select();

	if (isNil(publicUrlError) && isNil(DBerror)) {
		response.status(200).json({ success: true, error: null });
	} else {
		response.status(500).json({
			success: false,
			error: publicUrlError ?? DBerror,
		});
	}
};
