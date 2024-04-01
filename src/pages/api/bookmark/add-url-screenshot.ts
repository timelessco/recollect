import { type NextApiResponse } from "next";
import chromium from "@sparticuz/chromium";
import { type PostgrestError } from "@supabase/supabase-js";
import { decode } from "base64-arraybuffer";
import { type VerifyErrors } from "jsonwebtoken";
import jwtDecode from "jwt-decode";
import { isNull } from "lodash";
import { launch } from "puppeteer";
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
import {
	apiSupabaseClient,
	verifyAuthToken,
} from "../../../utils/supabaseServerClient";

type Data = {
	data: SingleListData[] | null;
	error: PostgrestError | VerifyErrors | string | null;
};

chromium.setHeadlessMode = true;

// Optional: If you'd like to disable webgl, true is the default.
chromium.setGraphicsMode = false;

const takeScreenshot = async (url: string) => {
	// const browser = await launch();

	const browser = await launch({
		args: chromium.args,
		defaultViewport: chromium.defaultViewport,
		executablePath: await chromium.executablePath(),
		headless: chromium.headless,
	});

	const page = await browser.newPage();
	await page.goto(url, { waitUntil: "networkidle2" });

	const buffer = await page.screenshot();

	await page.close();
	await browser.close();

	return buffer;
};

export default async function handler(
	request: NextApiRequest<AddBookmarkScreenshotPayloadTypes>,
	response: NextApiResponse<Data>,
) {
	const { error: _error } = verifyAuthToken(request.body.access_token);

	if (_error) {
		response.status(500).json({ data: null, error: _error });
		throw new Error("ERROR: token error");
	}

	if (!process.env.SCREENSHOT_TOKEN) {
		response
			.status(500)
			.json({ data: null, error: "Screen shot token missing in env" });
		throw new Error("ERROR: Screen shot token missing in env");
	}

	const supabase = apiSupabaseClient();

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
	// const screenShotResponse = await axios.request({
	// 	method: "POST",
	// 	url: SCREENSHOT_API,
	// 	headers: {
	// 		"content-type": "application/json",
	// 		Authorization: `Bearer ${process.env.SCREENSHOT_TOKEN}`,
	// 	},
	// 	data: { url: request.body.url },
	// 	responseType: "arraybuffer",
	// });

	const screenShotResponse = (await takeScreenshot(
		request.body.url,
	)) as unknown as string;

	const base64data = Buffer.from(screenShotResponse, "binary").toString(
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
