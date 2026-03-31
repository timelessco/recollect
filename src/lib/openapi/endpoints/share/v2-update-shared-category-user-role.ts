import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";

export const v2UpdateSharedCategoryUserRoleSupplement = {
  description:
    "Updates fields on a shared_categories row. The row must match the given id and either the caller's user_id or email (dual-match via .or()). Primarily used to toggle edit_access.",
  method: "patch",
  path: "/v2/share/update-shared-category-user-role",
  requestExamples: {
    "toggle-edit-access": {
      description:
        "Sets edit_access=true on the shared_categories row with id=1 where the caller matches by user_id or email.",
      summary: "Grant edit access to a collaborator",
      value: {
        id: 1,
        updateData: {
          edit_access: true,
        },
      } as const,
    },
  },
  responseExamples: {
    "no-match": {
      description: "If no row matches the id + (user_id or email) filter, returns an empty array.",
      summary: "No row matched — empty array returned",
      value: [] as const,
    },
    "updated-row": {
      description: "Returns the updated shared_categories row in an array.",
      summary: "Role updated successfully",
      value: [
        {
          category_id: 42,
          category_views: {
            bookmarksView: "moodboard",
            sortBy: "date-sort-ascending",
          },
          created_at: "2024-03-15T10:30:00+00:00",
          edit_access: true,
          email: "collaborator@example.com",
          id: 1,
          is_accept_pending: false,
          user_id: "550e8400-e29b-41d4-a716-446655440000",
        },
      ] as const,
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Update a collaborator's role in a shared category",
  tags: ["Share"],
} satisfies EndpointSupplement;
