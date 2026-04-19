import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";

export const v2CreateUserCategorySupplement = {
  additionalResponses: {
    400: { description: "Validation error — request body failed Zod validation" },
    401: { description: "Not authenticated" },
    409: {
      description:
        "Duplicate category name — this user already owns a category with the same name (case-insensitive match via `unique_user_category_name_ci`)",
    },
    503: { description: "Database error" },
  },
  description:
    "Creates a new category for the authenticated user. The category name must be unique (case-insensitive) per user. A URL-safe slug is auto-generated from the name. When `category_order` is provided, the new category ID is appended to the user profile's ordering array in a follow-up update. Returns the inserted category row as a single-element array.",
  method: "post",
  path: "/v2/category/create-user-category",
  requestExamples: {
    "happy-path": {
      description: "Send the shown body — creates 'My Collection' with icon and hex color",
      summary: "Create with icon",
      value: {
        icon: "star-04",
        icon_color: "#112233",
        name: "My Collection",
      },
    },
    minimal: {
      description: "Send just the name — icon/color default to null",
      summary: "Minimal request",
      value: { name: "My Collection" },
    },
    "with-category-order": {
      description:
        "Send with category_order — new ID is appended to the profile's `category_order` array",
      summary: "Append to category_order",
      value: {
        category_order: [12, 34, 56],
        name: "Reading List",
      },
    },
  },
  response400Examples: {
    "bad-color": {
      description:
        'Send `{"name":"foo","icon_color":"not-hex"}` — returns 400 with the hex-color regex message',
      summary: "Invalid hex color",
      value: { error: "Invalid hex color — expected format like #fff or #1a2b3c" },
    },
    "empty-name": {
      description: 'Send `{"name": ""}` — returns 400: Name must be at least 1 character',
      summary: "Empty name rejected",
      value: { error: "Name must be at least 1 character" },
    },
    "missing-name": {
      description: "Send `{}` — returns 400: Name is required",
      summary: "Missing name",
      value: { error: "Name is required" },
    },
  },
  responseExamples: {
    "happy-path": {
      description:
        "Creates the category and returns the inserted row as a single-element array. The slug is `<kebab-name>-<uniqid>`; `category_views`, `is_public`, and timestamps are populated by DB defaults.",
      summary: "Category created",
      value: [
        {
          category_name: "My Collection",
          category_slug: "my-collection-mo4ndcfx",
          category_views: {
            bookmarksView: "moodboard",
            cardContentViewArray: ["cover", "title", "info"],
            moodboardColumns: [30],
            sortBy: "date-sort-ascending",
          },
          created_at: "2026-04-18T18:05:04.71284+00:00",
          icon: "star-04",
          icon_color: "#112233",
          id: 634,
          is_public: false,
          user_id: "550e8400-e29b-41d4-a716-446655440000",
        },
      ],
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Create a new category",
  tags: ["Categories"],
} satisfies EndpointSupplement;
