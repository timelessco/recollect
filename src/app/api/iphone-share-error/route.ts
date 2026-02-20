import { type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { type z } from "zod";

import {
	IphoneShareErrorPayloadSchema,
	IphoneShareErrorResponseSchema,
} from "./schema";
import { apiError, apiSuccess, parseBody } from "@/lib/api-helpers/response";
import { requireAuth } from "@/lib/supabase/api";

const ROUTE = "iphone-share-error";

export type IphoneShareErrorPayload = z.infer<
	typeof IphoneShareErrorPayloadSchema
>;

export type IphoneShareErrorResponse = z.infer<
	typeof IphoneShareErrorResponseSchema
>;

export async function POST(request: NextRequest) {
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

/**
 * =============================================================================
 * API DOCUMENTATION: iPhone Share Intent Error Reporting
 * =============================================================================
 *
 * ENDPOINT
 * --------
 * POST /api/iphone-share-error
 *
 * AUTHENTICATION
 * --------------
 * Requires Bearer token (Supabase JWT) in Authorization header
 *
 * HEADERS
 * -------
 * Authorization: Bearer <JWT_TOKEN>
 * Content-Type: application/json
 *
 * REQUEST BODY SCHEMA
 * -------------------
 * {
 *   "message": "string (required)",     // Error message
 *   "stackTrace": "string (optional)",  // Full stack trace
 *   "deviceInfo": {
 *     "model": "string (optional)",      // e.g., "iPhone 15 Pro"
 *     "osVersion": "string (optional)",  // e.g., "iOS 17.2"
 *     "appVersion": "string (optional)"  // e.g., "1.0.0"
 *   },
 *   "context": {
 *     "screen": "string (optional)",     // e.g., "ShareExtension"
 *     "action": "string (optional)"      // e.g., "shareBookmark"
 *   }
 * }
 *
 * SUCCESS RESPONSE (200 OK)
 * -------------------------
 * {
 *   "data": { "sentryEventId": "f71f786c790b4c7fae232923dc709cf8" },
 *   "error": null
 * }
 *
 * ERROR RESPONSES
 * ---------------
 * 401 Unauthorized:
 * {
 *   "data": null,
 *   "error": { "name": "UnauthorizedError", "message": "Authentication required" }
 * }
 *
 * 400 Bad Request:
 * {
 *   "data": null,
 *   "error": { "name": "BadRequestError", "message": "Error message is required" }
 * }
 *
 * EXAMPLE CURL COMMAND
 * --------------------
 * curl -X POST https://app.recollect.so/api/iphone-share-error \
 *   -H "Content-Type: application/json" \
 *   -H "Authorization: Bearer YOUR_JWT_TOKEN" \
 *   -d '{
 *     "message": "Network request failed",
 *     "stackTrace": "Error: Network timeout\n  at URLSession.swift:45",
 *     "deviceInfo": {
 *       "model": "iPhone 15 Pro",
 *       "osVersion": "iOS 17.2",
 *       "appVersion": "1.0.0"
 *     },
 *     "context": {
 *       "screen": "ShareExtension",
 *       "action": "shareBookmark"
 *     }
 *   }'
 *
 * FIELD DESCRIPTIONS
 * ------------------
 * message        (required): Error message describing what went wrong
 * stackTrace     (optional): Full stack trace from the error
 * deviceInfo     (optional): Device information object
 *   - model      (optional): Device model name
 *   - osVersion  (optional): iOS/iPadOS version
 *   - appVersion (optional): App version from Info.plist
 * context        (optional): Context about where error occurred
 *   - screen     (optional): Screen/view name where error happened
 *   - action     (optional): Action being performed when error occurred
 *
 * COMMON CONTEXT VALUES
 * ---------------------
 * Screens: ShareExtension, BookmarkEditor, CategorySelector
 * Actions: shareBookmark, uploadImage, fetchMetadata, saveToCategory
 *
 * NOTES
 * -----
 * - All errors are sent to Sentry with user attribution
 * - Sentry event ID is returned on success for tracking
 * - Token must be valid Supabase JWT from authenticated user
 * - RLS policies are enforced based on the authenticated user
 *
 * =============================================================================
 */
