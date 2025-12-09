import { type NextApiResponse } from "next/dist/shared/lib/utils";
import * as Sentry from "@sentry/nextjs";
import { type PostgrestError } from "@supabase/supabase-js";
import { waitUntil } from "@vercel/functions";
import axios from "axios";
import { type VerifyErrors } from "jsonwebtoken";
import { isEmpty } from "lodash";

import {
	type ImgMetadataType,
	type NextApiRequest,
	type SingleListData,
	type UploadFileApiResponse,
} from "../../../../../types/apiTypes";
import {
	getBaseUrl,
	MAIN_TABLE_NAME,
	NEXT_API_URL,
	PDF_MIME_TYPE,
	PDF_SCREENSHOT_API,
	UPLOAD_FILE_APIS,
} from "../../../../../utils/constants";
import { getAxiosConfigWithAuth } from "../../../../../utils/helpers";
import { apiSupabaseClient } from "../../../../../utils/supabaseServerClient";
import { vet } from "../../../../../utils/try";

type BodyDataType = {
	category_id: string;
	name: string;
	thumbnailPath: string | null;
	type: string;
	uploadFileNamePath: string;
};

type ApiResponse = {
	data: Array<{ id: SingleListData["id"] }> | null;
	error: PostgrestError | VerifyErrors | string | null;
	success: boolean;
};

type MinDataApiResponse = {
	data: ApiResponse;
	status: number;
};

/**
 * Helper function to call the min-data API
 */
const callMinDataApi = async (
	bodyData: BodyDataType,
	request: NextApiRequest<BodyDataType>,
	userId: string,
): Promise<MinDataApiResponse> => {
	const apiUrl = `${getBaseUrl()}${NEXT_API_URL}${UPLOAD_FILE_APIS.MIN_DATA}`;

	const [minDataError, minDataResponse] = await vet(() =>
		axios.post(apiUrl, bodyData, getAxiosConfigWithAuth(request)),
	);

	if (minDataError) {
		console.error("Error calling min-data API:", {
			error: minDataError,
			apiUrl,
		});
		Sentry.captureException(minDataError, {
			tags: {
				operation: "call_file_min_data_api",
				userId,
			},
			extra: {
				apiUrl,
			},
		});
		return {
			status: 500,
			data: {
				error: "Failed to process file upload",
				success: false,
				data: null,
			},
		};
	}

	console.log("Min-data API called successfully:", {
		status: minDataResponse.status,
	});

	return {
		status: minDataResponse.status,
		data: minDataResponse.data,
	};
};

/**
 * /api/v1/file/upload/data:
 *   post:
 *     summary: Upload file
 *     description: Main endpoint to upload a file. Orchestrates min-data and remaining data processing.
 *     tags:
 *       - Files
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category_id
 *               - name
 *               - type
 *               - uploadFileNamePath
 *             properties:
 *               category_id:
 *                 type: string
 *                 description: Category ID to add file to
 *               name:
 *                 type: string
 *                 description: File name
 *               thumbnailPath:
 *                 type: string
 *                 nullable: true
 *                 description: Path to thumbnail (for videos)
 *               type:
 *                 type: string
 *                 description: MIME type of the file
 *               uploadFileNamePath:
 *                 type: string
 *                 description: Storage path for the uploaded file
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - User does not have permission for this category
 *       405:
 *         description: Method not allowed
 *       500:
 *         description: Internal server error
 */
