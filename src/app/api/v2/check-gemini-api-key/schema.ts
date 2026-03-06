import { z } from "zod";

export const CheckGeminiApiKeyInputSchema = z.object({});

export const CheckGeminiApiKeyOutputSchema = z.object({
	hasApiKey: z.boolean(),
});
