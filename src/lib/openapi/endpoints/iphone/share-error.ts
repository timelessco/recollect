/**
 * @module Build-time only
 */
import {
	IphoneShareErrorPayloadSchema,
	IphoneShareErrorResponseSchema,
} from "@/app/api/iphone-share-error/schema";
import { bearerAuth, registry } from "@/lib/openapi/registry";
import { apiResponseSchema } from "@/lib/openapi/schemas/envelope";

export function registerIphoneShareError() {
	registry.registerPath({
		method: "post",
		path: "/iphone-share-error",
		tags: ["iPhone"],
		summary: "Report iOS share extension error",
		description:
			"Reports an error that occurred in the iOS share extension to Sentry. Accepts error message, optional stack trace, device info, and context. Returns the Sentry event ID for tracking.",
		security: [{ [bearerAuth.name]: [] }, {}],
		request: {
			body: {
				required: true,
				content: {
					"application/json": {
						schema: IphoneShareErrorPayloadSchema,
						example: {
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
					},
				},
			},
		},
		responses: {
			200: {
				description: "Error reported to Sentry successfully",
				content: {
					"application/json": {
						schema: apiResponseSchema(IphoneShareErrorResponseSchema),
						example: {
							data: { sentryEventId: "f71f786c790b4c7fae232923dc709cf8" },
							error: null,
						},
					},
				},
			},
			400: { description: "Invalid error report payload" },
			401: { $ref: "#/components/responses/Unauthorized" },
			500: { $ref: "#/components/responses/InternalError" },
		},
	});
}
