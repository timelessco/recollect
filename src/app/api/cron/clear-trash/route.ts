import { NextResponse, type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { ClearTrashInputSchema, ClearTrashOutputSchema } from "./schema";
import { type HandlerConfig } from "@/lib/api-helpers/create-handler";
import { deleteBookmarksByIds } from "@/lib/bookmark-helpers/delete-bookmarks";
import { createServerServiceClient } from "@/lib/supabase/service";
import { MAIN_TABLE_NAME } from "@/utils/constants";

const ROUTE = "cron/clear-trash";
const BATCH_SIZE = 1000;
const TRASH_RETENTION_DAYS = 30;

async function handleGet(request: NextRequest) {
	try {
		const cronSecret = process.env.CRON_SECRET;
		if (!cronSecret) {
			console.error(`[${ROUTE}] CRON_SECRET is not configured`);
			return NextResponse.json(
				{ data: null, error: "Server configuration error" },
				{ status: 500 },
			);
		}

		const authHeader = request.headers.get("authorization");

		if (authHeader !== `Bearer ${cronSecret}`) {
			return NextResponse.json(
				{ data: null, error: "Unauthorized" },
				{ status: 401 },
			);
		}

		const supabase = await createServerServiceClient();

		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - TRASH_RETENTION_DAYS);
		const cutoffISO = cutoffDate.toISOString();

		console.log(`[${ROUTE}] Starting cleanup for items trashed before:`, {
			cutoffDate: cutoffISO,
		});

		let totalDeleted = 0;

		while (true) {
			const { data: oldTrash, error: fetchError } = await supabase
				.from(MAIN_TABLE_NAME)
				.select("id, user_id, type")
				.lt("trash", cutoffISO)
				.not("trash", "is", null)
				.limit(BATCH_SIZE);

			if (fetchError) {
				console.error(`[${ROUTE}] Failed to fetch old trash:`, fetchError);
				Sentry.captureException(fetchError, {
					tags: { operation: "cron_clear_old_trash_fetch" },
				});

				return NextResponse.json(
					{ data: null, error: "Failed to fetch old trash" },
					{ status: 500 },
				);
			}

			if (!oldTrash || oldTrash.length === 0) {
				break;
			}

			// Group bookmarks by user_id for deleteBookmarksByIds
			const byUser = new Map<string, number[]>();

			for (const item of oldTrash) {
				const ids = byUser.get(item.user_id) ?? [];
				ids.push(item.id);
				byUser.set(item.user_id, ids);
			}

			for (const [userId, bookmarkIds] of byUser) {
				console.log(`[${ROUTE}] Deleting batch:`, {
					userId,
					count: bookmarkIds.length,
				});

				const result = await deleteBookmarksByIds(
					supabase,
					bookmarkIds,
					userId,
					ROUTE,
				);

				if (result.error) {
					console.error(`[${ROUTE}] Batch delete failed:`, {
						userId,
						error: result.error,
					});
					Sentry.captureException(new Error(result.error), {
						tags: { operation: "cron_clear_old_trash_batch_delete", userId },
						extra: { count: bookmarkIds.length },
					});
					continue;
				}

				totalDeleted += result.deletedCount;
			}

			if (oldTrash.length < BATCH_SIZE) {
				break;
			}
		}

		console.log(`[${ROUTE}] Completed:`, { totalDeleted });

		return NextResponse.json({
			data: { deletedCount: totalDeleted },
			error: null,
		});
	} catch (error) {
		console.error(`[${ROUTE}] Unexpected error:`, error);
		Sentry.captureException(error, {
			tags: { operation: "cron_clear_old_trash_unexpected" },
		});

		return NextResponse.json(
			{ data: null, error: "An unexpected error occurred" },
			{ status: 500 },
		);
	}
}

export const GET = Object.assign(handleGet, {
	config: {
		factoryName: "createGetApiHandler",
		inputSchema: ClearTrashInputSchema,
		outputSchema: ClearTrashOutputSchema,
		route: ROUTE,
	} satisfies HandlerConfig,
});
