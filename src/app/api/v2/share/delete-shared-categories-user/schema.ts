import { z } from "zod";

export const DeleteSharedCategoriesUserInputSchema = z.object({
  id: z.int().meta({ description: "Shared category record ID to delete" }),
});

export const DeleteSharedCategoriesUserOutputSchema = z.array(
  z.object({
    category_id: z.int().meta({ description: "ID of the shared category" }),
    category_views: z.unknown().meta({ description: "View settings for the shared category" }),
    created_at: z
      .string()
      .nullable()
      .meta({ description: "Timestamp when the sharing was created" }),
    edit_access: z.boolean().meta({ description: "Whether the recipient has edit permission" }),
    email: z.string().nullable().meta({ description: "Email address of the shared user" }),
    id: z.int().meta({ description: "Unique identifier of the share record" }),
    is_accept_pending: z
      .boolean()
      .nullable()
      .meta({ description: "Whether the share invite is pending acceptance" }),
    user_id: z.string().meta({ description: "User ID of the share recipient" }),
  }),
);
