import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_TOKEN as string);

/**
 * Gives the OCR string by calling the Gemini AI OCR function
 *
 * @param {string} imageUrl - the image url for the OCR to take place
 * @returns {Promise<string>} - the OCR value
 */
const ocr = async (imageUrl: string): Promise<string> => {
	try {
		// Fetch the image
		const imageResponse = await axios.get(imageUrl, {
			responseType: "arraybuffer",
		});
		const imageBytes = Buffer.from(imageResponse.data).toString("base64");

		// Initialize the model
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

export default ocr;
