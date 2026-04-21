/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

const happyPathResponse = {
  addedCategories: [],
  addedTags: [],
  description: "Recollect is an open source url manager built using nextjs and supabase.",
  id: 12_624,
  inserted_at: "2026-01-07T06:58:38.236147+00:00",
  make_discoverable: "2026-01-07T06:58:42.687+00:00",
  meta_data: {
    coverImage: "https://media.example.com/bookmarks/cover.jpg",
    favIcon: "https://example.com/favicon.svg",
    height: 1500,
    iframeAllowed: false,
    img_caption: "Image caption extracted from the page.",
    isOgImagePreferred: false,
    isPageScreenshot: true,
    mediaType: "text/html; charset=utf-8",
    ocr: "Text extracted via OCR from the page image.",
    // cspell:disable-next-line -- blurhash placeholder, opaque compact encoding
    ogImgBlurUrl: "U02$T_xvi~%g_NjIt8kV?HkDozWB?IoyozVu",
    screenshot: "https://media.example.com/bookmarks/screenshot.jpg",
    width: 2400,
  },
  ogImage: "https://media.example.com/bookmarks/og.jpg",
  screenshot: null,
  sort_index: null,
  title: "GitHub - example/recollect: open source bookmark manager",
  trash: null,
  type: "bookmark",
  url: "https://github.com/example/recollect",
};

export const v2FetchDiscoverableByIdSupplement = {
  additionalResponses: {
    400: { description: "Missing or invalid id query parameter" },
    404: { description: "Bookmark not found or not discoverable" },
    503: { description: "Database error fetching bookmark, tags, or categories" },
  },
  description:
    "Fetches a single discoverable bookmark by ID, including its tags and categories via the junction tables. Public endpoint — no authentication required. Returns 404 when the bookmark does not exist, is trashed, or is not marked discoverable.",
  method: "get",
  path: "/v2/bookmark/fetch-discoverable-by-id",
  parameterExamples: {
    id: {
      "happy-path": {
        description:
          "Send `?id=12624` — returns the discoverable bookmark with its tags and categories.",
        summary: "Valid discoverable bookmark ID",
        value: 12_624,
      },
      "not-found": {
        description:
          "Send `?id=99999999` — returns 404 because the bookmark does not exist, is trashed, or is not discoverable.",
        summary: "Nonexistent bookmark ID",
        value: 99_999_999,
      },
      "invalid-non-numeric": {
        description: "Send `?id=abc` — returns 400: `expected number, received NaN`.",
        summary: "Non-numeric ID (validation error)",
        value: "abc",
      },
      "invalid-negative": {
        description: "Send `?id=-5` — returns 400: `Too small: expected number to be >0`.",
        summary: "Negative ID (validation error)",
        value: -5,
      },
    },
  },
  response400Examples: {
    "missing-id": {
      description: "Omit `id` entirely — returns 400: `expected number, received NaN`.",
      summary: "Missing id query parameter",
      value: { error: "Invalid input: expected number, received NaN" },
    },
    "non-numeric-id": {
      description: "Send `?id=abc` — returns 400 with the same NaN message.",
      summary: "Non-numeric id",
      value: { error: "Invalid input: expected number, received NaN" },
    },
    "negative-id": {
      description: "Send `?id=-5` — schema requires positive int.",
      summary: "Negative id",
      value: { error: "Too small: expected number to be >0" },
    },
  },
  responseExamples: {
    "happy-path": {
      description:
        "Send `?id=12624` — returns the bookmark, nullable columns (`screenshot`, `sort_index`, `trash`) stay `null`, empty junction tables come back as empty arrays.",
      summary: "Discoverable bookmark with empty relations",
      value: happyPathResponse,
    },
  },
  security: [],
  summary: "Get a single discoverable bookmark by ID",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
