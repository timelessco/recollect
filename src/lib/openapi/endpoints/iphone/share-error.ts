/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";
import { bearerAuth } from "@/lib/openapi/registry";

export const iphoneShareErrorSupplement = {
	path: "/iphone-share-error",
	method: "post",
	tags: ["iPhone"],
	summary: "Report iOS share extension error",
	description:
		"Reports an error that occurred in the iOS share extension to Sentry. Accepts error message, optional stack trace, device info, and context. Returns the Sentry event ID for tracking.",
	security: [{ [bearerAuth.name]: [] }, {}],
	requestExample: {
		message: "Network request failed while saving bookmark",
		stackTrace:
			"Error: Network timeout\n at URLSession.swift:45\n at BookmarkService.swift:102",
		deviceInfo: {
			model: "iPhone 15 Pro",
			osVersion: "iOS 17.2",
			appVersion: "1.0.0",
		},
		context: {
			screen: "ShareExtension",
			action: "shareBookmark",
		},
	},
	responseExample: {
		data: { sentryEventId: "f71f786c790b4c7fae232923dc709cf8" },
		error: null,
	},
	additionalResponses: {
		400: { description: "Invalid error report payload" },
	},
} satisfies EndpointSupplement;
