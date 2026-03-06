import { z } from "zod";

export const RaindropImportStatusOutputSchema = z.object({
	pending: z.int(),
	archived: z.int(),
	archives: z.array(
		z.object({
			msg_id: z.int(),
			url: z.string(),
			failure_reason: z.string().nullable(),
			archived_at: z.string().nullable(),
		}),
	),
});
