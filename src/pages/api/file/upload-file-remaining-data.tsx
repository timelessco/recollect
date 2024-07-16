// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { log } from "console";
import { type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { isNil } from "lodash";

import { imageToTextHuggingface } from "../../../async/ai/imageToText";
import ocr from "../../../async/ai/ocr";
import {
	type ImgMetadataType,
	type NextApiRequest,
	type SingleListData,
	type UploadFileApiResponse,
} from "../../../types/apiTypes";
import { MAIN_TABLE_NAME } from "../../../utils/constants";
import { blurhashFromURL } from "../../../utils/getBlurHash";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

type Data = UploadFileApiResponse;

const notVideoLogic = async (publicUrl: string) => {
	const ogImage = publicUrl;
	const imageCaption = await imageToTextHuggingface(ogImage as string);

	let imageOcrValue = null;

	try {
		imageOcrValue = await ocr(ogImage);
	} catch (error) {
		console.error("OCR error", error);
		Sentry.captureException(`OCR error ${error}`);
	}

	const jsonResponse = (await imageCaption?.json()) as Array<{
		generated_text: string;
	}>;

	let imgData;

	if (publicUrl) {
		try {
			imgData = await blurhashFromURL(publicUrl);
		} catch (error) {
			log("Blur hash error", error);
			Sentry.captureException(`Blur hash error ${error}`);
			imgData = {};
		}
	}

	const meta_data = {
		img_caption: jsonResponse?.[0]?.generated_text,
		width: imgData?.width ?? null,
		height: imgData?.height ?? null,
		ogImgBlurUrl: imgData?.encoded ?? null,
		favIcon: null,
		twitter_avatar_url: null,
		ocr: imageOcrValue ?? null,
	};

	return { ogImage, meta_data };
};

export default async function handler(
	request: NextApiRequest<{
		id: SingleListData["id"];
		publicUrl: SingleListData["ogImage"];
	}>,
	response: NextApiResponse<Data>,
) {
	const { publicUrl, id } = request.body;

	const supabase = apiSupabaseClient(request, response);

	const userId = (await supabase?.auth?.getUser())?.data?.user?.id as string;

	let meta_data: ImgMetadataType = {
		img_caption: null,
		width: null,
		height: null,
		ogImgBlurUrl: null,
		favIcon: null,
		twitter_avatar_url: null,
		ocr: null,
	};

	const { meta_data: metaData } = await notVideoLogic(publicUrl);

	meta_data = metaData;

	const { error: DBerror } = await supabase
		.from(MAIN_TABLE_NAME)
		.update({
			meta_data,
			description: (meta_data?.img_caption as string) || "",
		})
		.match({ id, user_id: userId });

	if (isNil(DBerror)) {
		response.status(200).json({ success: true, error: null });
	} else {
		response.status(500).json({
			success: false,
			error: DBerror,
		});
		Sentry.captureException(`DB error ${DBerror?.message}`);
	}
}
