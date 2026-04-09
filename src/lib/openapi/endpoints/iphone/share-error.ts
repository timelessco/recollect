/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const iphoneShareErrorSupplement = {
  additionalResponses: {
    400: { description: "Invalid error report payload" },
  },
  description:
    "Reports an error that occurred in the iOS share extension to Sentry. Accepts error message, optional stack trace, device info, and context. Returns the Sentry event ID for tracking.",
  method: "post",
  path: "/iphone-share-error",
  requestExample: {
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
    stackTrace: "Error: Network timeout\n at URLSession.swift:45\n at BookmarkService.swift:102",
  },
  responseExample: {
    data: { sentryEventId: "f71f786c790b4c7fae232923dc709cf8" },
    error: null,
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Report iOS share extension error",
  tags: ["iPhone"],
} satisfies EndpointSupplement;
