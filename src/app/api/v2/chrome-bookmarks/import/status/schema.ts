import { z } from "zod";

export const ChromeBookmarkImportStatusOutputSchema = z.object({
  archived: z.int().meta({ description: "Number of archived (failed) import messages" }),
  archives: z
    .array(
      z.object({
        archived_at: z.string().nullable().meta({ description: "When the message was archived" }),
        failure_reason: z.string().nullable().meta({ description: "Reason the import failed" }),
        msg_id: z.int().meta({ description: "Queue message ID for retry" }),
        url: z.string().meta({ description: "Bookmark URL that failed" }),
      }),
    )
    .meta({ description: "Individual archive records with failure details" }),
  pending: z.int().meta({ description: "Number of imports still in queue" }),
});
