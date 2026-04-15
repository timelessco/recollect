/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

export const v2FetchPublicBookmarkByIdSupplement = {
  additionalResponses: {
    400: { description: "Invalid query parameters" },
    403: { description: "Category is not public" },
    404: { description: "Category or bookmark not found" },
    503: { description: "Upstream Supabase error" },
  },
  description:
    "Fetches a single bookmark by ID, verifying it belongs to a public category owned by the given username. No authentication required. Returns 404 if the category doesn't exist, the username doesn't match, or the bookmark isn't in the specified category. Returns 403 if the category is private. Returns the bookmark row directly (no envelope).",
  method: "get",
  parameterExamples: {
    bookmark_id: {
      "happy-path": {
        description:
          "Send `42` — returns the bookmark row if the public category exists and contains this bookmark",
        summary: "Valid bookmark ID",
        value: 42,
      },
    },
    category_slug: {
      "category-not-found": {
        description: "Send `zzz-nonexistent-slug-xyz` — returns 404 `Category not found`",
        summary: "Nonexistent slug",
        value: "zzz-nonexistent-slug-xyz",
      },
      "happy-path": {
        description: "Send `tweets-abc123` — a URL-safe slug of a public category",
        summary: "Valid public category slug",
        value: "tweets-abc123",
      },
    },
    user_name: {
      "happy-path": {
        description: "Send `johndoe` — the username that owns the public category",
        summary: "Owner username",
        value: "johndoe",
      },
      "username-mismatch": {
        description: "Send `nobody-wrong` with a valid slug — returns 404 `Username mismatch`",
        summary: "Wrong username",
        value: "nobody-wrong",
      },
    },
  },
  path: "/v2/bookmark/fetch-public-bookmark-by-id",
  response400Examples: {
    "invalid-slug-format": {
      description:
        "Send `category_slug=bad slug with spaces!` — returns 400: `Invalid category slug format`",
      summary: "Invalid category slug",
      value: { error: "Invalid category slug format" },
    },
    "missing-bookmark-id": {
      description:
        "Omit `bookmark_id` — returns 400: `Invalid input: expected number, received NaN`",
      summary: "Missing bookmark_id",
      value: { error: "Invalid input: expected number, received NaN" },
    },
    "non-positive-bookmark-id": {
      description: "Send `bookmark_id=-5` — returns 400: `Too small: expected number to be >0`",
      summary: "Negative bookmark_id",
      value: { error: "Too small: expected number to be >0" },
    },
  },
  responseExamples: {
    "happy-path": {
      description:
        "Send the shown query params — returns the bookmark row directly (no envelope), with joined `user_id.user_name`",
      summary: "Public bookmark returned",
      value: {
        description: "ReUI updated their Data Grid component with better column resizing.",
        id: 42,
        inserted_at: "2026-03-30T13:03:54.934507+00:00",
        make_discoverable: "2026-03-30T13:05:27.208+00:00",
        meta_data: {
          coverImage: null,
          favIcon: "https://example.com/favicon.ico",
          height: 1782,
          iframeAllowed: false,
          isOgImagePreferred: false,
          isPageScreenshot: true,
          mediaType: null,
          // cspell:disable-next-line -- blurhash placeholder, opaque compact encoding
          ogImgBlurUrl: "U01VrS%MM{j?xvogj[ofIUa~xuofWCogt7j@",
          screenshot: "https://example.com/screenshot.jpg",
          width: 1794,
        },
        ogImage: "https://example.com/og.jpg",
        screenshot: null,
        title: "ReUI on X",
        trash: null,
        type: "bookmark",
        url: "https://x.com/reui_io/status/1234567890",
        user_id: {
          user_name: "johndoe",
        },
      },
    },
  },
  security: [],
  summary: "Get a public bookmark by ID and collection",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
