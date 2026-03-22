/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

export const fetchPublicBookmarkByIdSupplement = {
  additionalResponses: {
    403: { description: "Category is not public" },
    404: { description: "Category or bookmark not found" },
    500: { description: "Server error" },
  },
  description:
    "Fetches a single bookmark by ID, verifying it belongs to a public category owned by the given username. No authentication required. Returns 404 if the category doesn't exist, the username doesn't match, or the bookmark isn't in the specified category. Returns 403 if the category is private.",
  method: "get",
  path: "/bookmark/fetch-public-bookmark-by-id",
  responseExample: {
    data: {
      description: "Official TypeScript documentation",
      id: 42,
      inserted_at: "2024-03-15T10:30:00Z",
      make_discoverable: null,
      meta_data: null,
      ogImage: "https://www.typescriptlang.org/og.png",
      screenshot: null,
      title: "TypeScript Handbook",
      trash: null,
      type: "article",
      url: "https://www.typescriptlang.org/docs/",
      user_id: { user_name: "johndoe" },
    },
    error: null,
  },
  security: [],
  summary: "Get a public bookmark by ID and collection",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
