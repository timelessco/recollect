import * as Sentry from "@sentry/nextjs";
import {
	type PostgrestError,
	type SupabaseClient,
} from "@supabase/supabase-js";
import axios from "axios";
import { decode } from "base64-arraybuffer";
import { type VerifyErrors } from "jsonwebtoken";
import { isNil, isNull } from "lodash";
import uniqid from "uniqid";
import { z } from "zod";

import imageToText from "../../../async/ai/imageToText";
import ocr from "../../../async/ai/ocr";
import {
	type ProfilesTableTypes,
	type SingleListData,
} from "../../../types/apiTypes";
import {
	IMAGE_JPEG_MIME_TYPE,
	MAIN_TABLE_NAME,
	R2_MAIN_BUCKET_NAME,
	STORAGE_SCRAPPED_IMAGES_PATH,
} from "../../constants";
import { blurhashFromURL } from "../../getBlurHash";
import {
	checkIfUrlAnImage,
	checkIfUrlAnMedia,
	getBaseUrl,
} from "../../helpers";
import { r2Helpers } from "../../r2Client";

/**
 * Schema for validating remaining bookmark data request
 */
export const remainingBookmarkSchema = z.object({
	id: z.number().min(1, "Bookmark ID is required"),
	url: z.string().url("Invalid URL format"),
	favIcon: z.string().nullable().optional(),
	userId: z.string(),
});

/**
 * Type for bookmark metadata
 */
export type BookmarkMetadata = {
	coverImage: string | null;
	favIcon: string | null;
	height: number | null;
	iframeAllowed: boolean | null;
	img_caption: string | null;
	isOgImagePreferred: boolean;
	isPageScreenshot: boolean | null;
	mediaType: string | null;
	ocr: string | null;
	ogImgBlurUrl: string | null;
	screenshot: string | null;
	twitter_avatar_url: null;
	width: number | null;
};

/**
 * Type for current bookmark data
 */
export type CurrentBookmarkData = {
	description: string | null;
	meta_data: Partial<BookmarkMetadata>;
	ogImage: string | null;
};

/**
 * Uploads an image to R2 storage
 * @param base64info - Base64 encoded image data
 * @param userIdForStorage - User ID for storage path
 * @param storagePath - Optional custom storage path
 * @returns Public URL of the uploaded image or null if upload fails
 */
export const uploadToR2 = async (
	base64info: string,
	userIdForStorage: ProfilesTableTypes["id"],
	storagePath: string | null,
): Promise<string | null> => {
	try {
		const imgName = `img-${uniqid?.time()}.jpg`;
		const storagePath_ =
			storagePath ??
			`${STORAGE_SCRAPPED_IMAGES_PATH}/${userIdForStorage}/${imgName}`;

		const { error: uploadError } = await r2Helpers.uploadObject(
			R2_MAIN_BUCKET_NAME,
			storagePath_,
			new Uint8Array(decode(base64info)),
			IMAGE_JPEG_MIME_TYPE,
		);

		if (uploadError) {
			console.error("R2 upload failed:", uploadError);
			Sentry.captureException(uploadError, {
				tags: { operation: "remaining_upload_to_r2" },
				extra: { userIdForStorage, storagePath: storagePath_ },
			});
			return null;
		}

		const { data: storageData } = r2Helpers.getPublicUrl(storagePath_);

		return storageData?.publicUrl ?? null;
	} catch (error) {
		console.error("Error in upload function:", error);
		Sentry.captureException(error, {
			tags: { operation: "upload_to_r2" },
			extra: { userIdForStorage, storagePath },
		});
		return null;
	}
};

/**
 * Fetches the favicon for a URL
 * @param url - The URL to get favicon for
 * @param favIcon - Optional favicon URL
 * @returns Favicon URL or null
 */
export const getFavIconUrl = async (
	url: string,
	favIcon?: string | null,
): Promise<string | null> => {
	try {
		const { hostname } = new URL(url);

		if (favIcon) {
			if (favIcon?.includes("https://")) {
				return favIcon;
			} else {
				return hostname === "x.com"
					? "https:" + favIcon
					: `https://${getBaseUrl(url)}${favIcon}`;
			}
		} else {
			const result = await fetch(
				`https://www.google.com/s2/favicons?sz=128&domain_url=${hostname}`,
			);
			if (!result.ok) {
				return null;
			}

			return result?.url;
		}
	} catch (error) {
		console.error("Error getting favicon:", error);
		Sentry.captureException(error, {
			tags: { operation: "get_favicon_url" },
			extra: { url, favIcon },
		});
		return null;
	}
};

/**
 * Processes and uploads an image URL to R2
 * @param url - The image URL to process
 * @param userId - User ID for storage
 * @returns Uploaded image URL or null
 */
export const processAndUploadImageUrl = async (
	url: string,
	userId: string,
): Promise<string | null> => {
	try {
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
		const uploadedUrl = await uploadToR2(returnedB64, userId, null);

		if (uploadedUrl === null) {
			console.error("Failed to upload image URL to r2");
		}

		return uploadedUrl;
	} catch (error) {
		console.error("Error uploading image URL to r2:", error);
		Sentry.captureException(error, {
			tags: { operation: "process_and_upload_image_url", userId },
			extra: { url },
		});
		return null;
	}
};

/**
 * Processes and uploads a cover image to R2
 * @param ogImage - Original image URL
 * @param userId - User ID for storage
 * @returns Uploaded image URL or original URL
 */
