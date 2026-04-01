import { GoogleGenerativeAI } from "@google/generative-ai";

import { GEMINI_MODEL } from "@/utils/constants";

export interface ValidateApiKeyProps {
  apikey: string;
}

export async function validateApiKey(props: ValidateApiKeyProps): Promise<void> {
  const { apikey } = props;

  try {
    const genAI = new GoogleGenerativeAI(apikey);
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
    });

    const result = await model.generateContent(["Hey there!"]);

    if (!result.response.text()) {
      throw new Error("response not generated");
    }
  } catch (error) {
    throw new Error("Invalid API key", { cause: error });
  }
}
