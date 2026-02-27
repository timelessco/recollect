import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ValidateApiKeyProps {
	apikey: string;
}

export async function validateApiKey(
	props: ValidateApiKeyProps,
): Promise<void> {
	const { apikey } = props;

	try {
		const genAI = new GoogleGenerativeAI(apikey);
		const model = genAI.getGenerativeModel({
			model: "gemini-flash-lite-latest",
		});

		const result = await model.generateContent(["Hey there!"]);

		if (!result.response.text()) {
			throw new Error("response not generated");
		}
	} catch {
		throw new Error("Invalid API key");
	}
}
