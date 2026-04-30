import { z } from "zod";

import { tagCategoryNameSchema } from "@/lib/validation/tag-category-schema";

// `category_views` stores an open JSONB shape — keep it permissive on input so new
// view-config keys from clients flow through without a schema bump.
const categoryViewsSchema = z
  .looseObject({
    bookmarksView: z.string().optional().meta({ description: "View layout" }),
    cardContentViewArray: z
      .array(z.string())
      .optional()
      .meta({ description: "Visible card content fields" }),
    moodboardColumns: z
      .array(z.number())
      .optional()
      .meta({ description: "Column widths for moodboard view" }),
    sortBy: z.string().optional().meta({ description: "Sort field" }),
  })
  .optional();

export const UpdateUserCategoryInputSchema = z.object({
  category_id: z
    .union([z.number(), z.string()])
    .meta({ description: "ID of the category to update (number or string)" }),
  updateData: z
    .object({
      category_name: tagCategoryNameSchema
        .optional()
        .meta({ description: "New category display name (1–20 characters)" }),
      category_views: categoryViewsSchema.meta({
        description:
          "View configuration JSONB. Additional properties allowed (additionalProperties: true).",
      }),
      icon: z.string().nullable().optional().meta({ description: "New icon identifier" }),
      icon_color: z.string().optional().meta({ description: "New icon color hex code" }),
      /**
       * @deprecated Legacy compat for old mobile builds. Remove when old builds are no longer supported.
       */
      is_favorite: z.boolean().optional().meta({
        description:
          "Deprecated: legacy compat for old mobile builds. Toggles favorite status via profiles.favorite_categories",
      }),
      is_public: z.boolean().optional().meta({
        description: "Whether to make the collection publicly visible",
      }),
    })
    .meta({ description: "Fields to update (all optional, omit to skip)" }),
});

// Single-row shape matches the sibling `create-user-category` output for the same
// `categories` table (pitfall 18 — field-set + `z.int()` parity). The handler
// returns an array via `.select()`; the outer schema is a non-empty array below.
const UpdatedCategorySchema = z.object({
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

export const UpdateUserCategoryOutputSchema = z.array(UpdatedCategorySchema).nonempty();

export type UpdateUserCategoryInput = z.infer<typeof UpdateUserCategoryInputSchema>;
export type UpdateUserCategoryOutput = z.infer<typeof UpdateUserCategoryOutputSchema>;
