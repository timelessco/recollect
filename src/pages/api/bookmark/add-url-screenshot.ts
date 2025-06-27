import { type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { type PostgrestError } from "@supabase/supabase-js";
import axios from "axios";
import { decode } from "base64-arraybuffer";
import { type VerifyErrors } from "jsonwebtoken";
import { isNull } from "lodash";
import uniqid from "uniqid";

import {
	type AddBookmarkScreenshotPayloadTypes,
	type NextApiRequest,
	type SingleListData,
} from "../../../types/apiTypes";
import {
	ADD_REMAINING_BOOKMARK_API,
	BOOKMAKRS_STORAGE_NAME,
	getBaseUrl,
	MAIN_TABLE_NAME,
	NEXT_API_URL,
	SCREENSHOT_API,
	STORAGE_SCREENSHOT_IMAGES_PATH,
} from "../../../utils/constants";
import { apiCookieParser } from "../../../utils/helpers";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

type Data = {
	data: SingleListData[] | null;
	error: PostgrestError | VerifyErrors | string | null;
};

export default async function handler(
	request: NextApiRequest<AddBookmarkScreenshotPayloadTypes>,
	response: NextApiResponse<Data>,
) {
	const supabase = apiSupabaseClient(request, response);

	const upload = async (base64info: string, uploadUserId: string) => {
		const imgName = `img-${uniqid?.time()}.jpg`;
		const storagePath = `${STORAGE_SCREENSHOT_IMAGES_PATH}/${uploadUserId}/${imgName}`;

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

	const userId = (await supabase?.auth?.getUser())?.data?.user?.id as string;
	let screenShotResponse;
	try {
		console.error(
			"*************************Screenshot Loading*****************************",
		);
		screenShotResponse = await axios.get(
			`${SCREENSHOT_API}try?url=${encodeURIComponent(request.body.url)}`,
			{
				responseType: "arraybuffer",
			},
		);
		if (screenShotResponse.status === 200) {
			console.error("***Screenshot success**");
		}
	} catch {
		console.error("Screenshot error");
		Sentry.captureException(`Screenshot error`);
		return;
	}

	const base64data = Buffer.from(screenShotResponse.data, "binary").toString(
		"base64",
	);

	const publicURL = await upload(base64data, userId);

	// First, fetch the existing bookmark data to get current meta_data
	const { data: existingBookmarkData, error: fetchError } = await supabase
		.from(MAIN_TABLE_NAME)
		.select("meta_data, ogImage")
		.match({ id: request.body.id, user_id: userId })
		.single();

	if (fetchError) {
		console.error("Error fetching existing bookmark data:", fetchError);
		response.status(500).json({ data: null, error: fetchError });
		Sentry.captureException(`ERROR: fetch existing bookmark data error`);
		return;
	}

	// Get existing meta_data or create empty object if null
	const existingMetaData = existingBookmarkData?.meta_data || {};

	// Add screenshot URL to meta_data
	const updatedMetaData = {
		...existingMetaData,
		screenshot: null,
		coverImage: existingBookmarkData?.ogImage,
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
		.update({ meta_data: updatedMetaData })
		.match({ id: request.body.id, user_id: userId })
		.select();

	if (isNull(error)) {
		response.status(200).json({ data, error: null });

		try {
			if (data && data.length > 0) {
				await axios.post(
					`${getBaseUrl()}${NEXT_API_URL}${ADD_REMAINING_BOOKMARK_API}`,
					{
						id: data[0]?.id,
						favIcon: data?.[0]?.meta_data?.favIcon,
						url: request.body.url,
					},
					{
						headers: {
							Cookie: apiCookieParser(request?.cookies),
						},
					},
				);
			}
		} catch (remainingUploadError) {
			console.error("Remaining bookmark data API error:", remainingUploadError);
			Sentry.captureException(
				`Remaining bookmark data API error: ${remainingUploadError}`,
			);
		}
	} else {
		response.status(500).json({ data: null, error });
		Sentry.captureException(`ERROR: update screenshot in DB error`);
		throw new Error("ERROR: update screenshot in DB error");
	}
}
