import { z } from "zod";

export const RaindropImportStatusOutputSchema = z.object({
  archived: z.int(),
  archives: z.array(
    z.object({
      archived_at: z.string().nullable(),
      failure_reason: z.string().nullable(),
      msg_id: z.int(),
      url: z.string(),
    }),
  ),
  pending: z.int(),
});
