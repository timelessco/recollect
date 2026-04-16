import { z } from "zod";

export const InstagramSyncStatusInputSchema = z.object({});

export const InstagramSyncStatusOutputSchema = z.object({
  archived: z.int().meta({
    description: "Count of Instagram bookmark sync archives for the authenticated user.",
  }),
  archives: z
    .array(
      z.object({
        archived_at: z.string().nullable().meta({
          description: "Timestamp when the archive row was recorded.",
        }),
        failure_reason: z.string().nullable().meta({
          description: "Reason the Instagram bookmark sync attempt failed, if available.",
        }),
        msg_id: z.int().meta({
          description: "Queue message identifier associated with the archived sync attempt.",
        }),
        url: z.string().meta({
          description: "Instagram bookmark URL that was attempted.",
        }),
      }),
    )
    .meta({
      description: "Individual archive records for failed Instagram bookmark sync attempts.",
    }),
  pending: z.int().meta({
    description: "Count of Instagram bookmark sync items still queued for processing.",
  }),
});
