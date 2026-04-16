import { z } from "zod";

export const TwitterLastSyncedIdInputSchema = z.object({
  last_synced_twitter_id: z.string().min(1).meta({
    description:
      "ID of the most recently synced Twitter/X bookmark. Subsequent syncs resume from this point.",
  }),
});

export const TwitterLastSyncedIdOutputSchema = z.object({
  last_synced_twitter_id: z.string().nullable().meta({
    description:
      "Updated last-synced Twitter/X bookmark ID, echoed back from the profiles row. Null if the column has been cleared.",
  }),
});
