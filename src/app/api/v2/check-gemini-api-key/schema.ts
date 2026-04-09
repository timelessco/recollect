import { z } from "zod";

export const CheckGeminiApiKeyInputSchema = z.object({});

export const CheckGeminiApiKeyOutputSchema = z.object({
  hasApiKey: z.boolean().meta({ description: "Whether the user has a Gemini API key configured" }),
});
