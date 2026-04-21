import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";

export const v2UpdateUserCategorySupplement = {
  additionalResponses: {
    400: {
      description:
        "Missing `category_id` or `updateData`, or schema violation on the provided fields",
    },
    401: { description: "Not authenticated" },
    404: { description: "Category not found or not owned by the user" },
    409: {
      description:
        'Duplicate category name — another category owned by this user already uses the same name (case-insensitive match via `unique_user_category_name_ci`). Response body: `{ "error": "You already have a category with this name. Please use a different name." }`',
    },
    503: {
      description:
        'Database error, OR the update/select matched zero rows (category not owned or does not exist). Empty-match returns `{ "error": "No data returned from database" }` — matches the v1 500 pattern.',
    },
  },
  description:
    "Updates a category owned by the authenticated user. Any subset of `category_name`, `category_views`, `icon`, `icon_color`, or `is_public` may be provided — omitted fields are left untouched. If the `updateData` object contains no writable fields, the endpoint returns the current row without issuing a write. The legacy `is_favorite` flag (retained for old mobile builds) toggles the user's `profiles.favorite_categories` entry for this category and is applied after the row update. When the updated row is public, or when the update flips visibility, a public-category-page revalidation is scheduled after the response is sent.",
  method: "post",
  path: "/v2/category/update-user-category",
  requestExamples: {
    "happy-path": {
      description: "Send the shown body — updates category 363's icon and color",
      summary: "Update icon and color",
      value: {
        category_id: 363,
        updateData: { icon: "star-04", icon_color: "#112233" },
      },
    },
    "no-op-read": {
      description:
        "Send an empty `updateData` — server falls back to a SELECT and returns the current row without writing (preserves v1 contract)",
      summary: "Empty updateData returns current row",
      value: {
        category_id: 363,
        updateData: {},
      },
    },
    "toggle-public": {
      description:
        "Send the shown body — flips the category to public and schedules a revalidation of the public page after the response is sent",
      summary: "Toggle is_public to true",
      value: {
        category_id: 547,
        updateData: { is_public: true },
      },
    },
  },
  response400Examples: {
    "missing-category-id": {
      description: 'Send `{ updateData: { icon: "x" } }` — returns 400: category_id is required',
      summary: "Missing category_id",
      value: { error: "Invalid input" },
    },
    "missing-update-data": {
      description: "Send `{ category_id: 363 }` — returns 400: updateData is required",
      summary: "Missing updateData object",
      value: { error: "Invalid input: expected object, received undefined" },
    },
  },
  responseExamples: {
    "happy-path": {
      description: "Response is a one-element array containing the updated row",
      summary: "Row returned as single-element array",
      value: [
        {
          category_name: "Food",
          category_slug: "food-instagram-cf06c353",
          category_views: { bookmarksView: "moodboard", sortBy: "date-sort-ascending" },
          created_at: "2026-01-21T11:23:46.456708+00:00",
          icon: "star-04",
          icon_color: "#112233",
          id: 363,
          is_public: false,
          user_id: "550e8400-e29b-41d4-a716-446655440000",
        },
      ],
    },
    "toggle-public": {
      description:
        "Body returns immediately; revalidation runs in the background via Next's `after()` — failures are logged and never fail the mutation",
      summary: "Public category with scheduled revalidation",
      value: [
        {
          category_name: "Codepen",
          category_slug: "codepen-instagram-55d033f1",
          category_views: { bookmarksView: "moodboard", sortBy: "date-sort-ascending" },
          created_at: "2026-02-13T11:46:00.555096+00:00",
          icon: "bookmark",
          icon_color: "#ffffff",
          id: 547,
          is_public: true,
          user_id: "550e8400-e29b-41d4-a716-446655440000",
        },
      ],
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Update a user category",
  tags: ["Categories"],
} satisfies EndpointSupplement;
