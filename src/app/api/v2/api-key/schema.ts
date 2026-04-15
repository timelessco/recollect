import { z } from "zod";

export const ApiKeyInputSchema = z.object({
  apikey: z.string().meta({ description: "Gemini API key to save" }),
});

export const ApiKeyOutputSchema = z.object({
  success: z.boolean().meta({ description: "Whether the API key was saved successfully" }),
});
