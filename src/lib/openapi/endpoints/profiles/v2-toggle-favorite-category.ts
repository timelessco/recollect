/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const v2ToggleFavoriteCategorySupplement = {
  additionalResponses: {
    400: { description: "Invalid request body (e.g., missing or negative `category_id`)" },
    401: { description: "Not authenticated" },
    404: { description: "Profile row not found for the authenticated user" },
    503: { description: "Database error while running the toggle RPC" },
  },
  description:
    "Adds or removes a category from the authenticated user's ordered favorites list. If the category is already a favorite it is removed; otherwise it is appended. Category ID `0` represents Uncategorized. The operation is idempotent in pairs — two successive calls with the same `category_id` return the list to its original state. Returns the user's profile ID and the updated favorites array.",
  method: "post",
  path: "/v2/profiles/toggle-favorite-category",
  requestExamples: {
    "toggle-add": {
      description:
        "Send the shown body where `category_id` is not currently in favorites — returns the updated list with the category appended.",
      summary: "Add category to favorites",
      value: { category_id: 42 },
    },
    "toggle-remove": {
      description:
        "Send the shown body where `category_id` IS in favorites — returns the updated list with the category removed.",
      summary: "Remove category from favorites",
      value: { category_id: 42 },
    },
  },
  response400Examples: {
    "missing-category-id": {
      description: "Send `{}` as body — returns 400: expected number, received undefined.",
      summary: "Missing category_id",
      value: { error: "Invalid input: expected number, received undefined" },
    },
    "negative-category-id": {
      description:
        "Send `{ category_id: -1 }` — returns 400: Too small: expected number to be >=0.",
      summary: "Negative category_id",
      value: { error: "Too small: expected number to be >=0" },
    },
  },
  responseExamples: {
    "toggle-add": {
      description: "Category appended to the end of the favorites list.",
      summary: "Add category to favorites",
      value: {
        favorite_categories: [547, 372, 361, 363, 42],
        id: "550e8400-e29b-41d4-a716-446655440000",
      },
    },
    "toggle-remove": {
      description: "Category removed; remaining favorites preserve their order.",
      summary: "Remove category from favorites",
      value: {
        favorite_categories: [547, 372, 361, 363],
        id: "550e8400-e29b-41d4-a716-446655440000",
      },
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Toggle a category in the user's favorites",
  tags: ["Profiles"],
} satisfies EndpointSupplement;
