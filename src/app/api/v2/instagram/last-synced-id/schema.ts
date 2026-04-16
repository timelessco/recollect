import { z } from "zod";

export const InstagramLastSyncedIdInputSchema = z.object({
  last_synced_instagram_id: z.string().min(1).meta({
    description:
      "ID of the most recently synced Instagram bookmark. Subsequent syncs resume from this point.",
  }),
});

export const InstagramLastSyncedIdOutputSchema = z.object({
  last_synced_instagram_id: z.string().nullable().meta({
    description:
      "Updated last-synced Instagram bookmark ID, echoed back from the profiles row. Null if the column has been cleared.",
  }),
});
