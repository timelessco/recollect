import { z } from "zod";

export const RetryInputSchema = z.union([
	z.object({ msg_ids: z.array(z.int()).min(1).max(100) }).strict(),
	z.object({ all: z.literal(true) }).strict(),
]);

export const RetryOutputSchema = z.object({
	requeued: z.number(),
	requested: z.number().optional(),
});
