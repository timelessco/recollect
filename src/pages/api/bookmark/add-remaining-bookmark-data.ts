// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { log } from "console";
import { type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { type PostgrestError } from "@supabase/supabase-js";
import axios from "axios";
import { decode } from "base64-arraybuffer";
import { type VerifyErrors } from "jsonwebtoken";
import { isEmpty, isNil, isNull } from "lodash";
import uniqid from "uniqid";

import imageToText from "../../../async/ai/imageToText";
import ocr from "../../../async/ai/ocr";
import {
	type AddBookmarkRemainingDataPayloadTypes,
	type NextApiRequest,
	type ProfilesTableTypes,
	type SingleListData,
} from "../../../types/apiTypes";
import {
	BOOKMAKRS_STORAGE_NAME,
	MAIN_TABLE_NAME,
	STORAGE_SCRAPPED_IMAGES_PATH,
	URL_IMAGE_CHECK_PATTERN,
} from "../../../utils/constants";
import { blurhashFromURL } from "../../../utils/getBlurHash";
import { getBaseUrl } from "../../../utils/helpers";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

type Data = {
	data: SingleListData[] | null;
	error: PostgrestError | VerifyErrors | string | null;
	message: string | null;
};

// this uploads all the remaining bookmark data
// these data are blur hash and s3 uploads

export default async function handler(
	request: NextApiRequest<AddBookmarkRemainingDataPayloadTypes>,
	response: NextApiResponse<Data>,
) {
	const { url, image: ogImage, favIcon, id } = request.body;

	if (!id) {
		response
			.status(500)
			.json({ data: null, error: "Id in payload is empty", message: null });
		Sentry.captureException(`Id in payload is empty`);
		return;
	}

	const supabase = apiSupabaseClient(request, response);
	const userId = (await supabase?.auth?.getUser())?.data?.user?.id as string;

	const upload = async (
		base64info: string,
		userIdForStorage: ProfilesTableTypes["id"],
	) => {
		const imgName = `img-${uniqid?.time()}.jpg`;
		const storagePath = `${STORAGE_SCRAPPED_IMAGES_PATH}/${userIdForStorage}/${imgName}`;
		await supabase.storage
			.from(BOOKMAKRS_STORAGE_NAME)
			.upload(storagePath, decode(base64info), {
				contentType: "image/jpg",
			});

		const { data: storageData } = supabase.storage
			.from(BOOKMAKRS_STORAGE_NAME)
			.getPublicUrl(storagePath);

		return storageData?.publicUrl;
	};

	let imgData;

	let imgUrl;

	const isUrlAnImage = url?.match(URL_IMAGE_CHECK_PATTERN);

	if (!isNil(isUrlAnImage) && !isEmpty(isUrlAnImage)) {
		// if the url itself is an img, like something.com/img.jgp, then we are not going to upload it to s3
		imgUrl = url;
	}

	if (ogImage) {
		try {
			const image = await axios.get(ogImage, {
				responseType: "arraybuffer",
			});

			const returnedB64 = Buffer.from(image.data).toString("base64");

			imgData = await blurhashFromURL(ogImage);

			// this code is for the blur hash resize issue, uncomment this after blurhashFromURL supports image resize
			// let returnedB64;
			// if (imgData?.height > 600 || imgData?.width > 600) {
			// 	const compressedImg = await sharp(image.data)
			// 	.resize({ width: 600, height: 600 })
			// 	.toBuffer();

			// 	returnedB64 = compressedImg?.toString("base64");
			// } else {
			// 	returnedB64 = Buffer.from(image.data).toString("base64");
			// }

			imgUrl = await upload(returnedB64, userId);
		} catch (error) {
			log("Error: ogImage is 404", error);
			imgUrl = null;
		}
	}

	const favIconLogic = () => {
		if (favIcon) {
			if (favIcon?.includes("https://")) {
				return favIcon;
			} else {
				return `https://${getBaseUrl(url)}${favIcon}`;
			}
		} else {
			return null;
		}
	};

	let imageOcrValue = null;
	let imageCaption = null;

	if (ogImage) {
		try {
			// Get OCR using the centralized function
			imageOcrValue = await ocr(ogImage);

			// Get image caption using the centralized function
			imageCaption = await imageToText(ogImage);
		} catch (error) {
			console.error("Gemini AI processing error", error);
			Sentry.captureException(`Gemini AI processing error ${error}`);
		}
	}

	const meta_data = {
		img_caption: imageCaption,
		width: imgData?.width,
		height: imgData?.height,
		ogImgBlurUrl: imgData?.encoded,
		favIcon: favIconLogic(),
		ocr: imageOcrValue,
	};

	const {
		data,
		error: databaseError,
	}: {
		data: SingleListData[] | null;
		error: PostgrestError | VerifyErrors | string | null;
	} = await supabase
		.from(MAIN_TABLE_NAME)
		.update({ meta_data, ogImage: imgUrl })
		.match({ id })
		.select(`id`);

	if (isNull(data)) {
		console.error(
			"add remaining bookmark data error, return data is empty",
			databaseError,
		);
		response
			.status(500)
			.json({ data: null, error: "DB return data is empty", message: null });
		Sentry.captureException(`DB return data is empty`);
		return;
	}

	if (!isNull(databaseError)) {
		console.error("add remaining bookmark data error", databaseError);
		response
			.status(500)
			.json({ data: null, error: databaseError, message: null });
		Sentry.captureException(
			`add remaining bookmark data error: ${databaseError?.message}`,
		);
	} else {
		response.status(200).json({ data, error: null, message: null });
	}
}
