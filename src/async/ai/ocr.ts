import { GoogleGenerativeAI } from "@google/generative-ai";
import { type SupabaseClient } from "@supabase/supabase-js";
import axios from "axios";
import CryptoJS from "crypto-js";

import { PROFILES } from "../../utils/constants";

type OcrResult = {
	text: string | null;
	status: "success" | "limit_reached" | "no_text";
};

/**
 *  Gives the OCR string by calling the Gemini AI OCR function
 * @param {string} imageUrl - the image url for the OCR to take place
 * @param {SupabaseClient} supabase - the supabase client
 * @param {string} userId - the user id
 * @returns {Promise<OcrResult>} - the OCR result with text and status
 */
export const ocr = async (
	imageUrl: string,
	supabase: SupabaseClient,
	userId: string,
): Promise<OcrResult> => {
	try {
		const { userApiKey, isLimitReached } = await getApikeyAndBookmarkCount(
			supabase,
			userId,
		);
		if (!userApiKey && isLimitReached) {
			console.warn("Monthly free limit reached — skipping OCR generation.");
			return { text: null, status: "limit_reached" };
		}

		const imageResponse = await axios.get(imageUrl, {
			responseType: "arraybuffer",
		});
		const imageBytes = Buffer.from(imageResponse.data).toString("base64");

		const key = userApiKey ?? (process.env.GOOGLE_GEMINI_TOKEN as string);

		const genAI = new GoogleGenerativeAI(key);
		const model = genAI.getGenerativeModel({
			model: "gemini-flash-lite-latest",
			generationConfig: {
				responseMimeType: "application/json",
			},
		});

		// For OCR - request JSON output
		const ocrPrompt =
			"Extract all visible text from this image. Return a valid JSON object with a 'text' field. If text is found, set text to the extracted text. If no text is found, set text to null. Only return the JSON object, no other text.";
		const ocrResult = await model.generateContent([
			ocrPrompt,
			{
				inlineData: {
					mimeType: "image/jpeg",
					data: imageBytes,
				},
			},
		]);

		// Call .text() only once - it consumes the response body stream
		const responseText = ocrResult.response.text().trim();
		let jsonResponse: { text: string | null };
		try {
			jsonResponse = JSON.parse(responseText) as { text: string | null };
		} catch {
			console.warn("OCR returned non-JSON response:", responseText);
			return { text: null, status: "no_text" };
		}

		// Handle null or empty string from JSON response
		const ocrText =
			jsonResponse.text === null || jsonResponse.text === ""
				? null
				: jsonResponse.text;

		try {
			// Increment bookmark count, using the function only here not in imageToText,because here it is 2 different function
			// but it is a one single feature AI summary,so it should be counted only once
			if (!userApiKey && ocrText) {
				await incrementBookmarkCount(supabase, userId);
			}
		} catch {
			console.error("Error incrementing bookmark count");
		}

		// Return structured result with status
		if (ocrText === null || ocrText === "") {
			return { text: null, status: "no_text" };
		}

		return { text: ocrText, status: "success" };
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
	const LIMIT = 10_0000;

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
				process.env.API_KEY_ENCRYPTION_KEY,
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
	if (error) {
		throw error;
	}

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

		if (fetchError) {
			throw fetchError;
		}

		const currentCount = profile?.bookmark_count ?? 0;
		const newCount = currentCount + 1;

		const { error: updateError } = await supabase
			.from(PROFILES)
			.update({ bookmark_count: newCount })
			.eq("id", userId);

		if (updateError) {
			throw updateError;
		}

		return newCount;
	} catch (error) {
		console.error("Error incrementing bookmark count:", error);
		return null;
	}
};

export default ocr;
