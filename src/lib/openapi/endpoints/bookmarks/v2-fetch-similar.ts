import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";

export const v2FetchSimilarSupplement = {
  additionalResponses: {
    400: { description: "Invalid bookmark_id query parameter" },
    401: { description: "Not authenticated" },
  },
  description:
    "Returns bookmarks similar to `bookmark_id`, scoped to the authenticated user. Ranking is selected by the `SIMILARITY_USE_EMBEDDINGS` server flag. When the flag is off (legacy path), score is an additive integer 0–42 over OKLCh color similarity, shared AI-inferred content types, shared detected objects, shared people/creator/classifier signals, and url host equality. When on, score is integer 0–100 derived from cosine similarity over Vertex AI multimodal image embeddings. Wire shape and field names are identical across both paths; only the meaning of `similarity_score` changes.",
  method: "get",
  parameterExamples: {
    bookmark_id: {
      "no-matches": {
        description:
          "Send `?bookmark_id=999999` — returns an empty array when no candidate scores ≥ 5.",
        summary: "Bookmark with no strong matches",
        value: "999999",
      },
      "typical-match": {
        description: "Send `?bookmark_id=1234` to list bookmarks similar to bookmark 1234.",
        summary: "Typical source bookmark",
        value: "1234",
      },
    },
  },
  path: "/v2/bookmark/fetch-similar",
  response400Examples: {
    "invalid-bookmark-id-type": {
      description: "Send `?bookmark_id=abc` — returns 400.",
      summary: "Invalid bookmark_id type",
      value: {
        error: "Invalid input: expected number, received nan",
      } as const,
    },
    "missing-bookmark-id": {
      description: "Omit `bookmark_id` — returns 400.",
      summary: "Missing bookmark_id",
      value: {
        error: "Invalid input: expected number, received nan",
      } as const,
    },
  },
  responseExamples: {
    "empty-result": {
      description: "Source has no candidates above the threshold — empty array.",
      summary: "No similar bookmarks",
      value: [] as const,
    },
    "with-matches": {
      description: "Ranked similar bookmarks with `similarity_score` attached.",
      summary: "Similar bookmarks",
      value: [
        {
          addedCategories: [],
          addedTags: [{ id: 42, name: "books" }],
          description: "A pink book cover from the library.",
          enriched_at: "2026-03-01 12:00:00+00:00",
          enrichment_status: "completed",
          id: 5678,
          inserted_at: "2026-03-01 11:00:00+00:00",
          make_discoverable: null,
          meta_data: null,
          ogImage: "https://example.com/og.jpg",
          screenshot: null,
          similarity_score: 11,
          sort_index: null,
          title: "Another pink book",
          trash: null,
          type: "bookmark",
          url: "https://example.com/pink-book",
          user_id: "00000000-0000-0000-0000-000000000000",
        },
      ] as const,
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Fetch similar bookmarks for a source bookmark",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
