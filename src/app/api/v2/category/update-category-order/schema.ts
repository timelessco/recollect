import { z } from "zod";

export const UpdateCategoryOrderInputSchema = z.object({
  category_order: z
    .array(z.int())
    .nullable()
    .meta({ description: "Ordered array of category IDs" }),
});

export const UpdateCategoryOrderOutputSchema = z.array(
  z.object({
    category_order: z.array(z.int().nullable()).nullable().meta({
      description:
        "Updated category order. Elements may be null for categories deleted without compacting the ordering array.",
    }),
    id: z.string().meta({ description: "User profile ID" }),
  }),
);
