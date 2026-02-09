// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { type PostgrestError } from "@supabase/supabase-js";
import axios from "axios";
import { decode } from "base64-arraybuffer";
import { type VerifyErrors } from "jsonwebtoken";
import { isNil, isNull } from "lodash";
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
	BOOKMARK_CATEGORIES_TABLE_NAME,
	IMAGE_JPEG_MIME_TYPE,
	MAIN_TABLE_NAME,
	R2_MAIN_BUCKET_NAME,
	STORAGE_SCRAPPED_IMAGES_PATH,
} from "../../../utils/constants";
import { blurhashFromURL } from "../../../utils/getBlurHash";
import {
	checkIfUrlAnImage,
	checkIfUrlAnMedia,
	getNormalisedImageUrl,
} from "../../../utils/helpers";
import { storageHelpers } from "../../../utils/storageClient";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

import { revalidateCategoriesIfPublic } from "@/lib/revalidation-helpers";
import { createServerServiceClient } from "@/lib/supabase/service";

type Data = {
	data: SingleListData[] | null;
	error: PostgrestError | VerifyErrors | string | null;
	message: string | null;
};

// this uploads all the remaining bookmark data
// these data are blur hash and r2 uploads

export const upload = async (
	base64info: string,
	userIdForStorage: ProfilesTableTypes["id"],
	storagePath: string | null,
): Promise<string | null> => {
	try {
		const imgName = `img-${uniqid?.time()}.jpg`;
		const storagePath_ =
			storagePath ??
			`${STORAGE_SCRAPPED_IMAGES_PATH}/${userIdForStorage}/${imgName}`;

		const { error: uploadError } = await storageHelpers.uploadObject(
			R2_MAIN_BUCKET_NAME,
			storagePath_,
			new Uint8Array(decode(base64info)),
			IMAGE_JPEG_MIME_TYPE,
		);

		if (uploadError) {
			Sentry.captureException(`R2 upload failed`);
			console.error("R2 upload failed:", uploadError);
			return null;
		}

		const { data: storageData } = storageHelpers.getPublicUrl(storagePath_);

		return storageData?.publicUrl || null;
	} catch (error) {
		console.error("Error in upload function:", error);
		return null;
	}
};

