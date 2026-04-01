import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";

export const v2UpdateCategoryOrderSupplement = {
  additionalResponses: {
    401: { description: "Not authenticated" },
  },
  description:
    "Sets the ordered list of category IDs for the authenticated user's profile. Controls the display order of collections in the UI. A null input is coalesced to an empty array, effectively clearing the order. Returns the updated profile row with `id` and `category_order`.",
  method: "patch",
  path: "/v2/category/update-category-order",
  requestExamples: {
    "clear-order": {
      description: "Send null to reset the category order to an empty array.",
      summary: "Clear category order",
      value: {
        category_order: null,
      },
    },
    "empty-order": {
      description: "Send an empty array to clear all ordering.",
      summary: "Empty order array",
      value: {
        category_order: [],
      },
    },
    "reorder-categories": {
      description: "Send an array of category IDs in the desired display order.",
      summary: "Reorder categories",
      value: {
        category_order: [724, 577, 812],
      },
    },
  },
  responseExamples: {
    "order-cleared": {
      description:
        "Null input coalesces to empty array — category_order is stored as an empty array.",
      summary: "Category order cleared",
      value: [
        {
          category_order: [],
          id: "550e8400-e29b-41d4-a716-446655440000",
        },
      ] as const,
    },
    "order-updated": {
      description: "Returns the updated profile row with the new category_order array.",
      summary: "Category order updated",
      value: [
        {
          category_order: [724, 577, 812],
          id: "550e8400-e29b-41d4-a716-446655440000",
        },
      ] as const,
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Update category display order",
  tags: ["Categories"],
} satisfies EndpointSupplement;
