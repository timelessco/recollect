import { z } from "zod";

export const TwitterSyncStatusInputSchema = z.object({});

export const TwitterSyncStatusOutputSchema = z.object({
  archived: z.number().meta({
    description: "Count of archived Twitter/X bookmark sync messages for the authenticated user.",
  }),
  archives: z
    .array(
      z.object({
        archived_at: z.string().nullable().meta({
          description: "Timestamp when the message was archived. Null while still in-flight.",
        }),
        failure_reason: z.string().nullable().meta({
          description: "Failure reason recorded on the archived row. Null on success.",
        }),
        msg_id: z.number().meta({ description: "pgmq message identifier." }),
        url: z.string().meta({ description: "Twitter/X bookmark URL carried on the message." }),
      }),
    )
    .meta({
      description: "Per-message archive records for the authenticated user's sync queue.",
    }),
  pending: z.number().meta({
    description: "Count of pending Twitter/X bookmark sync messages still in the queue.",
  }),
});
