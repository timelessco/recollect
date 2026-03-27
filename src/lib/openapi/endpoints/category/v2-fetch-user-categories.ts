import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";

export const v2FetchUserCategoriesSupplement = {
  additionalResponses: {
    401: { description: "Not authenticated" },
  },
  description:
    "Returns all categories owned by the authenticated user plus categories where the user is an accepted collaborator. Each category includes a `collabData` array listing all collaborators (with owner entry), a `user_id` FK join with profile fields, and an `is_favorite` boolean derived from the user's `favorite_categories` profile field. Public categories owned by other users are excluded unless the user is an accepted collaborator. Pending collaboration invites (`is_accept_pending: true`) are not included.",
  method: "get",
  path: "/v2/category/fetch-user-categories",
  responseExamples: {
    "category-with-collaborator": {
      description:
        "Send GET with auth cookie — returns categories including one with a pending collaborator invite in collabData.",
      summary: "Category with collaborator",
      value: {
        data: [
          {
            category_name: "Default",
            category_slug: "funky-mhd2z350",
            category_views: {
              bookmarksView: "moodboard",
              cardContentViewArray: ["title", "cover", "info"],
              moodboardColumns: [30],
              sortBy: "date-sort-ascending",
            },
            collabData: [
              {
                edit_access: false,
                is_accept_pending: true,
                isOwner: false,
                profile_pic: null,
                share_id: 257,
                userEmail: "collab@example.com",
              },
              {
                edit_access: true,
                is_accept_pending: false,
                isOwner: true,
                profile_pic: "",
                share_id: null,
                userEmail: "user@example.com",
              },
            ],
            created_at: "2025-10-30T07:06:06.416052+00:00",
            icon: "star-04",
            icon_color: "#1a1a1a",
            id: 574,
            is_favorite: false,
            is_public: false,
            order_index: null,
            user_id: {
              email: "user@example.com",
              id: "550e8400-e29b-41d4-a716-446655440000",
              profile_pic: "",
              user_name: "user",
            },
          },
        ],
        error: null,
      } as const,
    },
    "solo-category": {
      description:
        "Send GET with auth cookie — returns a category with only the owner in collabData (no collaborators).",
      summary: "Category without collaborators",
      value: {
        data: [
          {
            category_name: "Architecture",
            category_slug: "architecture-refs",
            category_views: {
              bookmarksView: "moodboard",
              cardContentViewArray: ["title", "cover"],
              moodboardColumns: [30],
              sortBy: "alphabetical-sort-descending",
            },
            collabData: [
              {
                edit_access: true,
                is_accept_pending: false,
                isOwner: true,
                profile_pic: "",
                share_id: null,
                userEmail: "user@example.com",
              },
            ],
            created_at: "2025-10-17T05:39:52.46019+00:00",
            icon: "diamond-01",
            icon_color: "#ef4444",
            id: 567,
            is_favorite: false,
            is_public: false,
            order_index: 1,
            user_id: {
              email: "user@example.com",
              id: "550e8400-e29b-41d4-a716-446655440000",
              profile_pic: "",
              user_name: "user",
            },
          },
        ],
        error: null,
      } as const,
    },
    "empty-categories": {
      description: "Send GET with auth cookie for a user with no categories — returns empty array.",
      summary: "No categories",
      value: {
        data: [],
        error: null,
      } as const,
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Fetch user categories with collaboration data",
  tags: ["Categories"],
} satisfies EndpointSupplement;
