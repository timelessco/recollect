import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";

export const v2FetchSharedCategoriesDataSupplement = {
  additionalResponses: {
    400: { description: "User email not available (broken auth state)" },
  },
  description:
    "Returns all shared categories where the user is a collaborator (matched by email) or owner (matched by user_id). Returns an empty array when the user has no shared categories.",
  method: "get",
  path: "/v2/share/fetch-shared-categories-data",
  responseExamples: {
    "no-shared-categories": {
      description: "Authenticate as a user with no shared categories — returns empty array.",
      summary: "User has no shared categories",
      value: [] as const,
    },
    "with-shared-categories": {
      description:
        "No parameters needed — returns shared categories matched by email or user_id. Log in first via Scalar's auth.",
      summary: "User has shared categories",
      value: [
        {
          category_id: 42,
          category_views: {
            bookmarksView: "moodboard",
            sortBy: "date-sort-ascending",
          },
          created_at: "2024-03-15T10:30:00+00:00",
          edit_access: true,
          email: "user@example.com",
          id: 1,
          is_accept_pending: false,
          user_id: "550e8400-e29b-41d4-a716-446655440000",
        },
      ] as const,
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "List shared categories for the authenticated user",
  tags: ["Share"],
} satisfies EndpointSupplement;
