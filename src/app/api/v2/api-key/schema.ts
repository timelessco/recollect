import { z } from "zod";

export const ApiKeyInputSchema = z.object({
	apikey: z.string(),
});

export const ApiKeyOutputSchema = z.object({
	success: z.boolean(),
});
