import { z } from "zod";

// --- Nested schemas ---

const UserProfileJoinSchema = z
  .object({
    email: z.string().meta({ description: "User email address" }),
    id: z.string().meta({ description: "User profile ID (UUID)" }),
    profile_pic: z.string().nullable().meta({ description: "User profile picture URL" }),
    user_name: z.string().nullable().meta({ description: "User display name" }),
  })
  .nullable()
  .meta({ description: "FK join on user_id returning profile fields" });

const CollabDataSchema = z.object({
  edit_access: z.boolean().meta({ description: "Whether the collaborator has edit access" }),
  is_accept_pending: z
    .boolean()
    .nullable()
    .meta({ description: "Whether the collaboration invite is pending acceptance" }),
  isOwner: z
    .boolean()
    .meta({ description: "Whether this collaborator entry represents the owner" }),
  profile_pic: z.string().nullable().meta({ description: "Collaborator profile picture URL" }),
  share_id: z.int().nullable().meta({ description: "Shared category record ID" }),
  userEmail: z.string().meta({ description: "Collaborator email address" }),
});

const CategoryWithCollabDataSchema = z.object({
  category_name: z.string().nullable().meta({ description: "Display name of the category" }),
  category_slug: z.string().meta({ description: "URL-safe slug for the category" }),
  category_views: z.unknown().nullable().meta({ description: "Category view settings (JSON)" }),
  collabData: z
    .array(CollabDataSchema)
    .meta({ description: "Array of collaborator entries including owner" }),
  created_at: z.string().nullable().meta({ description: "Category creation timestamp" }),
  icon: z.string().nullable().meta({ description: "Category icon identifier" }),
  icon_color: z.string().nullable().meta({ description: "Category icon color" }),
  id: z.int().meta({ description: "Category ID" }),
  is_favorite: z
    .boolean()
    .meta({ description: "Whether this category is in the user's favorites (legacy compat)" }),
  is_public: z.boolean().meta({ description: "Whether the category is publicly visible" }),
  order_index: z.int().nullable().meta({ description: "Category display order index" }),
  user_id: UserProfileJoinSchema,
});

// --- Input/Output schemas ---

export const FetchUserCategoriesInputSchema = z.object({});

export const FetchUserCategoriesOutputSchema = z.array(CategoryWithCollabDataSchema);
