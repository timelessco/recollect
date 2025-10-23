import { GoogleGenerativeAI } from "@google/generative-ai";
import { type SupabaseClient } from "@supabase/supabase-js";
import axios from "axios";
import Cryptr from "cryptr";

import { MAIN_TABLE_NAME, PROFILES } from "../../utils/constants";

const cryptr = new Cryptr(process.env.SECRET_KEY as string);
/**
 *  Gives the OCR string by calling the Gemini AI OCR function
 *
 * @param {string} imageUrl - the image url for the OCR to take place
 * @param {SupabaseClient} supabase - the supabase client
 * @param {string} userId - the user id
 * @returns {Promise<string>} - the OCR value
 */
export const ocr = async (
	imageUrl: string,
	supabase: SupabaseClient,
	userId: string,
): Promise<string | null> => {
	try {
		const { userApiKey, isLimitReached } = await getApikeyAndBookmarkCount(
			supabase,
			userId,
		);
		if (!userApiKey && isLimitReached) {
			console.warn("Monthly free limit reached — skipping caption generation.");
			return "Monthly free limit reached — skipping AI summary.";
		}

		const imageResponse = await axios.get(imageUrl, {
			responseType: "arraybuffer",
		});
		const imageBytes = Buffer.from(imageResponse.data).toString("base64");

		const key = userApiKey ?? (process.env.GOOGLE_GEMINI_TOKEN as string);

		const genAI = new GoogleGenerativeAI(key);
		const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

		// For OCR
		const ocrPrompt =
			"Read and extract all text from this image. Return only the extracted text.";
		const ocrResult = await model.generateContent([
			ocrPrompt,
			{
				inlineData: {
					mimeType: "image/jpeg",
					data: imageBytes,
				},
			},
		]);

		return ocrResult.response.text();
	} catch (error) {
		console.error("OCR error", error);
		throw error;
	}
};

const monthRange = () => {
	const now = new Date();
	const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
	const next = new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
	);
	return { start: start.toISOString(), end: next.toISOString() };
};

export const getApikeyAndBookmarkCount = async (
	supabase: SupabaseClient,
	userId: string,
) => {
	const LIMIT = 1_000;
	const { data: profile } = await supabase
		.from(PROFILES)
		.select("api_key")
		.eq("id", userId)
		.single();
	let userApiKey: string | null = null;
	try {
		const enc = (profile as unknown as { api_key?: string })?.api_key ?? "";
		if (enc) {
			const dec = cryptr.decrypt(enc);
			userApiKey = dec?.trim() ? dec : null;
		}
	} catch {
		userApiKey = null;
	}

	const { start, end } = monthRange();
	const { count } = await supabase
		.from(MAIN_TABLE_NAME)
		.select("id", { count: "exact", head: true })
		.eq("user_id", userId)
		.gte("inserted_at", start)
		.lt("inserted_at", end)
		.not("ogImage", "is", null);
	const monthlyCount = count ?? 0;

	return { userApiKey, isLimitReached: monthlyCount > LIMIT };
};

export default ocr;
