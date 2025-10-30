import { GoogleGenerativeAI } from "@google/generative-ai";
import { type SupabaseClient } from "@supabase/supabase-js";
import axios from "axios";

import { getApikeyAndBookmarkCount } from "./ocr";

/**
 * Generates the image description using Gemini AI
 *
 * @param {string}imageUrl the image url
 * @param {SupabaseClient} supabase supabase client
 * @param {string} userId the user id
 * @returns {Promise<string>} the description
 */

export const imageToText = async (
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
			return null;
		}

		// Fetch the image
		const imageResponse = await axios.get(imageUrl, {
			responseType: "arraybuffer",
		});
		const imageBytes = Buffer.from(imageResponse.data).toString("base64");

		// Initialize the model
		const key = userApiKey ?? (process.env.GOOGLE_GEMINI_TOKEN as string);

		const genAI = new GoogleGenerativeAI(key);
		const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

		// For Image Caption
		const captionPrompt = "Describe this image in a single, concise sentence.";
		const captionResult = await model.generateContent([
			captionPrompt,
			{
				inlineData: {
					mimeType: "image/jpeg",
					data: imageBytes,
				},
			},
		]);

		return captionResult.response.text();
	} catch (error) {
		console.error("Image caption error", error);
		throw error;
	}
};

export default imageToText;