export default async function handler(
	request: NextApiRequest<BodyDataType>,
	response: NextApiResponse<UploadFileApiResponse>,
) {
	try {
		// Validate request method
		if (request.method !== "POST") {
			response.status(405).send({
				error: "Only POST requests allowed",
				success: false,
			});
			return;
		}

		// Initialize Supabase client
		const supabase = apiSupabaseClient(request, response);

		// Authentication check
		const { data: userData, error: userError } = await supabase.auth.getUser();
		const userId = userData?.user?.id;

		if (userError || !userId) {
			console.warn("User authentication failed:", {
				error: userError?.message,
			});
			response.status(401).json({
				success: false,
				error: "Unauthorized",
			});
			return;
		}

		// Get request body data
		const bodyData = request.body;
		const fileType = bodyData?.type;
		const fileName = bodyData?.name;

		// Entry point log
		console.log("Upload file API called:", {
			userId,
			fileName,
			fileType,
			categoryId: bodyData.category_id,
		});

		// Call min-data API and forward the response
		const { status, data } = await callMinDataApi(bodyData, request, userId);

		// If min-data API failed, return error
		if (status !== 200 || !data?.data?.length) {
			console.error("Min-data API failed:", { status, error: data.error });
			response.status(status).json(data);
			return;
		}

		// Get file/bookmark ID from response
		const fileData = data.data[0];
		if (!fileData?.id) {
			console.error("No file ID returned from min-data API:", {
				userId,
				fileName,
			});
			response.status(500).json({
				error: "Failed to create file record",
				success: false,
			});
			return;
		}

		console.log("File created successfully:", { id: fileData.id });

		// Send response to client with the file data
		response.status(status).json(data);

		// Queue remaining data processing
		// Use waitUntil to ensure the background work completes even after response is sent
		// Skip for videos or empty data
		const isVideo = fileType?.includes("video");
		const shouldProcessRemaining = !isVideo && !isEmpty(data.data);

		if (!shouldProcessRemaining) {
			console.log("Skipping remaining data processing:", {
				fileType,
				isPdf: fileType === PDF_MIME_TYPE,
				isVideo,
				hasData: !isEmpty(data.data),
			});
			return;
		}

		// Queue the remaining work with waitUntil to ensure completion
		waitUntil(
			(async () => {
				try {
					// Fetch the file record to get publicUrl and mediaType
					const { data: fileRecord, error: fetchError } = await supabase
						.from(MAIN_TABLE_NAME)
						.select("url, meta_data")
						.eq("id", fileData.id)
						.single();

					if (fetchError || !fileRecord) {
						console.error(
							"Error fetching file record for remaining processing:",
							{
								error: fetchError,
								bookmarkId: fileData.id,
							},
						);
						Sentry.captureException(fetchError, {
							tags: {
								operation: "fetch_file_for_remaining",
								userId,
							},
							extra: {
								bookmarkId: fileData.id,
							},
						});
						return;
					}

					// For PDFs, generate a screenshot/thumbnail using the PDF screenshot API
					let queuePublicUrl = fileRecord.url;
					const isPdf = fileType === PDF_MIME_TYPE;

					if (isPdf && fileRecord.url) {
						console.log("Generating PDF screenshot:", {
							bookmarkId: fileData.id,
							pdfUrl: fileRecord.url,
						});

						const pdfApiUrl = `${process.env.RECOLLECT_SERVER_API}${PDF_SCREENSHOT_API}`;

						const [pdfScreenshotError, pdfScreenshotResponse] = await vet(() =>
							axios.post(
								pdfApiUrl,
								{
									url: fileRecord.url,
									userId,
								},
								{
									headers: {
										Authorization: `Bearer ${process.env.RECOLLECT_SERVER_API_KEY}`,
										"Content-Type": "application/json",
									},
									timeout: 30000,
								},
							),
						);

						if (pdfScreenshotError) {
							// Log error but continue with original URL - don't fail the entire operation
							let errorMessage = "Unknown error generating PDF screenshot";

							if (axios.isAxiosError(pdfScreenshotError)) {
								errorMessage =
									pdfScreenshotError.response?.data?.error ||
									pdfScreenshotError.response?.data?.message ||
									pdfScreenshotError.message ||
									"PDF screenshot service error";

								console.error("Error generating PDF screenshot:", {
									bookmarkId: fileData.id,
									status: pdfScreenshotError.response?.status,
									message: errorMessage,
									responseData: pdfScreenshotError.response?.data,
								});
							} else {
								errorMessage =
									pdfScreenshotError instanceof Error
										? pdfScreenshotError.message
										: errorMessage;
								console.error("Error generating PDF screenshot:", {
									bookmarkId: fileData.id,
									error: errorMessage,
								});
							}

							Sentry.captureException(pdfScreenshotError, {
								tags: {
									operation: "pdf_screenshot_for_queue",
									userId,
								},
								extra: {
									bookmarkId: fileData.id,
									pdfUrl: fileRecord.url,
									pdfApiUrl,
								},
							});
							// Continue with original URL as fallback
						} else if (pdfScreenshotResponse?.data?.publicUrl) {
							queuePublicUrl = pdfScreenshotResponse.data.publicUrl;
							console.log("PDF screenshot generated successfully:", {
								bookmarkId: fileData.id,
								screenshotUrl: queuePublicUrl,
							});
						} else {
							console.warn("PDF screenshot API returned no publicUrl:", {
								bookmarkId: fileData.id,
								responseData: pdfScreenshotResponse?.data,
							});
							// Continue with original URL as fallback
						}
					}

					const queuePayload = {
						id: fileData.id,
						publicUrl: queuePublicUrl,
						mediaType: (fileRecord.meta_data as ImgMetadataType)?.mediaType,
					};

					console.log("Queueing background job for remaining data:", {
						bookmarkId: fileData.id,
						publicUrl: fileRecord.url,
					});

					const queueResult = await supabase.schema("pgmq_public").rpc("send", {
						queue_name: "upload-file-queue",
						message: queuePayload,
					});

					if (queueResult.error) {
						console.error("Failed to queue background job:", {
							bookmarkId: fileData.id,
							error: queueResult.error,
						});
						Sentry.captureException(queueResult.error, {
							tags: {
								operation: "queue_file_remaining_data",
								userId,
							},
							extra: {
								bookmarkId: fileData.id,
							},
						});
					} else {
						console.log("Background job queued successfully:", {
							bookmarkId: fileData.id,
						});
					}
				} catch (error) {
					// Log error but don't fail the request since we already sent the response
					console.error("Error queuing background job:", error);
					Sentry.captureException(error, {
						tags: {
							operation: "queue_file_remaining_data_unexpected",
							userId,
						},
						extra: {
							bookmarkId: fileData.id,
						},
					});
				}
			})(),
		);
	} catch (error) {
		console.error("Unexpected error in upload file API:", error);
		Sentry.captureException(error, {
			tags: {
				operation: "upload_file_unexpected",
			},
		});
		response.status(500).json({
			success: false,
			error: "An unexpected error occurred",
		});
	}
}
