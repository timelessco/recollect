import { type NextApiRequest, type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { sanitizeBookmarks } from "../../../../async/supabaseCrudHelpers";
import { deduplicateBookmarks } from "../../../../utils/raindrop-bookmark-helpers";
import { RAINDROP_IMPORTS_QUEUE } from "../../../../utils/constants";
import {
	processRaindropCategories,
	updateProfileCategoryOrder,
} from "../../../../utils/raindrop-import-helpers";
import { apiSupabaseClient } from "../../../../utils/supabaseServerClient";

const ROUTE = "raindrop-import";

const bookmarkSchema = z.object({
	title: z.string().nullable(),
	description: z.string().nullable(),
	url: z.string().url(),
	ogImage: z.string().nullable(),
	category_name: z.string().nullable(),
});

const requestBodySchema = z.object({
	bookmarks: z.array(bookmarkSchema).min(1, "No bookmarks found in request"),
});

const outputSchema = z.object({
	queued: z.number(),
	skipped: z.number(),
});

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse,
) {
	if (request.method !== "POST") {
		console.warn(`[${ROUTE}] Method not allowed:`, { method: request.method });
		response.status(405).json({ data: null, error: "Method not allowed" });
		return;
	}

	// Declare userId before try block so it's available in catch
	let userId: string | undefined;

	try {
		const parseResult = requestBodySchema.safeParse(request.body);

		if (!parseResult.success) {
			const firstError = parseResult.error.issues[0];
			const userMessage = firstError?.message || "Invalid request body";
			console.warn(`[${ROUTE}] Validation error:`, {
				errors: parseResult.error.issues,
			});
			response.status(400).json({
				data: null,
				error: userMessage,
			});
			return;
		}

		const supabase = apiSupabaseClient(request, response);

		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser();

		if (userError || !user) {
			console.warn(`[${ROUTE}] Auth error:`, { error: userError?.message });
			response.status(401).json({
				data: null,
				error: userError?.message || "Not authenticated",
			});
			return;
		}

		userId = user.id;
		console.log(`[${ROUTE}] API called:`, { userId });

		const { bookmarks } = parseResult.data;

		console.log(`[${ROUTE}] Bookmarks to import:`, {
			bookmarks: bookmarks.length,
		});

		// Process categories: fetch existing and insert new ones
		const { categoriesData, insertedCategories } =
			await processRaindropCategories({
				bookmarks,
				route: ROUTE,
				supabase,
				userId,
			});

		// Deduplicate bookmarks and filter out existing ones
		const { bookmarksToSanitize, duplicatesRemoved, existing } =
			await deduplicateBookmarks({
				bookmarks,
				categoriesData,
				route: ROUTE,
				supabase,
				userId,
			});

		// Early return if nothing to queue
		if (bookmarksToSanitize.length === 0) {
			console.log(`[${ROUTE}] No new bookmarks to queue:`, {
				totalBookmarks: bookmarks.length,
				duplicatesRemoved,
				existing,
				userId,
			});
			const output = {
				queued: 0,
				skipped: bookmarks.length,
			};
			const validated = outputSchema.safeParse(output);
			if (!validated.success) {
				throw new Error(
					`Output validation failed: ${JSON.stringify(validated.error.issues)}`,
				);
			}

			response.status(200).json({ data: validated.data, error: null });
			return;
		}

		// Sanitize bookmarks (favicon, ogImage validation, media type detection)
		const sanitizedBookmarks = await sanitizeBookmarks(
			bookmarksToSanitize,
			userId,
			categoriesData,
		);

		if (sanitizedBookmarks.length === 0) {
			console.log(`[${ROUTE}] No bookmarks after sanitization:`, {
				bookmarksToSanitize: bookmarksToSanitize.length,
				userId,
			});
			const output = {
				queued: 0,
				skipped: bookmarks.length,
			};
			const validated = outputSchema.safeParse(output);
			if (!validated.success) {
				throw new Error(
					`Output validation failed: ${JSON.stringify(validated.error.issues)}`,
				);
			}

			response.status(200).json({ data: validated.data, error: null });
			return;
		}

		// Build URL → category_name map from pre-sanitized bookmarks
		const urlToCategoryName = new Map<string, string | null>();
		for (const b of bookmarksToSanitize) {
			urlToCategoryName.set(b.url, b.category_name);
		}

		// Build queue messages from sanitized bookmarks
		const queueMessages = sanitizedBookmarks.map((bookmark) => ({
			url: bookmark.url,
			type: bookmark.type,
			title: bookmark.title,
			description: bookmark.description,
			ogImage: bookmark.ogImage,
			category_name: urlToCategoryName.get(bookmark.url) ?? null,
			meta_data: bookmark.meta_data,
			user_id: userId,
		}));

		// Enqueue bookmarks to raindrop_imports queue for async processing
		const { error: queueError } = await supabase
			.schema("pgmq_public")
			.rpc("send_batch", {
				queue_name: RAINDROP_IMPORTS_QUEUE,
				messages: queueMessages,
				sleep_seconds: 0,
			});

		if (queueError) {
			console.error(`[${ROUTE}] Error enqueuing bookmarks:`, {
				error: queueError,
				userId,
			});
			Sentry.captureException(queueError, {
				tags: {
					operation: "enqueue_raindrop_imports",
					userId,
				},
				extra: {
					messagesCount: queueMessages.length,
					queueName: RAINDROP_IMPORTS_QUEUE,
				},
			});
			throw new Error("Failed to enqueue bookmarks for processing");
		}

		// Update category order in profile
		await updateProfileCategoryOrder({
			insertedCategories,
			route: ROUTE,
			supabase,
			userId,
		});

		const output = {
			queued: sanitizedBookmarks.length,
			skipped: bookmarks.length - sanitizedBookmarks.length,
		};
		const validated = outputSchema.safeParse(output);
		if (!validated.success) {
			throw new Error(
				`Output validation failed: ${JSON.stringify(validated.error.issues)}`,
			);
		}

		console.log(`[${ROUTE}] Import queued successfully:`, {
			queued: validated.data.queued,
			skipped: validated.data.skipped,
			userId,
		});

		response.status(200).json({ data: validated.data, error: null });
	} catch (error) {
		console.error(`[${ROUTE}] Error:`, error);
		Sentry.captureException(error, {
			tags: {
				operation: "raindrop_import_unexpected",
				userId: userId || "unknown",
			},
		});
		response.status(500).json({
			data: null,
			error: "An unexpected error occurred",
		});
	}
}
