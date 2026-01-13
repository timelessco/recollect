import { type NextApiRequest, type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import {
	addBookmarksToQueue,
	deduplicateBookmarks,
	insertBookmarksWithRelations,
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
	inserted: z.number(),
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

		const userId = user.id;
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

		// Early return if nothing to insert
		if (bookmarksToSanitize.length === 0) {
			console.log(`[${ROUTE}] No new bookmarks to insert:`, {
				totalBookmarks: bookmarks.length,
				duplicatesRemoved,
				existing,
				userId,
			});
			const output = { inserted: 0, skipped: bookmarks.length };
			const validated = outputSchema.safeParse(output);
			if (!validated.success) {
				throw new Error(
					`Output validation failed: ${JSON.stringify(validated.error.issues)}`,
				);
			}

			response.status(200).json({ data: validated.data, error: null });
			return;
		}

		// Insert bookmarks and create relations
		const { insertedBookmarks } = await insertBookmarksWithRelations({
			bookmarksToSanitize,
			categoriesData,
			route: ROUTE,
			supabase,
			userId,
		});

		// Update category order in profile
		await updateProfileCategoryOrder({
			insertedCategories,
			route: ROUTE,
			supabase,
			userId,
		});

		// Add bookmarks to queue for AI enrichment, screenshot, PDF thumbnail generation
		await addBookmarksToQueue({
			insertedBookmarks,
			route: ROUTE,
			supabase,
			userId,
		});

		const output = {
			inserted: insertedBookmarks.length,
			skipped: bookmarks.length - insertedBookmarks.length,
		};
		const validated = outputSchema.safeParse(output);
		if (!validated.success) {
			throw new Error(
				`Output validation failed: ${JSON.stringify(validated.error.issues)}`,
			);
		}

		console.log(`[${ROUTE}] Import completed successfully:`, {
			inserted: validated.data.inserted,
			skipped: validated.data.skipped,
			userId,
		});

		response.status(200).json({ data: validated.data, error: null });
	} catch (error) {
		console.error(`[${ROUTE}] Error:`, error);
		const errorMessage =
			error instanceof Error ? error.message : "An unexpected error occurred";
		Sentry.captureException(error, {
			tags: {
				operation: "raindrop_import_unexpected",
			},
		});
		response.status(500).json({
			data: null,
			error: errorMessage,
		});
	}
}
