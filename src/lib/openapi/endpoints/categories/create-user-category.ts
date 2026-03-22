/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const createUserCategorySupplement = {
  additionalResponses: {
    400: { description: "Invalid or missing request fields" },
    409: {
      description: "A category with this name already exists for this user",
    },
  },
  description:
    "Creates a new category for the authenticated user. The category name must be unique (case-insensitive) for this user. A URL-safe slug is auto-generated from the name. Optionally updates the user profile's category order to include the new category. Returns 409 if a category with the same name already exists.",
  method: "post",
  path: "/category/create-user-category",
  requestExample: {
    category_order: [1, 2, 3],
    icon: "brain",
    icon_color: "#6366f1",
    name: "AI Research",
  },
  responseExample: {
    data: {
      category_name: "AI Research",
      category_slug: "ai-research-abc123",
      category_views: null,
      created_at: "2024-03-15T10:30:00Z",
      icon: "brain",
      icon_color: "#6366f1",
      id: 15,
      is_public: false,
      order_index: 0,
      user_id: "550e8400-e29b-41d4-a716-446655440000",
    },
    error: null,
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Create a new category",
  tags: ["Categories"],
} satisfies EndpointSupplement;
