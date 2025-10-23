import { log } from "console";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { type SupabaseClient } from "@supabase/supabase-js";
import axios from "axios";

import { getApikeyAndBookmarkCount } from "./ocr";

type ImageCaptionReturn = Array<{ generated_text: string }> | null;

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

/**
 * Gets the image description from VIT model that is running in huggingface serverless endpoint
 *
 * @param {string} source the ogimage url
 * @returns {ImageCaptionReturn} the image description from the VIT model
 */
const vitModel = async (source: string): Promise<ImageCaptionReturn> => {
	const isImgCaptionEnvironmentsPresent =
		process.env.IMAGE_CAPTION_TOKEN && process.env.IMAGE_CAPTION_URL;

	if (isImgCaptionEnvironmentsPresent) {
		const response = await fetch(source);
		const arrayBuffer = await response.arrayBuffer();
		const data = Buffer.from(arrayBuffer);

		try {
			const imgCaptionResponse = await fetch(
				process.env.IMAGE_CAPTION_URL as string,
				{
					headers: {
						Authorization: `Bearer ${process.env.IMAGE_CAPTION_TOKEN}`,
					},
					method: "POST",
					body: data,
				},
			);

			return await imgCaptionResponse?.json();
		} catch (error) {
			log("Img caption error", error);
			return null;
		}
	} else {
		log(`ERROR: Img caption failed due to missing tokens in env`);
		return null;
	}
};

/**
 * Gets the image description from Moondream model that is running in huggingface serverless endpoint
 *
 * @param  {string} source the ogimage url
 * @returns {ImageCaptionReturn} the image description from the Moondream model
 */
const moondreamModel = async (source: string): Promise<ImageCaptionReturn> => {
	const isImgCaptionEnvironmentsPresent =
		process.env.MOONDREAM_TOKEN && process.env.MOONDREAM_URL;

	if (isImgCaptionEnvironmentsPresent) {
		const response = await axios.post(
			process.env.MOONDREAM_URL as string,
			{
				inputs: {
					url: source,
					question: "Describe this image",
				},
				parameters: {},
			},
			{
				headers: {
					Accept: "application/json",
					Authorization: `Bearer ${process.env.MOONDREAM_TOKEN}`,
					"Content-Type": "application/json",
				},
			},
		);

		const finalReturnFormat = [
			{ generated_text: response?.data?.body?.answer },
		];

		return finalReturnFormat;
	} else {
		log(`ERROR: Moondream Img caption failed due to missing tokens in env`);
		return null;
	}
};

/**
 * Gets the image caption from the Moondream model, if that fails then it gets from the VIT model
 *
 * @param {string} source the ogimage url
 * @returns {ImageCaptionReturn} the image description from the VIT model
 */
export const imageToTextHuggingface = async (source: string) => {
	try {
		return await moondreamModel(source);
	} catch {
		log("Moondream model failed running VIT");
		const vitResponse = await vitModel(source);
		return vitResponse;
	}
};

export default imageToText;
