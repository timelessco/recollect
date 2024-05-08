import { type NextApiResponse } from "next";
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
	BOOKMAKRS_STORAGE_NAME,
	MAIN_TABLE_NAME,
	STORAGE_SCREENSHOT_IMAGES_PATH,
} from "../../../utils/constants";
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

	const userId = request.body.user_id;

	// screen shot api call
	const screenShotResponse = await axios.request({
		method: "POST",
		url: process.env.SCREENSHOT_API,
		headers: {
			"content-type": "application/json",
			Authorization: `Bearer ${process.env.SCREENSHOT_TOKEN}`,
		},
		data: { url: request.body.url },
		responseType: "arraybuffer",
	});

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
		.match({ id: request.body.id })
		.select();

	if (isNull(error)) {
		response.status(200).json({ data, error: null });
	} else {
		response.status(500).json({ data: null, error });
		throw new Error("ERROR: update screenshot in DB error");
	}
}
