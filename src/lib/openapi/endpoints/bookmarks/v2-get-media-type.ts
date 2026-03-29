/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

export const v2GetMediaTypeSupplement = {
  description:
    "Sends a HEAD request to the given URL and returns its `Content-Type` header. Includes CORS headers so it can be called from browser extensions. 5-second timeout. Public endpoint (no auth required).",
  method: "get",
  parameterExamples: {
    url: {
      "html-page": {
        description: "Returns text/html content type.",
        summary: "HTML web page",
        value: "https://example.com",
      },
      "pdf-document": {
        description: "Returns application/pdf content type.",
        summary: "PDF document URL",
        value: "https://example.com/document.pdf",
      },
    },
  },
  path: "/v2/bookmarks/get/get-media-type",
  responseExamples: {
    "html-page": {
      description: "URL resolved to a standard web page.",
      summary: "Successful HTML page",
      value: {
        error: null,
        mediaType: "text/html; charset=utf-8",
        success: true,
      },
    },
    "pdf-document": {
      description: "URL resolved to a PDF file.",
      summary: "Successful PDF document",
      value: {
        error: null,
        mediaType: "application/pdf",
        success: true,
      },
    },
    "unreachable-url": {
      description: "HEAD request failed or timed out.",
      summary: "Unreachable URL",
      value: {
        error: "Failed to check media type",
        mediaType: null,
        success: false,
      },
    },
  },
  security: [],
  summary: "Check the media type (Content-Type) of a URL via HEAD request",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
