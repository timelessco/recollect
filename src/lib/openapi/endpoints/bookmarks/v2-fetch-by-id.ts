import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";

export const v2FetchByIdSupplement = {
  additionalResponses: {
    400: { description: "Missing or invalid bookmark ID query parameter" },
  },
  description:
    "Returns the bookmark with the given ID and its associated categories in the addedCategories array. The query is scoped to the authenticated user's bookmarks only.",
  method: "get",
  parameterExamples: {
    id: {
      "no-categories": {
        description: "Returns the bookmark with addedCategories as an empty array.",
        summary: "Bookmark without categories",
        value: "90127",
      },
      nonexistent: {
        description: "Returns an empty data array.",
        summary: "Nonexistent bookmark ID",
        value: "999999",
      },
      "with-categories": {
        description: "Returns the bookmark and its addedCategories array populated.",
        summary: "Bookmark with categories",
        value: "86",
      },
    },
  },
  path: "/v2/bookmarks/get/fetch-by-id",
  response400Examples: {
    "missing-id": {
      description: "Omit the `id` query parameter entirely — returns 400.",
      summary: "Missing id parameter",
      value: {
        error: "Invalid input: expected number, received NaN",
      } as const,
    },
    "non-numeric-id": {
      description: "Send `?id=abc` — returns 400 validation error.",
      summary: "Non-numeric id parameter",
      value: {
        error: "Invalid input: expected number, received NaN",
      } as const,
    },
  },
  responseExamples: {
    "no-categories": {
      description:
        "Send `?id=90127` (substitute a bookmark with no categories) — addedCategories is an empty array.",
      summary: "Bookmark without categories",
      value: [
        {
          addedCategories: [],
          description: null,
          id: 90_127,
          inserted_at: "2026-02-26T07:33:01.467254+00:00",
          make_discoverable: null,
          meta_data: null,
          ogImage: null,
          sort_index: null,
          title: "Test No Categories Bookmark",
          trash: null,
          type: null,
          url: "https://example.com/no-cats-test",
          user_id: "550e8400-e29b-41d4-a716-446655440000",
        },
      ] as const,
    },
    nonexistent: {
      description: "Send `?id=999999` — returns empty array when no bookmark matches.",
      summary: "Nonexistent bookmark ID",
      value: [] as const,
    },
    "with-categories": {
      description:
        "Send `?id=86` (substitute a real bookmark ID) — returns bookmark with populated addedCategories.",
      summary: "Bookmark with categories",
      value: [
        {
          addedCategories: [
            {
              category_name: "Database",
              category_slug: "database-mhehjvu5",
              icon: "star-04",
              icon_color: "#000000",
              id: 577,
            },
          ],
          description: "GitHub is where over 100 million developers...",
          id: 86,
          inserted_at: "2023-10-30T11:49:24.887983+00:00",
          make_discoverable: null,
          meta_data: {
            favIcon: "https://github.githubassets.com/favicons/favicon.svg",
            height: 630,
            width: 1200,
          },
          ogImage: "https://example.com/storage/bookmarks/img-locu7pnd.jpg",
          sort_index: null,
          title: "GitHub: Let's build from here",
          trash: null,
          type: "bookmark",
          url: "https://github.com/",
          user_id: "550e8400-e29b-41d4-a716-446655440000",
        },
      ] as const,
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Fetch a bookmark by ID with its categories",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
