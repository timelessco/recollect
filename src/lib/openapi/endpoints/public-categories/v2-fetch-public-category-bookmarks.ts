/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

export const v2FetchPublicCategoryBookmarksSupplement = {
  description:
    "Returns paginated bookmarks for a public category, along with category metadata (name, icon, views, public status). Uses a service-role client to bypass RLS. Does NOT gate on `is_public` -- the frontend decides how to handle non-public categories. Public endpoint (no auth required).",
  method: "get",
  parameterExamples: {
    category_slug: {
      "valid-category": {
        description: "Returns bookmarks for this category.",
        summary: "Valid category slug",
        value: "design-inspiration",
      },
    },
    user_name: {
      "valid-user": {
        description: "Category owner username.",
        summary: "Valid username",
        value: "johndoe",
      },
    },
  },
  path: "/v2/fetch-public-category-bookmarks",
  responseExample: {
    bookmarks: [],
    categoryName: "Design Inspiration",
    categoryViews: { bookmarksView: "card", sortBy: "date-sort-ascending" },
    icon: "palette",
    iconColor: "#ff6800",
    isPublic: true,
  },
  security: [],
  summary: "Fetch bookmarks in a public category by slug and username",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
