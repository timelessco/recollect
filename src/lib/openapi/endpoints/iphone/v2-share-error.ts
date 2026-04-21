/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const v2IphoneShareErrorSupplement = {
  additionalResponses: {
    400: { description: "Invalid error report payload (missing or empty `message`)" },
    401: { description: "Not authenticated" },
  },
  description:
    "Forwards an error that occurred in the iOS share extension to Sentry and returns the Sentry event ID for correlation. Accepts the error message plus optional stack trace, device info, and UX context. The capture is synchronous so the caller can surface the event ID to the user or include it in a support ticket.",
  method: "post",
  path: "/v2/iphone-share-error",
  requestExamples: {
    "happy-path": {
      description:
        "Send the shown body — returns a Sentry event ID once the exception is captured.",
      summary: "Report iOS share extension error",
      value: {
        context: {
          action: "shareBookmark",
          screen: "ShareExtension",
        },
        deviceInfo: {
          appVersion: "1.0.0",
          model: "iPhone 15 Pro",
          osVersion: "iOS 17.2",
        },
        message: "Network request failed while saving bookmark",
        stackTrace:
          "Error: Network timeout\n at URLSession.swift:45\n at BookmarkService.swift:102",
      },
    },
    "message-only": {
      description: "Send only `message` — other fields are optional.",
      summary: "Minimal error report",
      value: { message: "Unexpected nil in share payload" },
    },
  },
  response400Examples: {
    "missing-message": {
      description: "Send `{}` — returns 400 because `message` is required.",
      summary: "Missing message",
      value: { error: "Error message is required" },
    },
    "empty-message": {
      description: 'Send `{ message: "" }` — returns 400 because `message` must not be empty.',
      summary: "Empty message",
      value: { error: "Error message cannot be empty" },
    },
  },
  responseExamples: {
    captured: {
      description: "Exception captured in Sentry; use the returned event ID for correlation.",
      summary: "Sentry event ID returned",
      value: { sentryEventId: "f71f786c790b4c7fae232923dc709cf8" },
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Report iOS share extension error (v2)",
  tags: ["iPhone"],
} satisfies EndpointSupplement;
