import { z } from "zod";

export const GetGeminiApiKeyInputSchema = z.object({});

export const GetGeminiApiKeyOutputSchema = z.object({
	apiKey: z.string(),
});
