import { type NextApiRequest, type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import {
	IMAGE_DOWNLOAD_TIMEOUT_MS,
	MAIN_TABLE_NAME,
} from "../../../utils/constants";
import {
	enrichMetadata,
	validateInstagramMediaUrl,
	validateTwitterMediaUrl,
} from "../../../utils/helpers.server";
import { createServiceClient } from "../../../utils/supabaseClient";
import { upload } from "../bookmark/add-remaining-bookmark-data";

const requestBodySchema = z.object({
	id: z.number(),
	ogImage: z.url({ message: "ogImage must be a valid URL" }),
	user_id: z.uuid({ message: "user_id must be a valid UUID" }),
	url: z.url({ message: "url must be a valid URL" }),
	isRaindropBookmark: z.boolean().optional().default(false),
	isTwitterBookmark: z.boolean().optional().default(false),
	isInstagramBookmark: z.boolean().optional().default(false),
	message: z.object({
		msg_id: z.number(),
		message: z.object({
			meta_data: z.object({
				twitter_avatar_url: z.string().optional(),
				instagram_username: z.string().max(30).optional(),
				instagram_profile_pic: z.string().nullable().optional(),
				favIcon: z.string(),
				video_url: z.string().nullable().optional(),
				saved_collection_names: z
					.array(z.string().max(255))
					.max(100)
					.optional(),
			}),
		}),
	}),
	queue_name: z.string().min(1, { message: "queue_name is required" }),
});

const ROUTE = "ai-enrichment";

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse,
) {
	if (request.method !== "POST") {
		console.warn(`[${ROUTE}] Method not allowed:`, { method: request.method });
		response.status(405).json({ error: "Method not allowed" });
		return;
	}

	try {
		const parseResult = requestBodySchema.safeParse(request.body);

		if (!parseResult.success) {
			console.warn(`[${ROUTE}] Validation error:`, parseResult.error.issues);
			response.status(400).json({
				error: "Validation failed",
			});
			return;
		}

		const {
			id,
			ogImage: ogImageUrl,
			user_id,
			url,
			isRaindropBookmark,
			isTwitterBookmark,
			isInstagramBookmark,
			message,
			queue_name,
		} = parseResult.data;

		if (isTwitterBookmark) {
			try {
				// Validate ogImage URL
				validateTwitterMediaUrl(ogImageUrl);
				console.log(`[${ROUTE}] ogImage URL validated:`, { ogImageUrl });

				// Validate video URL if present
				if (message.message.meta_data?.video_url) {
					validateTwitterMediaUrl(message.message.meta_data.video_url);
					console.log(`[${ROUTE}] Video URL validated`);
				}
			} catch (validationError) {
				console.error(`[${ROUTE}] URL validation failed:`, {
					error: validationError,
					ogImageUrl,
					videoUrl: message.message.meta_data?.video_url,
				});
				Sentry.captureException(validationError, {
					tags: {
						operation: "url_validation_failed",
						userId: user_id,
					},
					extra: {
						bookmarkId: id,
						url,
						ogImageUrl,
						videoUrl: message.message.meta_data?.video_url,
					},
				});
				response.status(400).json({
					error:
						validationError instanceof Error
							? validationError.message
							: "URL validation failed",
				});
				return;
			}
		}

		if (isInstagramBookmark) {
			try {
				// Validate ogImage URL
				validateInstagramMediaUrl(ogImageUrl);
				console.log(`[${ROUTE}] Instagram ogImage URL validated:`, {
					ogImageUrl,
				});

				// Validate video URL if present
				if (message.message.meta_data?.video_url) {
					validateInstagramMediaUrl(message.message.meta_data.video_url);
					console.log(`[${ROUTE}] Instagram video URL validated`);
				}
			} catch (validationError) {
				console.error(`[${ROUTE}] Instagram URL validation failed:`, {
					error: validationError,
					ogImageUrl,
					videoUrl: message.message.meta_data?.video_url,
				});
				Sentry.captureException(validationError, {
					tags: {
						operation: "instagram_url_validation_failed",
						userId: user_id,
					},
					extra: {
						bookmarkId: id,
						url,
						ogImageUrl,
						videoUrl: message.message.meta_data?.video_url,
					},
				});
				response.status(400).json({
					error:
						validationError instanceof Error
							? validationError.message
							: "Instagram URL validation failed",
				});
				return;
			}
		}

		console.log(`[${ROUTE}] API called:`, {
			bookmarkId: id,
			userId: user_id,
			url,
			isRaindropBookmark,
			isTwitterBookmark,
			queueName: queue_name,
			messageId: message.msg_id,
			isInstagramBookmark,
		});

		const supabase = createServiceClient();
		let ogImage = ogImageUrl;

		// If from Raindrop bookmark — upload ogImage into R2
		if (isRaindropBookmark || isInstagramBookmark) {
			console.log(
				`[${ROUTE}] Uploading ${isRaindropBookmark ? "Raindrop" : "Instagram"} image to R2:`,
				{ url },
			);
			try {
				const imageResponse = await fetch(ogImage, {
					headers: {
						"User-Agent": "Mozilla/5.0",
						Accept: "image/*,*/*;q=0.8",
					},
					signal: AbortSignal.timeout(IMAGE_DOWNLOAD_TIMEOUT_MS),
				});

				if (!imageResponse.ok) {
					throw new Error(`HTTP error! status: ${imageResponse.status}`);
				}

				const arrayBuffer = await imageResponse.arrayBuffer();
				const returnedB64 = Buffer.from(arrayBuffer).toString("base64");
				ogImage = (await upload(returnedB64, user_id, null)) || ogImageUrl;

				console.log(
					`[${ROUTE}] ${isRaindropBookmark ? "Raindrop" : "Instagram"} image uploaded successfully`,
				);
			} catch (error) {
				console.error(
					`[${ROUTE}] Error downloading ${isRaindropBookmark ? "Raindrop" : "Instagram"} image:`,
					error,
				);
				Sentry.captureException(error, {
					tags: {
						operation: isRaindropBookmark
							? "raindrop_image_upload"
							: isInstagramBookmark
								? "instagram_image_upload"
								: "raindrop_instagram_image_upload",
						userId: user_id,
					},
					extra: {
						bookmarkId: id,
						url,
						ogImageUrl,
					},
				});
			}
		}

		console.log(`[${ROUTE}] Starting metadata enrichment:`, { url });

		// Enrich metadata with AI-generated content
		const { metadata: newMeta, isFailed } = await enrichMetadata({
			existingMetadata: message.message.meta_data,
			ogImage,
			isTwitterBookmark,
			videoUrl: message.message.meta_data?.video_url,
			userId: user_id,
			supabase,
			url,
			isInstagramBookmark,
		});

		if (isFailed) {
			console.warn(`[${ROUTE}] Metadata enrichment partially failed:`, { url });
		} else {
			console.log(`[${ROUTE}] Metadata enrichment completed successfully:`, {
				url,
			});
		}

		// Update database with enriched data
		const { error: updateError } = await supabase
			.from(MAIN_TABLE_NAME)
			.update({ ogImage, meta_data: newMeta })
			.eq("id", id);

		if (updateError) {
			console.error(`[${ROUTE}] Error updating bookmark:`, updateError);
			Sentry.captureException(updateError, {
				tags: {
					operation: "update_bookmark_metadata",
					userId: user_id,
				},
				extra: {
					bookmarkId: id,
					url,
					ogImage,
				},
			});
			response.status(500).json({
				error: "Failed to update bookmark metadata",
			});
			return;
		}

		console.log(`[${ROUTE}] Bookmark updated successfully:`, { url });

		// Delete message from queue on success
		if (!isFailed) {
			const { error: deleteError } = await supabase
				.schema("pgmq_public")
				.rpc("delete", {
					queue_name,
					message_id: message.msg_id,
				});

			if (deleteError) {
				console.error(`[${ROUTE}] Error deleting message from queue:`, {
					error: deleteError,
					messageId: message.msg_id,
					queueName: queue_name,
				});
				Sentry.captureException(deleteError, {
					tags: {
						operation: "delete_queue_message",
						userId: user_id,
					},
					extra: {
						bookmarkId: id,
						queueName: queue_name,
						messageId: message.msg_id,
						url,
					},
				});
			} else {
				console.log(`[${ROUTE}] Queue message deleted:`, {
					messageId: message.msg_id,
				});
			}
		} else {
			console.warn(`[${ROUTE}] Keeping message in queue due to failures:`, {
				messageId: message.msg_id,
				url,
			});
		}

		console.log(`[${ROUTE}] Request completed:`, {
			url,
			success: true,
			isFailed,
		});

		response.status(200).json({
			success: true,
			isFailed,
			ogImage,
			meta_data: newMeta,
		});
	} catch (error) {
		console.error(`[${ROUTE}] Unexpected error:`, error);
		Sentry.captureException(error, {
			tags: {
				operation: "ai_enrichment_unexpected",
			},
			extra: {
				bookmarkId: request.body?.id,
				url: request.body?.url,
				userId: request.body?.user_id,
			},
		});
		response.status(500).json({
			error: "An unexpected error occurred",
		});
	}
}
