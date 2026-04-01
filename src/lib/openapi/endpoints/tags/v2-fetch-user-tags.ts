import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";

export const v2FetchUserTagsSupplement = {
  description:
    "Returns all tags created by the authenticated user. Returns an empty array when the user has no tags.",
  method: "get",
  path: "/v2/tags/fetch-user-tags",
  responseExamples: {
    "no-tags": {
      description: "Authenticate as a user with no tags — returns empty array.",
      summary: "User has no tags",
      value: [] as const,
    },
    "with-tags": {
      description:
        "No parameters needed — returns all tags for the authenticated user. Log in first via Scalar's auth.",
      summary: "User has tags",
      value: [
        {
          created_at: "2024-03-15T10:30:00+00:00",
          id: 1,
          name: "reading-list",
          user_id: "550e8400-e29b-41d4-a716-446655440000",
        },
        {
          created_at: "2024-03-16T08:00:00+00:00",
          id: 2,
          name: "research",
          user_id: "550e8400-e29b-41d4-a716-446655440000",
        },
      ] as const,
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "List all tags for the authenticated user",
  tags: ["Tags"],
} satisfies EndpointSupplement;
