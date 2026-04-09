import { z } from "zod";

export const ProcessQueueInputSchema = z.object({});

export const ProcessQueueOutputSchema = z.object({
  message: z.string().meta({
    description: "Queue processing result message",
    example: "Queue processed successfully",
  }),
});
