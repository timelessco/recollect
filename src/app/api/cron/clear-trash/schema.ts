import { z } from "zod";

export const ClearTrashInputSchema = z.object({});

export type ClearTrashInput = z.infer<typeof ClearTrashInputSchema>;

export const ClearTrashOutputSchema = z.object({
  deletedCount: z
    .int()
    .meta({ description: "Total number of expired trashed bookmarks permanently deleted" }),
});

export type ClearTrashOutput = z.infer<typeof ClearTrashOutputSchema>;