export const processAndUploadCoverImage = async (
	ogImage: string,
	userId: string,
): Promise<string> => {
	try {
		const image = await axios.get(ogImage, {
			responseType: "arraybuffer",
			headers: {
				"User-Agent": "Mozilla/5.0",
				Accept: "image/*,*/*;q=0.8",
			},
			timeout: 10_000,
		});

		const returnedB64 = Buffer.from(image?.data).toString("base64");
		const uploadedUrl = await uploadToR2(returnedB64, userId, null);

		if (uploadedUrl === null) {
			console.error("Failed to upload cover image to r2");
			return ogImage;
		}

		return uploadedUrl;
	} catch (error) {
		console.error("Error uploading cover image to r2:", error);
		Sentry.captureException(error, {
			tags: { operation: "process_and_upload_cover_image", userId },
			extra: { ogImage },
		});
		return ogImage;
	}
};

/**
 * Generates metadata for an image
 * @param imageUrl - URL of the image
 * @returns Object containing image metadata
 */
export const generateImageMetadata = async (
	imageUrl: string | null,
	supabase: SupabaseClient,
	userId: string,
) => {
	if (!imageUrl) {
		return null;
	}

	try {
		const [imgData, imageOcrValue, imageCaption] = await Promise.all([
			blurhashFromURL(imageUrl),
			ocr(imageUrl, supabase, userId),
			imageToText(imageUrl, supabase, userId),
		]);

		return {
			imgData,
			imageOcrValue,
			imageCaption,
		};
	} catch (error) {
		console.error("Error generating image metadata:", error);
		Sentry.captureException(error, {
			tags: { operation: "generate_image_metadata", userId },
			extra: { imageUrl },
		});
		return {
			imgData: {
				encoded: null,
				width: null,
				height: null,
			},
			imageOcrValue: null,
			imageCaption: null,
		};
	}
};

/**
 * Processes images and generates metadata for a bookmark
 * @param url - The bookmark URL
 * @param userId - User ID for storage
 * @param currentData - Current bookmark data
 * @returns Processed image data and metadata
 */
export const processBookmarkImages = async (
	url: string,
	userId: string,
	currentData: CurrentBookmarkData,
	supabase: SupabaseClient,
) => {
	// Process image URL if present
	let uploadedImageThatIsAUrl = null;
	const isUrlAnImageResult = await checkIfUrlAnImage(url);

	if (isUrlAnImageResult) {
		uploadedImageThatIsAUrl = await processAndUploadImageUrl(url, userId);
	}

	// Process cover image
	let uploadedCoverImageUrl = null;
	const isUrlAnMedia = await checkIfUrlAnMedia(url);

	if (currentData?.ogImage && !isUrlAnMedia) {
		uploadedCoverImageUrl = await processAndUploadCoverImage(
			currentData.ogImage,
			userId,
		);
	}

	// Generate metadata for images
	const ogImageMetaDataGeneration =
		uploadedCoverImageUrl ?? currentData?.meta_data?.screenshot ?? null;

	const imageUrlForMetaDataGeneration = isUrlAnImageResult
		? uploadedImageThatIsAUrl
		: (currentData?.meta_data?.screenshot ?? uploadedCoverImageUrl);

	let metadata = null;
	if (
		!isNil(imageUrlForMetaDataGeneration) ||
		!isNil(ogImageMetaDataGeneration)
	) {
		metadata = await generateImageMetadata(
			currentData?.meta_data?.isOgImagePreferred
				? ogImageMetaDataGeneration
				: imageUrlForMetaDataGeneration,
			supabase,
			userId,
		);
	}

	return {
		uploadedImageThatIsAUrl,
		uploadedCoverImageUrl,
		ogImageMetaDataGeneration,
		imageUrlForMetaDataGeneration,
		metadata,
	};
};

/**
 * Updates a bookmark with remaining data
 * @param supabase - Supabase client
 * @param params - Update parameters
 * @param params.id - Bookmark ID
 * @param params.userId - User ID for authorization
 * @param params.metaData - Updated metadata
 * @param params.description - Updated description
 * @param params.ogImage - Updated OG image URL
 * @returns Updated bookmark data and any error
 */
export const updateBookmarkWithRemainingData = async (
	supabase: SupabaseClient,
	{
		id,
		userId,
		metaData,
		description,
		ogImage,
	}: {
		description: string | null;
		id: number;
		metaData: Record<string, unknown>;
		ogImage: string | null;
		userId: string;
	},
): Promise<{
	data: SingleListData[] | null;
	error: PostgrestError | VerifyErrors | string | null;
}> => {
	const {
		data,
		error: databaseError,
	}: {
		data: SingleListData[] | null;
		error: PostgrestError | VerifyErrors | string | null;
	} = await supabase
		.from(MAIN_TABLE_NAME)
		.update({
			meta_data: metaData,
			description,
			ogImage,
		})
		.match({ id, user_id: userId })
		.select(`id`);

	if (isNull(data)) {
		const error = new Error("DB return data is empty");
		console.error("DB return data is empty for bookmark:", id);
		Sentry.captureException(error, {
			tags: { operation: "update_bookmark_with_remaining_data", userId },
			extra: { id },
		});
		return { data: null, error: "DB return data is empty" };
	}

	if (!isNull(databaseError)) {
		console.error(
			"Failed to update bookmark with remaining data:",
			databaseError,
		);
		Sentry.captureException(databaseError, {
			tags: { operation: "update_bookmark_with_remaining_data", userId },
			extra: { id, description, ogImage },
		});
		return { data: null, error: databaseError };
	}

	return { data, error: null };
};
