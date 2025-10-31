import { GoogleGenerativeAI } from "@google/generative-ai";
import { type SupabaseClient } from "@supabase/supabase-js";
import axios from "axios";
import CryptoJS from "crypto-js";

import { PROFILES } from "../../utils/constants";

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

		try {
			// Increment bookmark count, using the function only here not in imageToText,because here it is 2 different function
			// but it is a one single feature AI summary,so it should be counted only once
			if (!userApiKey && ocrResult.response.text()) {
				await incrementBookmarkCount(supabase, userId);
			}
		} catch {
			console.error("Error incrementing bookmark count");
		}

		return ocrResult.response.text();
	} catch (error) {
		console.error("OCR error", error);
		throw error;
	}
};

export const getApikeyAndBookmarkCount = async (
	supabase: SupabaseClient,
	userId: string,
) => {
	// monthly limit, in db the bookmark count set to zero at the start of every month using supabase cron job
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
			const decryptedBytes = CryptoJS.AES.decrypt(
				enc,
				process.env.API_KEY_ENCRYPTION_KEY as string,
			);
			const decrypted = decryptedBytes.toString(CryptoJS.enc.Utf8);
			userApiKey = decrypted;
		}
	} catch {
		userApiKey = null;
	}

	const { data: count, error } = await supabase
		.from(PROFILES)
		.select("bookmark_count")
		.eq("id", userId)
		.single();
	if (error) throw error;

	const bookmarkCount = count?.bookmark_count ?? 0;

	return { userApiKey, isLimitReached: bookmarkCount > LIMIT };
};

// we are incrementing the bookmark count here for every bookmark added by the user
const incrementBookmarkCount = async (
	supabase: SupabaseClient,
	userId: string,
): Promise<number | null> => {
	try {
		const { data: profile, error: fetchError } = await supabase
			.from(PROFILES)
			.select("bookmark_count")
			.eq("id", userId)
			.single();

		if (fetchError) throw fetchError;

		const currentCount = profile?.bookmark_count ?? 0;
		const newCount = currentCount + 1;

		const { error: updateError } = await supabase
			.from(PROFILES)
			.update({ bookmark_count: newCount })
			.eq("id", userId);

		if (updateError) throw updateError;

		return newCount;
	} catch (error) {
		console.error("Error incrementing bookmark count:", error);
		return null;
	}
};

export default ocr;