export default async function handler(
	request: NextApiRequest<AddBookmarkRemainingDataPayloadTypes>,
	response: NextApiResponse<Data>,
) {
	const { url, id } = request.body;

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
		.select("ogImage, meta_data, description")
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

	// if a url is an image, then we need to upload it to r2 and store it here
	let uploadedImageThatIsAUrl = null;

	const isUrlAnImage = await checkIfUrlAnImage(url);
	// ***** here we are checking the url is of an image or not,if it is so we upload the image in bucket and url in ogImage*****

	// const isUrlAnImageCondition = !isNil(isUrlAnImage) && !isEmpty(isUrlAnImage);
	const isUrlAnImageCondition = isUrlAnImage;

	if (isUrlAnImageCondition) {
		// if the url itself is an img, like something.com/img.jgp, then we need to upload it to r2
		try {
			// Download the image from the URL
			const realImageUrl = new URL(url)?.searchParams.get("url");

			const image = await axios.get(realImageUrl ?? url, {
				responseType: "arraybuffer",
				headers: {
					"User-Agent": "Mozilla/5.0",
					Accept: "image/*,*/*;q=0.8",
				},
				timeout: 10_000,
			});

			const returnedB64 = Buffer?.from(image?.data)?.toString("base64");
			uploadedImageThatIsAUrl = await upload(returnedB64, userId, null);

			// If upload failed, log but don't fail the entire request
			if (uploadedImageThatIsAUrl === null) {
				console.error(
					"Failed to upload image URL to R2, continuing without image",
				);
				Sentry.captureException("Failed to upload image URL to R2");
			}
		} catch (error) {
			console.error("Error uploading image URL to R2:", error);
			Sentry.captureException(`Error uploading image URL to R2: ${error}`);

			// Don't fail the entire request, just set imgUrl to null
			uploadedImageThatIsAUrl = null;
		}
	}

	let uploadedCoverImageUrl = null;
	const isUrlAnMedia = await checkIfUrlAnMedia(url);
	const isAudio = currentData?.meta_data?.mediaType?.includes("audio");
	// upload scrapper image to r2
	if (currentData?.ogImage && !isUrlAnMedia) {
		const ogImageNormalisedUrl = await getNormalisedImageUrl(
			currentData?.ogImage,
			url,
		);

		try {
			// 10 second timeout for image download
			const image = await axios.get(
				ogImageNormalisedUrl || currentData?.ogImage,
				{
					responseType: "arraybuffer",
					// Some servers require headers like User-Agent, especially for images from Open Graph (OG) links.
					headers: {
						"User-Agent": "Mozilla/5.0",
						Accept: "image/*,*/*;q=0.8",
					},
					timeout: 10_000,
				},
			);

			const returnedB64 = Buffer.from(image?.data).toString("base64");
			uploadedCoverImageUrl = await upload(returnedB64, userId, null);

			// If upload failed, log but don't fail the entire request
			if (uploadedCoverImageUrl === null) {
				uploadedCoverImageUrl = currentData?.ogImage;
				console.error("Failed to upload image to R2, continuing without image");
				Sentry.captureException("Failed to upload image to R2");
			}
		} catch (error) {
			uploadedCoverImageUrl = currentData?.ogImage;
			console.error("Error uploading scrapped image to R2:", error);
			Sentry.captureException(`Error uploading scrapped image to R2: ${error}`);
		}
	}

	let imageOcrValue = null;
	let ocrStatus: "success" | "limit_reached" | "no_text" = "no_text";
	let imageCaption = null;

	//	generate meta data for og image for websites like cosmos, pintrest because they have better ogImage
	const ogImageMetaDataGeneration = uploadedCoverImageUrl
		? uploadedCoverImageUrl
		: currentData?.meta_data?.screenshot;

	// generat meta data (ocr, blurhash data, imgcaption)
	// For audio bookmarks use currentData.ogImage (fallback) so we can run OCR/caption
	const imageUrlForMetaDataGeneration = isUrlAnImageCondition
		? uploadedImageThatIsAUrl
		: isAudio && currentData?.ogImage
			? currentData.ogImage
			: currentData?.meta_data?.screenshot
				? currentData?.meta_data?.screenshot
				: uploadedCoverImageUrl;

	if (
		!isNil(imageUrlForMetaDataGeneration) ||
		!isNil(ogImageMetaDataGeneration)
	) {
		try {
			imgData = await blurhashFromURL(
				currentData?.meta_data?.isOgImagePreferred
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
			// Returns { text, status } object
			const ocrResult = await ocr(
				imageUrlForMetaDataGeneration,
				supabase,
				userId,
			);
			imageOcrValue = ocrResult.text;
			ocrStatus = ocrResult.status;

			// Get image caption using the centralized function
			imageCaption = await imageToText(
				currentData?.meta_data?.isOgImagePreferred
					? ogImageMetaDataGeneration
					: imageUrlForMetaDataGeneration,
				supabase,
				userId,
			);
		} catch (error) {
			console.error("Gemini AI processing error", error);
			Sentry.captureException(`Gemini AI processing error ${error}`);
		}
	}

	// Get existing meta_data or create empty object if null
	const existingMetaData = currentData?.meta_data || {};

	const meta_data = {
		...existingMetaData,
		img_caption: imageCaption,
		width: imgData?.width,
		height: imgData?.height,
		ogImgBlurUrl: imgData?.encoded,
		ocr: imageOcrValue,
		ocr_status: ocrStatus,
		coverImage: uploadedCoverImageUrl,
	};

	// Preserve existing ogImage (e.g. audio fallback) when computed value would be null
	const computedOgImage = currentData?.meta_data?.isOgImagePreferred
		? ogImageMetaDataGeneration
		: imageUrlForMetaDataGeneration;

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
			description: currentData?.description || imageCaption,
			ogImage: computedOgImage ?? currentData?.ogImage,
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

		// Revalidate public category pages - non-blocking
		void (async () => {
			try {
				const serviceClient = await createServerServiceClient();

				// Get all categories this bookmark belongs to
				const { data: bookmarkCategories } = await serviceClient
					.from(BOOKMARK_CATEGORIES_TABLE_NAME)
					.select("category_id")
					.eq("bookmark_id", id);

				const categoryIds =
					bookmarkCategories?.map((bc) => bc.category_id) ?? [];

				if (categoryIds.length > 0) {
					console.log(
						"[add-remaining-bookmark-data] Initiating revalidation:",
						{
							bookmarkId: id,
							categoryIds,
							userId,
						},
					);

					await revalidateCategoriesIfPublic(categoryIds, {
						operation: "update_bookmark_metadata",
						userId,
					});
				} else {
					console.log(
						"[add-remaining-bookmark-data] No categories to revalidate:",
						{ bookmarkId: id },
					);
				}
			} catch (error) {
				console.error("[add-remaining-bookmark-data] Revalidation failed:", {
					error,
					errorMessage:
						error instanceof Error
							? error.message
							: "revalidation failed in add-remaining-bookmark-data",
					bookmarkId: id,
					userId,
				});
				Sentry.captureException(error, {
					tags: { route: "add-remaining-bookmark-data" },
					extra: { bookmarkId: id, userId },
				});
			}
		})();
	}
}
