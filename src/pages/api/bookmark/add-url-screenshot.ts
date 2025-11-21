import { type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { type PostgrestError } from "@supabase/supabase-js";
import axios from "axios";
import { decode } from "base64-arraybuffer";
import { type VerifyErrors } from "jsonwebtoken";
import uniqid from "uniqid";

import {
	type AddBookmarkScreenshotPayloadTypes,
	type NextApiRequest,
	type SingleListData,
} from "../../../types/apiTypes";
import {
	ADD_REMAINING_BOOKMARK_API,
	getBaseUrl,
	MAIN_TABLE_NAME,
	NEXT_API_URL,
	R2_MAIN_BUCKET_NAME,
	SCREENSHOT_API,
	STORAGE_SCREENSHOT_IMAGES_PATH,
} from "../../../utils/constants";
import { getAxiosConfigWithAuth } from "../../../utils/helpers";
import { r2Helpers } from "../../../utils/r2Client";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

import { vet } from "@/utils/try";

type Data = {
	data: SingleListData[] | null;
	error: PostgrestError | VerifyErrors | string | null;
};
type CollectAdditionalImagesArgs = {
	allImages?: string[];
	userId: string;
};
const MAX_LENGTH = 1_300;
export const upload = async (base64info: string, uploadUserId: string) => {
	const imgName = `img-${uniqid?.time()}.jpg`;
	const storagePath = `${STORAGE_SCREENSHOT_IMAGES_PATH}/${uploadUserId}/${imgName}`;

	const { error: uploadError } = await r2Helpers.uploadObject(
		R2_MAIN_BUCKET_NAME,
		storagePath,
		new Uint8Array(decode(base64info)),
		"image/jpg",
	);

	if (uploadError) {
		console.error("R2 upload failed:", uploadError);
		Sentry.captureException(uploadError, {
			tags: {
				operation: "r2_upload",
				userId: uploadUserId,
			},
			extra: {
				storagePath,
			},
		});
		return null;
	}

	const { data: storageData } = r2Helpers.getPublicUrl(storagePath);

	return storageData?.publicUrl || null;
};

const collectAdditionalImages = async ({
	allImages,
	userId,
}: CollectAdditionalImagesArgs) => {
	if (!allImages?.length) {
		return [];
	}

	const settledImages = await Promise.allSettled(
		allImages.map(async (b64buffer) => {
			const base64 = Buffer.from(b64buffer, "binary").toString("base64");
			return await upload(base64, userId);
		}),
	);

	const failedUploads = settledImages
		.map((result, index) => ({ result, index }))
		.filter(({ result }) => result.status === "rejected") as Array<{
		result: PromiseRejectedResult;
		index: number;
	}>;

	if (failedUploads.length > 0) {
		for (const { result, index } of failedUploads) {
			const error = result.reason;

			console.warn("collectAdditionalImages upload failed:", {
				operation: "collect_additional_images",
				userId,
				imageIndex: index,
				error,
			});
		}
	}

	return settledImages
		.filter(
			(result): result is PromiseFulfilledResult<string | null> =>
				result.status === "fulfilled" && Boolean(result.value),
		)
		.map((fulfilled) => fulfilled.value) as string[];
};

export default async function handler(
	request: NextApiRequest<AddBookmarkScreenshotPayloadTypes>,
	response: NextApiResponse<Data>,
) {
	try {
		const supabase = apiSupabaseClient(request, response);

		// Check for auth errors
		const { data: userData, error: userError } = await supabase.auth.getUser();
		const userId = userData?.user?.id;

		if (userError || !userId) {
			console.warn("User authentication failed:", {
				error: userError?.message,
			});
			response.status(401).json({
				data: null,
				error: "Unauthorized",
			});
			return;
		}

		// Entry point log
		console.log("add-url-screenshot API called:", {
			userId,
			url: request.body.url,
			id: request.body.id,
		});

		const [screenshotError, screenShotResponse] = await vet(() =>
			axios.get(
				`${SCREENSHOT_API}/try?url=${encodeURIComponent(request.body.url)}`,
				{ responseType: "json" },
			),
		);

		if (screenshotError) {
			console.error("Screenshot API error:", screenshotError);
			Sentry.captureException(screenshotError, {
				tags: {
					operation: "screenshot_api",
					userId,
				},
				extra: { url: request.body.url },
			});
			response.status(500).json({
				data: null,
				error: "Error capturing screenshot",
			});
			return;
		}

		console.log("Screenshot API response received:", {
			status: screenShotResponse.status,
		});

		const base64data = Buffer?.from(
			screenShotResponse?.data?.screenshot?.data,
			"binary",
		)?.toString("base64");

		const { title, description, isPageScreenshot } =
			screenShotResponse?.data.metaData || {};

		const publicURL = await upload(base64data, userId);

		// First, fetch the existing bookmark data to get current meta_data
		const { data: existingBookmarkData, error: fetchError } = await supabase
			.from(MAIN_TABLE_NAME)
			.select("meta_data, ogImage, title, description")
			.match({ id: request.body.id, user_id: userId })
			.single();

		if (fetchError) {
			console.error("Error fetching existing bookmark data:", fetchError);
			Sentry.captureException(fetchError, {
				tags: {
					operation: "fetch_existing_bookmark",
					userId,
				},
				extra: {
					bookmarkId: request.body.id,
				},
			});
			response.status(500).json({
				data: null,
				error: "Error fetching bookmark data",
			});
			return;
		}

		// Log existing bookmark data
		console.log("Existing bookmark data fetched:", {
			id: request.body.id,
			hasMetaData: Boolean(existingBookmarkData?.meta_data),
		});

		// Get existing meta_data or create empty object if null
		const existingMetaData = existingBookmarkData?.meta_data || {};

		const updatedTitle =
			title?.slice(0, MAX_LENGTH) || existingBookmarkData?.title;
		const updatedDescription =
			description?.slice(0, MAX_LENGTH) || existingBookmarkData?.description;

		const additionalImages = await collectAdditionalImages({
			allImages: screenShotResponse?.data?.allImages,
			userId,
		});

		// Log additional images result
		console.log("Additional images collected:", {
			count: additionalImages.length,
		});

		// Add screenshot URL to meta_data
		const updatedMetaData = {
			...existingMetaData,
			screenshot: publicURL,
			isPageScreenshot,
			coverImage: existingBookmarkData?.ogImage,
			additionalImages,
		};

		const {
			data,
			error,
		}: {
			data: SingleListData[] | null;
			error: PostgrestError | VerifyErrors | string | null;
		} = await supabase
			.from(MAIN_TABLE_NAME)
			// since we now have screenshot , we add that in ogImage as this will now be our primary image, and the existing ogImage (which is the scrapper data image) will be our cover image in meta_data
			.update({
				title: updatedTitle,
				description: updatedDescription,
				meta_data: updatedMetaData,
			})
			.match({ id: request.body.id, user_id: userId })
			.select();

		// Check error immediately - fail fast
		if (error) {
			console.error("Error updating bookmark with screenshot:", error);
			Sentry.captureException(error, {
				tags: {
					operation: "update_bookmark_screenshot",
					userId,
				},
				extra: {
					bookmarkId: request.body.id,
				},
			});
			response.status(500).json({
				data: null,
				error: "Error updating bookmark with screenshot",
			});
			return;
		}

		if (!data || data.length === 0) {
			console.warn("No data returned from the database");
			Sentry.captureException(new Error("No data returned from the database"), {
				tags: {
					operation: "update_bookmark_screenshot",
					userId,
				},
				extra: {
					bookmarkId: request.body.id,
				},
			});
			response.status(500).json({
				data: null,
				error: "No data returned from the database",
			});
			return;
		}

		const requestBody = {
			id: data[0]?.id,
			favIcon: data[0]?.meta_data?.favIcon,
			url: request.body.url,
		};
		console.log("Calling remaining bookmark data API:", { requestBody });

		const [remainingApiError] = await vet(() =>
			axios.post(
				`${getBaseUrl()}${NEXT_API_URL}${ADD_REMAINING_BOOKMARK_API}`,
				requestBody,
				getAxiosConfigWithAuth(request),
			),
		);

		if (remainingApiError) {
			console.error("Remaining bookmark data API error:", remainingApiError);
			Sentry.captureException(remainingApiError, {
				tags: {
					operation: "remaining_bookmark_data_api",
					userId,
				},
				extra: {
					bookmarkId: data[0]?.id,
				},
			});
		}

		// Success log and response
		console.log("Bookmark updated with screenshot successfully:", {
			id: data?.[0]?.id,
		});
		response.status(200).json({ data, error: null });
	} catch (error) {
		console.error("Unexpected error in add-url-screenshot:", error);
		Sentry.captureException(error, {
			tags: {
				operation: "add_url_screenshot_unexpected",
			},
		});
		response.status(500).json({
			data: null,
			error: "An unexpected error occurred",
		});
	}
}
