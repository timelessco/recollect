import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";

export const v2DeleteSharedCategoriesUserSupplement = {
  additionalResponses: {
    404: {
      description:
        "Shared category not found — row does not exist or does not belong to the caller",
    },
  },
  description:
    "Deletes the shared_categories row matching the given ID and the authenticated user's user_id. Returns 404 when the row is not found or does not belong to the caller.",
  method: "delete",
  path: "/v2/share/delete-shared-categories-user",
  requestExamples: {
    "delete-collaborator": {
      description: "Removes the row with id=1 owned by the authenticated user.",
      summary: "Delete a shared category by ID",
      value: {
        id: 1,
      } as const,
    },
  },
  responseExamples: {
    "deleted-row": {
      description: "Returns the deleted shared_categories row in an array.",
      summary: "Row deleted successfully",
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
  summary: "Remove a collaborator from a shared category",
  tags: ["Share"],
} satisfies EndpointSupplement;
