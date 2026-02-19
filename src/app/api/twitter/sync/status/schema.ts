import { z } from "zod";

export const TwitterSyncStatusOutputSchema = z.object({
	pending: z.number(),
	archived: z.number(),
	archives: z.array(
		z.object({
			msg_id: z.number(),
			url: z.string(),
			failure_reason: z.string().nullable(),
			archived_at: z.string().nullable(),
		}),
	),
});
