import { type NextApiRequest, type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { deduplicateBookmarks } from "../../../../utils/raindrop-bookmark-helpers";
import {
	addBookmarksToQueue,
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
	warnings: z.array(z.string()).optional(),
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

		// Early return if nothing to insert
		if (bookmarksToSanitize.length === 0) {
			console.log(`[${ROUTE}] No new bookmarks to insert:`, {
				totalBookmarks: bookmarks.length,
				duplicatesRemoved,
				existing,
				userId,
			});
			const output = {
				inserted: 0,
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

		// Insert bookmarks and create relations
		const { insertedBookmarks, junctionError } =
			await insertBookmarksWithRelations({
				bookmarksToSanitize,
				categoriesData,
				route: ROUTE,
				supabase,
				userId,
			});

		// Collect warnings for partial failures
		const warnings: string[] = [];

		// Log warning if junction table insertion failed (non-blocking but should be surfaced)
		if (junctionError) {
			const warningMessage = `Failed to assign categories to ${junctionError.relationsCount} bookmark(s). The bookmarks were imported but are uncategorized.`;
			warnings.push(warningMessage);

			Sentry.addBreadcrumb({
				message: "Junction table insertion failed",
				level: "warning",
				data: {
					error: junctionError.error,
					relationsCount: junctionError.relationsCount,
					userId,
				},
			});

			console.warn(
				`[${ROUTE}] Warning: Failed to create bookmark-category relations:`,
				{
					error: junctionError.error,
					relationsCount: junctionError.relationsCount,
					userId,
				},
			);
		}

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
			...(warnings.length > 0 && { warnings }),
		};
		const validated = outputSchema.safeParse(output);
		if (!validated.success) {
			throw new Error(
				`Output validation failed: ${JSON.stringify(validated.error.issues)}`,
			);
		}

		const hasWarnings = warnings.length > 0;
		const statusCode = hasWarnings ? 207 : 200;

		console.log(
			`[${ROUTE}] Import completed${hasWarnings ? " with warnings" : " successfully"}:`,
			{
				inserted: validated.data.inserted,
				skipped: validated.data.skipped,
				warnings: warnings.length,
				userId,
			},
		);

		response.status(statusCode).json({ data: validated.data, error: null });
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
