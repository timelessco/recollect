/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const updateUserCategorySupplement = {
  additionalResponses: {
    409: {
      description: "A category with this name already exists for this user",
    },
  },
  description:
    "Updates one or more properties of a category owned by the authenticated user. All updateData fields are optional — only provided fields are updated. The category_views field accepts additional properties (additionalProperties: true) for flexible JSONB view configuration. Triggers revalidation for public categories on any field change. Returns 409 if renaming to a name that already exists for this user.",
  method: "post",
  path: "/category/update-user-category",
  requestExample: {
    category_id: 7,
    updateData: {
      category_name: "AI & ML Research",
      icon: "brain",
      icon_color: "#6366f1",
      is_public: true,
    },
  },
  responseExample: {
    data: {
      category_name: "AI & ML Research",
      category_slug: "ai-research-abc123",
      category_views: { bookmarksView: "grid", sortBy: "date" },
      created_at: "2024-01-10T08:00:00Z",
      icon: "brain",
      icon_color: "#6366f1",
      id: 7,
      is_public: true,
      order_index: 2,
      user_id: "550e8400-e29b-41d4-a716-446655440000",
    },
    error: null,
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Update a category",
  tags: ["Categories"],
} satisfies EndpointSupplement;
