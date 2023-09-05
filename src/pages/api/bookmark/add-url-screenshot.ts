import { type NextApiResponse } from "next";
import { createClient, type PostgrestError } from "@supabase/supabase-js";
import axios from "axios";
import { decode } from "base64-arraybuffer";
import { verify, type VerifyErrors } from "jsonwebtoken";
import jwtDecode from "jwt-decode";
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
	SCREENSHOT_API,
	STORAGE_SCREENSHOT_IMAGES_PATH,
} from "../../../utils/constants";

type Data = {
	data: SingleListData[] | null;
	error: PostgrestError | VerifyErrors | string | null;
};

export default async function handler(
	request: NextApiRequest<AddBookmarkScreenshotPayloadTypes>,
	response: NextApiResponse<Data>,
) {
	verify(
		request.body.access_token,
		process.env.SUPABASE_JWT_SECRET_KEY,
		(error_) => {
			if (error_) {
				response.status(500).json({ data: null, error: error_ });
				throw new Error("ERROR");
			}
		},
	);

	const supabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL,
		process.env.SUPABASE_SERVICE_KEY,
	);

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

	const tokenDecode: { sub: string } = jwtDecode(request.body.access_token);
	const userId = tokenDecode?.sub;

	// screen shot api call
	const screenShotResponse = await axios.get<
		| WithImplicitCoercion<string>
		| { [Symbol.toPrimitive]: (hint: "string") => string }
	>(`${SCREENSHOT_API}${request.body.url}`, {
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
		throw new Error("ERROR");
	}
}
