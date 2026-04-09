/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const toggleFavoriteCategorySupplement = {
  description:
    "Adds or removes a category from the user's ordered favorites list. If the category is already a favorite it is removed; otherwise it is appended. Category ID 0 represents Uncategorized. Returns the updated profile with the full favorites list.",
  method: "post",
  path: "/profiles/toggle-favorite-category",
  requestExample: {
    category_id: 42,
  },
  responseExample: {
    data: {
      favorite_categories: [361, 547, 363, 7, 42],
      id: "550e8400-e29b-41d4-a716-446655440000",
    },
    error: null,
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Toggle favorite category",
  tags: ["Profiles"],
} satisfies EndpointSupplement;
