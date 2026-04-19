import { z } from "zod";

import { tagCategoryNameSchema } from "@/lib/validation/tag-category-schema";

export const V2SyncFoldersInputSchema = z.object({
  categories: z
    .array(
      z.object({
        name: tagCategoryNameSchema.meta({
          description: "Twitter/X folder name to mirror as a Recollect collection.",
        }),
      }),
    )
    .min(1, { error: "At least one category required" })
    .meta({
      description:
        "Twitter/X bookmark folder names to mirror as Recollect collections. Deduplicated case-insensitively against existing collections.",
    }),
});

export const V2SyncFoldersOutputSchema = z.object({
  created: z.int().meta({
    description: "Number of new collections inserted.",
  }),
  skipped: z.int().meta({
    description:
      "Number of submitted folder names that were skipped — either they already existed (case-insensitive match) or appeared as a duplicate within the request.",
  }),
});
