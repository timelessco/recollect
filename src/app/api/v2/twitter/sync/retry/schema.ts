import { z } from "zod";

export const TwitterSyncRetryInputSchema = z.union([
  z
    .object({
      msg_ids: z.array(z.int()).min(1).max(100).meta({
        description:
          "Specific archived pgmq message IDs to requeue for another processing attempt. 1–100 items.",
      }),
    })
    .strict(),
  z
    .object({
      all: z.literal(true).meta({
        description:
          "When true, requeue every archived (failed) Twitter/X import message belonging to the authenticated user.",
      }),
    })
    .strict(),
]);

export const TwitterSyncRetryOutputSchema = z.object({
  requested: z.int().optional().meta({
    description:
      "Number of message IDs the client requested to retry. Omitted on the retry-all path.",
  }),
  requeued: z.int().meta({
    description: "Number of messages actually requeued for another processing attempt.",
  }),
});
