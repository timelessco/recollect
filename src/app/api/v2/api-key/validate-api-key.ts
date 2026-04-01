import { GoogleGenAI } from "@google/genai";

import { GEMINI_MODEL } from "@/utils/constants";

export interface ValidateApiKeyProps {
  apikey: string;
}

export async function validateApiKey(props: ValidateApiKeyProps): Promise<void> {
  const { apikey } = props;

  try {
    const ai = new GoogleGenAI({ apiKey: apikey });
    const response = await ai.models.generateContent({
      contents: ["Hey there!"],
      model: GEMINI_MODEL,
    });

    if (!response.text) {
      throw new Error("response not generated");
    }
  } catch {
    throw new Error("Invalid API key");
  }
}
