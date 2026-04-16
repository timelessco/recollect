import { z } from "zod";

export const RaindropImportRetryInputSchema = z
  .union([
    z
      .object({
        msg_ids: z.array(z.int()).min(1).max(100).meta({
          description:
            "Archived queue message IDs to requeue. Must contain 1-100 entries. Only messages owned by the authenticated user are retried.",
        }),
      })
      .strict(),
    z
      .object({
        all: z.literal(true).meta({
          description:
            "Set to `true` to requeue every archived Raindrop import message for the authenticated user.",
        }),
      })
      .strict(),
  ])
  .meta({
    description:
      "Either `{ msg_ids: [...] }` to retry specific archived messages or `{ all: true }` to retry every archived message for the user.",
  });

export const RaindropImportRetryOutputSchema = z.object({
  requested: z.int().optional().meta({
    description:
      "Count of message IDs the caller asked to requeue. Present only on the per-message path; omitted on `all: true`.",
  }),
  requeued: z.int().meta({
    description:
      "Count of archived messages successfully requeued. May be less than `requested` when IDs are missing or belong to another user.",
  }),
});
