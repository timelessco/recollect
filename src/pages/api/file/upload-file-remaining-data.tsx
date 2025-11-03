// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { log } from "console";
import { type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { type SupabaseClient } from "@supabase/supabase-js";
import { isNil } from "lodash";

import imageToText from "../../../async/ai/imageToText";
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

export const config = {
	maxDuration: 300,
};

type Data = UploadFileApiResponse;

const notVideoLogic = async (
	publicUrl: string,
	mediaType: string,
	supabase: SupabaseClient,
	userId: string,
) => {
	const ogImage = publicUrl;
	let imageCaption = null;
	let imageOcrValue = null;

	if (ogImage) {
		try {
			// Get OCR using the centralized function
			imageOcrValue = await ocr(ogImage, supabase, userId);

			// Get image caption using the centralized function
			imageCaption = await imageToText(ogImage, supabase, userId);
		} catch (error) {
			console.error("Gemini AI processing error", error);
			Sentry.captureException(`Gemini AI processing error ${error}`);
		}
	}

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
		img_caption: imageCaption,
		width: imgData?.width ?? null,
		height: imgData?.height ?? null,
		ogImgBlurUrl: imgData?.encoded ?? null,
		favIcon: null,
		twitter_avatar_url: null,
		ocr: imageOcrValue ?? null,
		coverImage: null,
		screenshot: null,
		isOgImagePreferred: false,
		iframeAllowed: false,
		mediaType,
		isPageScreenshot: null,
		video_url: null,
	};

	return { ogImage, meta_data };
};

export default async function handler(
	request: NextApiRequest<{
		id: SingleListData["id"];
		mediaType: ImgMetadataType["mediaType"];
		publicUrl: SingleListData["ogImage"];
	}>,
	response: NextApiResponse<Data>,
) {
	const { publicUrl, id, mediaType } = request.body;

	const supabase = apiSupabaseClient(request, response);

	const userId = (await supabase?.auth?.getUser())?.data?.user?.id as string;

	let meta_data: ImgMetadataType = {
		img_caption: null,
		width: null,
		height: null,
		ogImgBlurUrl: null,
		favIcon: null,
		twitter_avatar_url: null,
		coverImage: null,
		screenshot: null,
		ocr: null,
		isOgImagePreferred: false,
		iframeAllowed: false,
		mediaType: "",
		isPageScreenshot: null,
		video_url: null,
	};

	const { meta_data: metaData } = await notVideoLogic(
		publicUrl,
		mediaType,
		supabase,
		userId,
	);

	// Fetch existing metadata
	const { data: existing, error: fetchError } = await supabase
		.from(MAIN_TABLE_NAME)
		.select("meta_data")
		.match({ id, user_id: userId })
		.single();

	if (fetchError) {
		response.status(500).json({
			success: false,
			error: fetchError,
		});
		Sentry.captureException(fetchError?.message);
	}

	const existingMeta = existing?.meta_data || {};

	// Merge: keep existing values if new ones are null/undefined
	const mergedMeta = {
		...existingMeta,
		...Object.fromEntries(
			Object.entries(metaData).map(([key, value]) => [
				key,
				// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
				value || existingMeta?.[key],
			]),
		),
	};

	meta_data = metaData;

	const { error: DBerror } = await supabase
		.from(MAIN_TABLE_NAME)
		.update({
			ogImage: publicUrl,
			meta_data: mergedMeta,
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
