import { z } from "zod";

export const ProcessArchivedInputSchema = z.union([
  z.object({
    retry_all: z.literal(true).meta({ description: "When true, retries all archived queue items" }),
  }),
  z.object({
    count: z
      .int()
      .min(1)
      .max(1000)
      .meta({ description: "Number of archived queue items to retry" }),
  }),
  z.object({
    msg_ids: z
      .array(z.int().meta({ description: "Queue message ID" }))
      .min(1)
      .max(100)
      .meta({ description: "Specific queue message IDs to retry" }),
  }),
]);

export type ProcessArchivedInput = z.infer<typeof ProcessArchivedInputSchema>;

export const ProcessArchivedOutputSchema = z.object({
  requested: z
    .int()
    .nullable()
    .meta({ description: "Number of items requested to retry (null when retry_all)" }),
  requeued: z.int().meta({ description: "Number of items actually requeued for processing" }),
});

export type ProcessArchivedOutput = z.infer<typeof ProcessArchivedOutputSchema>;
