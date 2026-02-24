import * as Sentry from "@sentry/nextjs";

import {
	IphoneShareErrorPayloadSchema,
	IphoneShareErrorResponseSchema,
} from "./schema";
import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";

const ROUTE = "iphone-share-error";

export const POST = createPostApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: IphoneShareErrorPayloadSchema,
	outputSchema: IphoneShareErrorResponseSchema,
	handler: async ({ data, user, route }) => {
		const { message, stackTrace, deviceInfo, context } = data;
		const userId = user.id;

		console.log(`[${route}] Error received:`, {
			userId,
			message,
			hasStackTrace: Boolean(stackTrace),
			deviceModel: deviceInfo?.model,
		});

		const errorToCapture = new Error(message);
		if (stackTrace) {
			errorToCapture.stack = stackTrace;
		}

		const sentryEventId = Sentry.captureException(errorToCapture, {
			tags: {
				operation: "iphone_share_intent_error",
				userId,
				device_model: deviceInfo?.model,
				os_version: deviceInfo?.osVersion,
			},
			extra: {
				appVersion: deviceInfo?.appVersion,
				screen: context?.screen,
				action: context?.action,
			},
		});

		console.log(`[${route}] Error sent to Sentry:`, {
			sentryEventId,
			userId,
		});

		return { sentryEventId };
	},
});
