import { url } from "inspector";
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
	if (!process.env.SCREENSHOT_TOKEN) {
		response
			.status(500)
			.json({ data: null, error: "Screen shot token missing in env" });
		throw new Error("ERROR: Screen shot token missing in env");
	}

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

	const screenShotResponse = await axios.get(
		`https://headless-try.vercel.app/try?url=${encodeURIComponent(
			request.body.url,
		)}`,
		{ responseType: "arraybuffer" },
	);

	const base64data = Buffer.from(screenShotResponse.data, "binary").toString(
		"base64",
	);

	const publicURL = await upload(base64data, userId);

	const {
		data,
		error,
	}: {
		data: SingleListData[] | null;
		error: PostgrestError | VerifyErrors | string | null;
	} = await supabase
		.from(MAIN_TABLE_NAME)
		.update({ ogImage: publicURL })
		.match({ id: request.body.id, user_id: userId })
		.select();

	if (isNull(error)) {
		response.status(200).json({ data, error: null });

		// Call ADD_REMAINING_BOOKMARK_API after successful update
		try {
			if (data && data.length > 0) {
				await axios.post(
					`${getBaseUrl()}${NEXT_API_URL}${ADD_REMAINING_BOOKMARK_API}`,
					{
						id: data[0]?.id,
						image: publicURL,
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
		throw new Error("ERROR: update screenshot in DB error");
	}
}
