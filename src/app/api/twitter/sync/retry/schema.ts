import { z } from "zod";

export const TwitterSyncRetryInputSchema = z.union([
	z.object({ msg_ids: z.array(z.number()).min(1).max(100) }).strict(),
	z.object({ all: z.literal(true) }).strict(),
]);

export const TwitterSyncRetryOutputSchema = z.object({
	requeued: z.number(),
	requested: z.number().optional(),
});
