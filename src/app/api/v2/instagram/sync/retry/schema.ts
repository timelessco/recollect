import { z } from "zod";

export const V2InstagramSyncRetryInputSchema = z
  .union([
    z
      .object({
        msg_ids: z.array(z.int()).min(1).max(100).meta({
          description:
            "Specific archived message IDs to requeue. Must have between 1 and 100 entries.",
        }),
      })
      .strict(),
    z
      .object({
        all: z.literal(true).meta({
          description: "Set to true to requeue every archived Instagram import for the caller.",
        }),
      })
      .strict(),
  ])
  .meta({
    description:
      "Either a bounded list of archived message IDs to retry, or `{ all: true }` to retry every archived import for the authenticated user.",
  });

export const V2InstagramSyncRetryOutputSchema = z.object({
  requested: z.int().optional().meta({
    description:
      "Count of message IDs the caller asked to retry. Omitted when the caller retried all archived messages.",
  }),
  requeued: z.int().meta({
    description: "Count of archived messages that were successfully requeued.",
  }),
});
