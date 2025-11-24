import { type NextApiRequest, type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { R2_MAIN_BUCKET_NAME } from "../../../../../utils/constants";
import { r2Helpers } from "../../../../../utils/r2Client";
import { apiSupabaseClient } from "../../../../../utils/supabaseServerClient";

/**
 * Schema for validating query parameters
 * Validates query parameters with:
 * - contentType: MIME type of the file to be uploaded (e.g., 'image/jpeg', 'application/pdf')
 * - filePath: The full path where the file will be stored in R2 (e.g., 'users/123/avatar.jpg')
 */
const getQuerySchema = () =>
	z.object({
		contentType: z.string(),
		filePath: z.string(),
	});

/**
 * API endpoint to generate a signed URL for uploading files to R2
 * GET /api/v1/bucket/get/signed-url
 * Requires authentication
 * Query parameters: contentType (MIME type of the file), filePath (target path in R2 bucket)
 * @param request - Next.js API request object
 * @param response - Next.js API response object
 * @returns Response object with signed URL or error
 * @example
 * // Success Response
 * {
 *   data: { signedUrl: "https://..." },
 *   error: null
 * }
 *
 * // Error Response
 * {
 *   data: null,
 *   error: "Error message"
 * }
 */
export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse<{
		data: { signedUrl: string } | null;
		error: string | null;
	}>,
) {
	// Only allow GET requests
	if (request.method !== "GET") {
		response
			.status(405)
			.json({ error: "Only GET requests allowed", data: null });
		return;
	}

	try {
		// Authenticate user using Supabase session
		const supabase = apiSupabaseClient(request, response);

		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser();

		if (userError || !user) {
			console.warn("User authentication failed:", { error: userError });
			response.status(401).json({ error: "Unauthorized", data: null });
			return;
		}

		// Validate the query parameters against our schema
		const validatedQuery = getQuerySchema().safeParse(request.query);

		if (!validatedQuery.success) {
			console.warn("Invalid request parameters:", {
				errors: validatedQuery.error.message,
			});
			response.status(400).json({
				error: "Invalid request parameters",
				data: null,
			});
			return;
		}

		const { filePath } = validatedQuery.data;

		// Entry point log
		console.log("get-signed-url API called:", { userId: user.id, filePath });

		// Generate a signed URL for file upload
		// The URL will expire in 1 hour (3600 seconds)
		const result = await r2Helpers.createSignedUploadUrl(
			R2_MAIN_BUCKET_NAME,
			filePath,
			3_600,
		);

		// Handle errors from R2 URL generation
		if (result.error) {
			console.error("Failed to generate signed URL:", result.error);
			Sentry.captureException(result.error, {
				tags: {
					operation: "generate_signed_url",
					userId: user.id,
				},
				extra: { filePath },
			});
			response.status(500).json({
				error: "Failed to generate signed URL",
				data: null,
			});
			return;
		}

		// Success
		console.log("Signed URL generated successfully:", {
			userId: user.id,
			filePath,
		});
		response.status(200).json({
			data: result.data,
			error: null,
		});
	} catch (error) {
		console.error("Unexpected error in get-signed-url:", error);
		Sentry.captureException(error, {
			tags: {
				operation: "get_signed_url_unexpected",
			},
		});
		response.status(500).json({
			error: "An unexpected error occurred",
			data: null,
		});
	}
}
