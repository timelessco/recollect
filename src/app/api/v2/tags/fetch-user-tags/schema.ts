import { z } from "zod";

export const FetchUserTagsInputSchema = z.object({});

export const FetchUserTagsOutputSchema = z.array(
  z.object({
    created_at: z.string().nullable().meta({ description: "Timestamp when the tag was created" }),
    id: z.int().meta({ description: "Tag unique identifier" }),
    name: z.string().nullable().meta({ description: "Tag display name" }),
    user_id: z.string().nullable().meta({ description: "ID of the user who owns the tag" }),
  }),
);
