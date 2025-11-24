import { NextResponse, type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { createApiClient, getApiUser } from "@/lib/supabase/api";

const ErrorPayloadSchema = z.object({
	message: z.string().min(1, "Error message is required"),
	stackTrace: z.string().optional(),
	deviceInfo: z
		.object({
			model: z.string().optional(),
			osVersion: z.string().optional(),
			appVersion: z.string().optional(),
		})
		.optional(),
	context: z
		.object({
			screen: z.string().optional(),
			action: z.string().optional(),
		})
		.optional(),
});

type ErrorPayload = z.infer<typeof ErrorPayloadSchema>;

export async function POST(request: NextRequest) {
	try {
		// Create Supabase client with authorization support
		const { supabase, token } = await createApiClient();

		// Authenticate user (token is explicitly passed to getUser)
		const {
			data: { user },
			error: userError,
		} = await getApiUser(supabase, token);

		if (userError || !user) {
			console.warn("iPhone Share Intent error: User authentication failed", {
				error: userError,
			});
			return NextResponse.json(
				{ success: false, error: "Unauthorized: User authentication required" },
				{ status: 401 },
			);
		}

		// Parse and validate request body
		const body = await request.json();
		const parsed = ErrorPayloadSchema.safeParse(body);

		if (!parsed.success) {
			const errors = parsed.error.issues;
			console.warn("iPhone Share Intent error: Invalid payload", { errors });
			return NextResponse.json(
				{ success: false, error: "Invalid request body" },
				{ status: 400 },
			);
		}

		const errorData: ErrorPayload = parsed.data;
		const userId = user.id;

		console.log("iPhone Share Intent error received:", {
			userId,
			message: errorData.message,
			hasStackTrace: Boolean(errorData.stackTrace),
			deviceModel: errorData.deviceInfo?.model,
		});

		// Create error object for Sentry
		const errorToCapture = new Error(errorData.message);
		if (errorData.stackTrace) {
			errorToCapture.stack = errorData.stackTrace;
		}

		// Send to Sentry
		const sentryEventId = Sentry.captureException(errorToCapture, {
			tags: {
				operation: "iphone_share_intent_error",
				userId,
				device_model: errorData.deviceInfo?.model,
				os_version: errorData.deviceInfo?.osVersion,
			},
			extra: {
				appVersion: errorData.deviceInfo?.appVersion,
				screen: errorData.context?.screen,
				action: errorData.context?.action,
			},
		});

		console.log("iPhone Share Intent error sent to Sentry:", {
			sentryEventId,
			userId,
		});

		return NextResponse.json(
			{
				success: true,
				sentryEventId,
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("Unexpected error in iphone-share-error endpoint:", error);
		Sentry.captureException(error, {
			tags: {
				operation: "iphone_share_intent_error_unexpected",
			},
		});
		return NextResponse.json(
			{ success: false, error: "An unexpected error occurred" },
			{ status: 500 },
		);
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
 *   "success": true,
 *   "sentryEventId": "f71f786c790b4c7fae232923dc709cf8"
 * }
 *
 * ERROR RESPONSES
 * ---------------
 * 401 Unauthorized:
 * {
 *   "success": false,
 *   "error": "Unauthorized: User authentication required"
 * }
 *
 * 400 Bad Request:
 * {
 *   "success": false,
 *   "error": "Invalid request body"
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
