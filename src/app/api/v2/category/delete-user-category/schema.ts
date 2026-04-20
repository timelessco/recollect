import { z } from "zod";

export const DeleteUserCategoryInputSchema = z.object({
  category_id: z.int().min(0).meta({ description: "ID of the category to delete" }),
  keep_bookmarks: z.boolean().default(false).meta({
    description:
      "When true, preserves bookmarks instead of trashing them. Orphaned bookmarks auto-get Uncategorized.",
  }),
});

export type DeleteUserCategoryInput = z.infer<typeof DeleteUserCategoryInputSchema>;

// Single-row shape mirroring the sibling `create-user-category` output for the
// same `categories` table (pitfall 18 — field-set + z.int() parity). The handler
// returns the array from `.select()`; the outer schema below wraps it as a
// non-empty tuple so callers can rely on `[0]` existing.
const DeletedCategorySchema = z.object({
  category_name: z.string().nullable().meta({ description: "Category display name" }),
  category_slug: z.string().meta({ description: "URL-safe slug" }),
  category_views: z.unknown().nullable().meta({ description: "Category view settings (JSON)" }),
  created_at: z.string().nullable().meta({ description: "Category creation timestamp" }),
  icon: z.string().nullable().meta({ description: "Icon identifier" }),
  icon_color: z.string().nullable().meta({ description: "Icon color hex code" }),
  id: z.int().meta({ description: "Category ID" }),
  is_public: z.boolean().meta({ description: "Whether the category was publicly visible" }),
  user_id: z.string().nullable().meta({ description: "Owner user ID" }),
});

export const DeleteUserCategoryOutputSchema = z.array(DeletedCategorySchema).nonempty();

export type DeleteUserCategoryOutput = z.infer<typeof DeleteUserCategoryOutputSchema>;
