import { type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { type z } from "zod";

import {
	IphoneShareErrorPayloadSchema,
	IphoneShareErrorResponseSchema,
} from "./schema";
import { type HandlerConfig } from "@/lib/api-helpers/create-handler";
import { apiError, apiSuccess, parseBody } from "@/lib/api-helpers/response";
import { requireAuth } from "@/lib/supabase/api";

const ROUTE = "iphone-share-error";

export type IphoneShareErrorPayload = z.infer<
	typeof IphoneShareErrorPayloadSchema
>;

export type IphoneShareErrorResponse = z.infer<
	typeof IphoneShareErrorResponseSchema
>;

async function handlePost(request: NextRequest) {
	try {
		const auth = await requireAuth(ROUTE);
		if (auth.errorResponse) {
			return auth.errorResponse;
		}

		const body = await parseBody({
			request,
			schema: IphoneShareErrorPayloadSchema,
			route: ROUTE,
		});
		if (body.errorResponse) {
			return body.errorResponse;
		}

		const { user } = auth;
		const { message, stackTrace, deviceInfo, context } = body.data;
		const userId = user.id;

		console.log(`[${ROUTE}] Error received:`, {
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

		console.log(`[${ROUTE}] Error sent to Sentry:`, {
			sentryEventId,
			userId,
		});

		return apiSuccess({
			route: ROUTE,
			data: { sentryEventId },
			schema: IphoneShareErrorResponseSchema,
		});
	} catch (error) {
		return apiError({
			route: ROUTE,
			message: "An unexpected error occurred",
			error,
			operation: "iphone_share_error_unexpected",
		});
	}
}

export const POST = Object.assign(handlePost, {
	config: {
		factoryName: "createPostApiHandlerWithAuth",
		inputSchema: IphoneShareErrorPayloadSchema,
		outputSchema: IphoneShareErrorResponseSchema,
		route: ROUTE,
	} satisfies HandlerConfig,
});
