import { z } from "zod";

import { tagCategoryNameSchema } from "@/lib/validation/tag-category-schema";

export const CreateUserCategoryInputSchema = z.object({
  category_order: z
    .array(z.int())
    .nullish()
    .meta({
      description:
        "Current ordered list of category IDs from the user profile. " +
        "The new category ID will be appended. Omit to skip reordering.",
    }),
  icon: z.string().nullable().optional().meta({ description: "Icon identifier" }),
  icon_color: z
    .string()
    .regex(
      /^#([\dA-F]{6}|[\dA-F]{3})$/iu,
      "Invalid hex color — expected format like #fff or #1a2b3c",
    )
    .optional()
    .meta({ description: "Icon color hex code" }),
  name: tagCategoryNameSchema.meta({
    description: "Category display name (1–20 characters)",
  }),
});

// Single-row shape mirroring the sibling `fetch-user-categories` output for the
// same `categories` table (pitfall 18 — field-set + z.int() parity). The handler
// returns an array via `.select()`; the outer array is defined on the output
// schema below so callers can type the response as a non-empty tuple.
const CreatedCategorySchema = z.object({
  category_name: z.string().nullable().meta({ description: "Category display name" }),
  category_slug: z.string().meta({ description: "URL-safe slug" }),
  category_views: z.unknown().nullable().meta({ description: "Category view settings (JSON)" }),
  created_at: z.string().nullable().meta({ description: "Category creation timestamp" }),
  icon: z.string().nullable().meta({ description: "Icon identifier" }),
  icon_color: z.string().nullable().meta({ description: "Icon color hex code" }),
  id: z.int().meta({ description: "Category ID" }),
  is_public: z.boolean().meta({ description: "Whether the category is publicly visible" }),
  user_id: z.string().nullable().meta({ description: "Owner user ID" }),
});

export const CreateUserCategoryOutputSchema = z.array(CreatedCategorySchema).nonempty();

export type CreateUserCategoryInput = z.infer<typeof CreateUserCategoryInputSchema>;
export type CreateUserCategoryOutput = z.infer<typeof CreateUserCategoryOutputSchema>;
