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
	const { url, favIcon, id } = request.body;

	if (!id) {
		response
			.status(500)
			.json({ data: null, error: "Id in payload is empty", message: null });
		Sentry.captureException(`Id in payload is empty`);
		return;
	}

	const supabase = apiSupabaseClient(request, response);
	const userId = (await supabase?.auth?.getUser())?.data?.user?.id as string;

	if (!userId) {
		response
			.status(401)
			.json({ data: null, error: "User not authenticated", message: null });
		Sentry.captureException(
			"User not authenticated in add-remaining-bookmark-data",
		);
		return;
	}

	// get the current ogImage and screenshot from the database
	// we are got gettin these in query params as that data might not be presnet
	// this is a better solution as we are only getting one row of data
	const { data: currentData, error: currentDataError } = await supabase
		.from(MAIN_TABLE_NAME)
		.select("ogImage, screenshot")
		.match({ id })
		.single();

	if (currentDataError) {
		console.error("Error fetching current bookmark data:", currentDataError);
		response.status(500).json({
			data: null,
			error: "Failed to fetch current bookmark data",
			message: null,
		});
		Sentry.captureException(
			`Failed to fetch current bookmark data: ${currentDataError.message}`,
		);
		return;
	}

	if (!currentData) {
		response
			.status(404)
			.json({ data: null, error: "Bookmark not found", message: null });
		Sentry.captureException(`Bookmark not found with id: ${id}`);
		return;
	}

	const upload = async (
		base64info: string,
		userIdForStorage: ProfilesTableTypes["id"],
	): Promise<string | null> => {
		try {
			const imgName = `img-${uniqid?.time()}.jpg`;
			const storagePath = `${STORAGE_SCRAPPED_IMAGES_PATH}/${userIdForStorage}/${imgName}`;

			const { error: uploadError } = await supabase.storage
				.from(BOOKMAKRS_STORAGE_NAME)
				.upload(storagePath, decode(base64info), {
					contentType: "image/jpg",
				});

			if (uploadError) {
				console.error("Storage upload failed:", uploadError);
				return null;
			}

			const { data: storageData } = supabase.storage
				.from(BOOKMAKRS_STORAGE_NAME)
				.getPublicUrl(storagePath);

			return storageData?.publicUrl || null;
		} catch (error) {
			console.error("Error in upload function:", error);
			return null;
		}
	};

	let imgData;

	let imgUrl;

	const isUrlAnImage = url?.match(URL_IMAGE_CHECK_PATTERN);

	const isUrlAnImageCondition = !isNil(isUrlAnImage) && !isEmpty(isUrlAnImage);

	if (isUrlAnImageCondition) {
		// if the url itself is an img, like something.com/img.jgp, then we need to upload it to s3
		try {
			// Download the image from the URL
			const image = await axios.get(url, {
				responseType: "arraybuffer",
				headers: {
					"User-Agent": "Mozilla/5.0",
					Accept: "image/*,*/*;q=0.8",
				},
				timeout: 10_000,
			});

			const returnedB64 = Buffer.from(image.data).toString("base64");
			imgUrl = await upload(returnedB64, userId);

			// If upload failed, log but don't fail the entire request
			if (imgUrl === null) {
				console.error(
					"Failed to upload image URL to S3, continuing without image",
				);
				Sentry.captureException("Failed to upload image URL to S3");
			}
		} catch (error) {
			console.error("Error uploading image URL to S3:", error);
			Sentry.captureException(`Error uploading image URL to S3: ${error}`);

			// Don't fail the entire request, just set imgUrl to null
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

	// upload scrapper image to s3
	if (!isNil(currentData?.ogImage)) {
		try {
			// 10 second timeout for image download
			const image = await axios.get(currentData?.ogImage, {
				responseType: "arraybuffer",
				// Some servers require headers like User-Agent, especially for images from Open Graph (OG) links.
				headers: {
					"User-Agent": "Mozilla/5.0",
					Accept: "image/*,*/*;q=0.8",
				},
				timeout: 10_000,
			});

			const returnedB64 = Buffer.from(image.data).toString("base64");
			imgUrl = await upload(returnedB64, userId);

			// If upload failed, log but don't fail the entire request
			if (imgUrl === null) {
				console.error("Failed to upload image to S3, continuing without image");
				Sentry.captureException("Failed to upload image to S3");
			}
		} catch (error) {
			console.error("Error uploading scrapped image to S3:", error);
			Sentry.captureException(`Error uploading scrapped image to S3: ${error}`);

			// Don't fail the entire request, just set imgUrl to null
			imgUrl = null;
		}
	}

	let imageOcrValue = null;
	let imageCaption = null;

	// generat meta data (ocr, blurhash data, imgcaption)
	if (!isNil(currentData?.ogImage) || currentData?.screenshot) {
		const imgForWhichMetaDataIsGenerated = !isNil(currentData?.screenshot)
			? currentData?.screenshot
			: currentData?.ogImage;

		imgData = await blurhashFromURL(imgForWhichMetaDataIsGenerated);

		try {
			// Get OCR using the centralized function
			imageOcrValue = await ocr(imgForWhichMetaDataIsGenerated);

			// Get image caption using the centralized function
			imageCaption = await imageToText(imgForWhichMetaDataIsGenerated);
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
