import { z } from "zod";

export const InstagramSyncStatusOutputSchema = z.object({
  archived: z.number(),
  archives: z.array(
    z.object({
      archived_at: z.string().nullable(),
      failure_reason: z.string().nullable(),
      msg_id: z.number(),
      url: z.string(),
    }),
  ),
  pending: z.number(),
});
