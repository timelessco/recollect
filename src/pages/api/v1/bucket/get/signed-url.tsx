import { type NextApiRequest, type NextApiResponse } from "next";
import { z } from "zod";

import { R2_MAIN_BUCKET_NAME } from "../../../../../utils/constants";
import { r2Helpers } from "../../../../../utils/r2Client";
import { apiSupabaseClient } from "../../../../../utils/supabaseServerClient";

/**
 * Schema for validating query parameters
 * @param contentType - MIME type of the file to be uploaded (e.g., 'image/jpeg', 'application/pdf')
 * @param filePath - The full path where the file will be stored in R2 (e.g., 'users/123/avatar.jpg')
 */
const getQuerySchema = () =>
	z.object({
		contentType: z.string(),
		filePath: z.string(),
	});

/**
 * API endpoint to generate a signed URL for uploading files to R2
 *
 * @route GET /api/v1/bucket/get/signed-url
 * @security Requires authentication
 * @param {string} contentType - MIME type of the file
 * @param {string} filePath - Target path in R2 bucket
 * @returns {Object} Response object
 * @returns {Object} Response.data - Contains the signed URL if successful
 * @returns {string} Response.error - Error message if request fails
 *
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
			data: { session },
			error: authError,
		} = await supabase.auth.getSession();

		if (authError || !session) {
			response.status(401).json({
				error: "Unauthorized - Please login to access this endpoint",
				data: null,
			});
			return;
		}

		// Validate the query parameters against our schema
		const validatedQuery = getQuerySchema().safeParse(request.query);

		if (!validatedQuery.success) {
			response.status(400).json({
				error: "Invalid request parameters",
				data: null,
			});
			return;
		}

		const { filePath } = validatedQuery.data;

		// Generate a signed URL for file upload
		// The URL will expire in 1 hour (3600 seconds)
		const result = await r2Helpers.createSignedUploadUrl(
			R2_MAIN_BUCKET_NAME,
			filePath,
			3_600,
		);

		// Handle errors from R2 URL generation
		if (result.error) {
			response.status(500).json({
				error: "Failed to generate signed URL",
				data: null,
			});
			return;
		}

		// Return the successful response with the signed URL
		response.status(200).json({
			data: result.data,
			error: null,
		});
		return;
	} catch {
		// Handle any unexpected errors
		response.status(500).json({
			error: "Internal server error",
			data: null,
		});
	}
}
