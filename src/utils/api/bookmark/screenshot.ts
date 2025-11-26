import * as Sentry from "@sentry/nextjs";
import {
	type PostgrestError,
	type SupabaseClient,
} from "@supabase/supabase-js";
import axios from "axios";
import { decode } from "base64-arraybuffer";
import { type VerifyErrors } from "jsonwebtoken";
import { isNull } from "lodash";
import uniqid from "uniqid";
import { z } from "zod";

import { type SingleListData } from "../../../types/apiTypes";
import {
	ADD_REMAINING_BOOKMARK_API,
	getBaseUrl,
	MAIN_TABLE_NAME,
	NEXT_API_URL,
	R2_MAIN_BUCKET_NAME,
	SCREENSHOT_API,
	STORAGE_SCREENSHOT_IMAGES_PATH,
} from "../../constants";
import { apiCookieParser } from "../../helpers";
import { r2Helpers } from "../../r2Client";

/**
 * Maximum length for title and description fields
 */
export const MAX_LENGTH = 1_300;

/**
 * Zod schema for validating screenshot request payload
 * Requires:
 * - id: non-empty string (bookmark ID)
 * - url: valid URL string
 * - userId: user ID
 */
export const screenshotRequestSchema = z.object({
	id: z.number().min(1, "Bookmark ID is required"),
	url: z.string().url("Invalid URL format"),
	userId: z.string(),
});

/**
 * Uploads a screenshot image to R2 storage
 * @param base64info - Base64 encoded image data
 * @param uploadUserId - User ID for creating the storage path
 * @returns Public URL of the uploaded image or null if upload fails
 */
export const uploadScreenshot = async (
	base64info: string,
	uploadUserId: string,
) => {
	const imgName = `img-${uniqid?.time()}.jpg`;
	const storagePath = `${STORAGE_SCREENSHOT_IMAGES_PATH}/${uploadUserId}/${imgName}`;

	const { error: uploadError } = await r2Helpers.uploadObject(
		R2_MAIN_BUCKET_NAME,
		storagePath,
		new Uint8Array(decode(base64info)),
		"image/jpg",
	);

	if (uploadError) {
		Sentry.captureException("R2 upload failed", {
			extra: { error: uploadError },
		});
		console.error("R2 upload failed:", uploadError);
		return null;
	}

	const { data: storageData } = r2Helpers.getPublicUrl(storagePath);

	return storageData?.publicUrl ?? null;
};

/**
 * Captures a screenshot of a URL using the screenshot service
 * @param url - URL to capture screenshot of
 * @returns Object containing success status, screenshot data, and any error
 */
export const captureScreenshot = async (url: string) => {
	try {
		console.error(
			"*************************Screenshot Loading*****************************",
		);
		const screenShotResponse = await axios.get(
			`${SCREENSHOT_API}/try?url=${encodeURIComponent(url)}`,
			{
				responseType: "json",
			},
		);
		if (screenShotResponse.status === 200) {
			console.log("***Screenshot success**");
		}

		return {
			success: true,
			data: screenShotResponse.data,
			error: null,
		};
	} catch (error_) {
		console.error("Screenshot error~~~~~~~~~~~~~~~~~~~~~~~~~~~:", error_);
		if (error_ instanceof Error) {
			console.error("Screenshot error");
			Sentry.captureException("Screenshot capture failed", {
				extra: { error: error_.message },
			});
		}

		return {
			success: false,
			data: null,
			error: "Failed to capture screenshot",
		};
	}
};

/**
 * Fetches existing bookmark data from the database
 * @param supabase - Supabase client instance
 * @param bookmarkId - ID of the bookmark to fetch
 * @param userId - User ID who owns the bookmark
 * @returns Object containing bookmark data and any error
 */
export const fetchExistingBookmarkData = async (
	supabase: SupabaseClient,
	bookmarkId: string,
	userId: string,
) => {
	const { data: existingBookmarkData, error: fetchError } = await supabase
		.from(MAIN_TABLE_NAME)
		.select("meta_data, ogImage, title, description")
		.match({ id: bookmarkId, user_id: userId })
		.single();

	if (fetchError) {
		console.error("Error fetching existing bookmark data:", fetchError);
		Sentry.captureException("Failed to fetch existing bookmark data", {
			extra: { error: fetchError },
		});
		return { data: null, error: fetchError };
	}

	return { data: existingBookmarkData, error: null };
};

/**
 * Updates a bookmark with screenshot data
 * @param supabase - Supabase client instance
 * @param params - Object containing bookmark update parameters
 * @param params.bookmarkId - ID of the bookmark to update
 * @param params.userId - User ID who owns the bookmark
 * @param params.title - Updated title
 * @param params.description - Updated description
 * @param params.metaData - Updated metadata object
 * @returns Object containing updated bookmark data and any error
 */
export const updateBookmarkWithScreenshot = async (
	supabase: SupabaseClient,
	{
		bookmarkId,
		userId,
		title,
		description,
		metaData,
	}: {
		bookmarkId: string;
		description: string;
		metaData: Record<string, unknown>;
		title: string;
		userId: string;
	},
) => {
	const {
		data,
		error,
	}: {
		data: SingleListData[] | null;
		error: PostgrestError | VerifyErrors | string | null;
	} = await supabase
		.from(MAIN_TABLE_NAME)
		.update({
			title,
			description,
			meta_data: metaData,
		})
		.match({ id: bookmarkId, user_id: userId })
		.select();

	if (isNull(error)) {
		return { data, error: null };
	}

	Sentry.captureException("Failed to update screenshot in DB", {
		extra: { error },
	});
	return { data: null, error };
};

/**
 * Uploads remaining bookmark data asynchronously
 * @param data - Array of bookmark data
 * @param url - URL of the bookmark
 * @param cookies - Request cookies for authentication
 * @returns Object containing any error that occurred
 */
export const uploadRemainingBookmarkData = async (
	data: SingleListData[],
	url: string,
	cookies: Partial<{
		[key: string]: string;
	}>,
) => {
	try {
		if (data && data.length > 0) {
			await axios.post(
				`${getBaseUrl()}${NEXT_API_URL}${ADD_REMAINING_BOOKMARK_API}`,
				{
					id: data[0]?.id,
					favIcon: data?.[0]?.meta_data?.favIcon,
					url,
				},
				{
					headers: {
						Cookie: apiCookieParser(cookies),
					},
				},
			);
		}

		return { error: null };
	} catch (remainingUploadError) {
		console.error("Remaining bookmark data API error:", remainingUploadError);
		Sentry.captureException("Failed to upload remaining bookmark data", {
			extra: { error: remainingUploadError },
		});
		return { error: remainingUploadError };
	}
};
