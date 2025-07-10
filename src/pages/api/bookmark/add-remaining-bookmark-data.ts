// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

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
	MAIN_TABLE_NAME,
	OG_IMAGE_PREFERRED_SITES,
	R2_MAIN_BUCKET_NAME,
	STORAGE_SCRAPPED_IMAGES_PATH,
	URL_IMAGE_CHECK_PATTERN,
} from "../../../utils/constants";
import { blurhashFromURL } from "../../../utils/getBlurHash";
import { getBaseUrl } from "../../../utils/helpers";
import { r2Helpers } from "../../../utils/r2Client";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

type Data = {
	data: SingleListData[] | null;
	error: PostgrestError | VerifyErrors | string | null;
	message: string | null;
};

// this uploads all the remaining bookmark data
// these data are blur hash and s3 uploads

const upload = async (
	base64info: string,
	userIdForStorage: ProfilesTableTypes["id"],
): Promise<string | null> => {
	try {
		const imgName = `img-${uniqid?.time()}.jpg`;
		const storagePath = `${STORAGE_SCRAPPED_IMAGES_PATH}/${userIdForStorage}/${imgName}`;

		const { error: uploadError } = await r2Helpers.uploadObject(
			R2_MAIN_BUCKET_NAME,
			storagePath,
			new Uint8Array(decode(base64info)),
			"image/jpg",
		);

		if (uploadError) {
			Sentry.captureException(`R2 upload failed`);
			console.error("R2 upload failed:", uploadError);
			return null;
		}

		const { data: storageData } = r2Helpers.getPublicUrl(storagePath);

		return storageData?.publicUrl || null;
	} catch (error) {
		console.error("Error in upload function:", error);
		return null;
	}
};

// eslint-disable-next-line complexity
export default async function handler(
	request: NextApiRequest<AddBookmarkRemainingDataPayloadTypes>,
	response: NextApiResponse<Data>,
) {
	const { url, favIcon, id } = request.body;

	const urlHost = new URL(url).hostname.toLowerCase();
	const urlString = url.toLowerCase();

	const isOgImagePreferred = OG_IMAGE_PREFERRED_SITES.some(
		(keyword) => urlHost.includes(keyword) || urlString.includes(keyword),
	);
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

	// get the current ogImage and meta_data from the database
	// we are got gettin these in query params as that data might not be presnet
	// this is a better solution as we are only getting one row of data
	const { data: currentData, error: currentDataError } = await supabase
		.from(MAIN_TABLE_NAME)
		.select("ogImage, meta_data")
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

	let imgData;

	// if a url is an image, then we need to upload it to s3 and store it here
	let uploadedImageThatIsAUrl = null;

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
			uploadedImageThatIsAUrl = await upload(returnedB64, userId);

			// If upload failed, log but don't fail the entire request
			if (uploadedImageThatIsAUrl === null) {
				console.error(
					"Failed to upload image URL to S3, continuing without image",
				);
				Sentry.captureException("Failed to upload image URL to S3");
			}
		} catch (error) {
			console.error("Error uploading image URL to S3:", error);
			Sentry.captureException(`Error uploading image URL to S3: ${error}`);

			// Don't fail the entire request, just set imgUrl to null
			uploadedImageThatIsAUrl = null;
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

	let uploadedCoverImageUrl = null;

	// upload scrapper image to s3
	if (!isNil(currentData?.meta_data?.coverImage)) {
		try {
			// 10 second timeout for image download
			const image = await axios.get(currentData?.meta_data?.coverImage, {
				responseType: "arraybuffer",
				// Some servers require headers like User-Agent, especially for images from Open Graph (OG) links.
				headers: {
					"User-Agent": "Mozilla/5.0",
					Accept: "image/*,*/*;q=0.8",
				},
				timeout: 10_000,
			});

			const returnedB64 = Buffer.from(image.data).toString("base64");
			uploadedCoverImageUrl = await upload(returnedB64, userId);

			// If upload failed, log but don't fail the entire request
			if (uploadedCoverImageUrl === null) {
				uploadedCoverImageUrl = currentData?.meta_data?.coverImage;
				console.error("Failed to upload image to S3, continuing without image");
				Sentry.captureException("Failed to upload image to S3");
			}
		} catch (error) {
			uploadedCoverImageUrl = currentData?.meta_data?.coverImage;
			console.error("Error uploading scrapped image to S3:", error);
			Sentry.captureException(`Error uploading scrapped image to S3: ${error}`);
		}
	}

	let imageOcrValue = null;
	let imageCaption = null;

	//	generate meta data for og image for websites like cosmos, pintrest because they have better ogImage
	const ogImageMetaDataGeneration =
		!isNil(uploadedCoverImageUrl) && uploadedCoverImageUrl;

	// generat meta data (ocr, blurhash data, imgcaption)
	const imageUrlForMetaDataGeneration = isUrlAnImageCondition
		? uploadedImageThatIsAUrl
		: !isNil(uploadedCoverImageUrl)
		? uploadedCoverImageUrl
		: currentData?.meta_data?.screenshot;

	console.log("isOgImagePreferred", isOgImagePreferred);

	console.log("imageUrlForMetaDataGeneration", imageUrlForMetaDataGeneration);
	console.log("ogImageMetaDataGeneration", ogImageMetaDataGeneration);

	if (
		!isNil(imageUrlForMetaDataGeneration) &&
		!isNil(ogImageMetaDataGeneration)
	) {
		try {
			imgData = await blurhashFromURL(
				isOgImagePreferred
					? ogImageMetaDataGeneration
					: imageUrlForMetaDataGeneration,
			);
		} catch (error) {
			console.error("Error generating blurhash:", error);
			Sentry.captureException(`Error generating blurhash: ${error}`);
			imgData = {
				encoded: null,
				width: null,
				height: null,
			};
		}

		try {
			// Get OCR using the centralized function
			imageOcrValue = await ocr(imageUrlForMetaDataGeneration);

			// Get image caption using the centralized function
			imageCaption = await imageToText(
				isOgImagePreferred
					? ogImageMetaDataGeneration
					: imageUrlForMetaDataGeneration,
			);
		} catch (error) {
			console.error("Gemini AI processing error", error);
			Sentry.captureException(`Gemini AI processing error ${error}`);
		}
	}

	// Get existing meta_data or create empty object if null
	const existingMetaData = currentData?.meta_data || {};

	const meta_data = {
		img_caption: imageCaption,
		width: imgData?.width,
		height: imgData?.height,
		ogImgBlurUrl: imgData?.encoded,
		favIcon: favIconLogic(),
		ocr: imageOcrValue,
		screenshot: existingMetaData?.screenshot || null,
		coverImage: uploadedCoverImageUrl,
		twitter_avatar_url: null,
	};

	// eslint-disable-next-line no-console
	console.log(
		"isOgImagePreferred~~~~~~~~~~~~~~~~",
		isOgImagePreferred,
		"ogImageMetaDataGeneration~~~",
		ogImageMetaDataGeneration,
		"imageUrlForMetaDataGeneration~~~",
		imageUrlForMetaDataGeneration,
		"final condition~~~~~~~~~",
		isOgImagePreferred
			? ogImageMetaDataGeneration
			: imageUrlForMetaDataGeneration,
	);

	const {
		data,
		error: databaseError,
	}: {
		data: SingleListData[] | null;
		error: PostgrestError | VerifyErrors | string | null;
	} = await supabase
		.from(MAIN_TABLE_NAME)
		.update({
			meta_data,
			ogImage: imageUrlForMetaDataGeneration,
		})
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
