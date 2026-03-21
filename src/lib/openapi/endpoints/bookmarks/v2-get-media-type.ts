/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";

export const v2GetMediaTypeSupplement = {
  path: "/v2/bookmarks/get/get-media-type",
  method: "get",
  tags: ["Bookmarks"],
  summary: "Check the media type (Content-Type) of a URL via HEAD request",
  description:
    "Sends a HEAD request to the given URL and returns its `Content-Type` header. Includes CORS headers so it can be called from browser extensions. 5-second timeout. Public endpoint (no auth required).",
  security: [],
  responseExamples: {
    "html-page": {
      summary: "Successful HTML page",
      description: "URL resolved to a standard web page.",
      value: {
        data: {
          success: true,
          mediaType: "text/html; charset=utf-8",
          error: null,
        },
        error: null,
      },
    },
    "pdf-document": {
      summary: "Successful PDF document",
      description: "URL resolved to a PDF file.",
      value: {
        data: {
          success: true,
          mediaType: "application/pdf",
          error: null,
        },
        error: null,
      },
    },
    "unreachable-url": {
      summary: "Unreachable URL",
      description: "HEAD request failed or timed out.",
      value: {
        data: {
          success: false,
          mediaType: null,
          error: "Failed to check media type",
        },
        error: null,
      },
    },
  },
  parameterExamples: {
    url: {
      "html-page": {
        summary: "HTML web page",
        description: "Returns text/html content type.",
        value: "https://example.com",
      },
      "pdf-document": {
        summary: "PDF document URL",
        description: "Returns application/pdf content type.",
        value: "https://example.com/document.pdf",
      },
    },
  },
} satisfies EndpointSupplement;
