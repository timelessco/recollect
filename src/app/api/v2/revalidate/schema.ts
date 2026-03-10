import { z } from "zod";

export const RevalidateInputSchema = z.object({
	path: z.string().min(1),
});

export const RevalidateOutputSchema = z.object({
	revalidated: z.boolean(),
});
