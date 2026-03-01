import { z } from "zod";

export const DeleteApiKeyInputSchema = z.object({});

export const DeleteApiKeyOutputSchema = z.object({
	success: z.boolean(),
});
