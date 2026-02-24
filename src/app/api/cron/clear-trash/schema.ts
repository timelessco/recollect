import { z } from "zod";

export const ClearTrashInputSchema = z.object({});

export const ClearTrashOutputSchema = z.object({
	deletedCount: z.number(),
});
