import * as Sentry from "@sentry/nextjs";

import { createGetApiHandlerWithSecret } from "@/lib/api-helpers/create-handler";
import { deleteBookmarksByIds } from "@/lib/bookmark-helpers/delete-bookmarks";
import { createServerServiceClient } from "@/lib/supabase/service";
import { MAIN_TABLE_NAME } from "@/utils/constants";

import { ClearTrashInputSchema, ClearTrashOutputSchema } from "./schema";

const ROUTE = "cron/clear-trash";
const BATCH_SIZE = 1000;
const TRASH_RETENTION_DAYS = 30;

export const GET = createGetApiHandlerWithSecret({
  handler: async ({ route }) => {
    const supabase = createServerServiceClient();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - TRASH_RETENTION_DAYS);
    const cutoffISO = cutoffDate.toISOString();

    console.log(`[${route}] Starting cleanup for items trashed before:`, {
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
        console.error(`[${route}] Failed to fetch old trash:`, fetchError);
        Sentry.captureException(fetchError, {
          tags: { operation: "cron_clear_old_trash_fetch" },
        });

        return { deletedCount: totalDeleted };
      }

      if (!oldTrash || oldTrash.length === 0) {
        break;
      }

      const byUser = new Map<string, number[]>();

      for (const item of oldTrash) {
        const ids = byUser.get(item.user_id) ?? [];
        ids.push(item.id);
        byUser.set(item.user_id, ids);
      }

      for (const [userId, bookmarkIds] of byUser) {
        console.log(`[${route}] Deleting batch:`, {
          count: bookmarkIds.length,
          userId,
        });

        const result = await deleteBookmarksByIds(supabase, bookmarkIds, userId, route);

        if (result.error) {
          console.error(`[${route}] Batch delete failed:`, {
            error: result.error,
            userId,
          });
          Sentry.captureException(new Error(result.error), {
            extra: { count: bookmarkIds.length },
            tags: {
              operation: "cron_clear_old_trash_batch_delete",
              userId,
            },
          });
          continue;
        }

        totalDeleted += result.deletedCount;
      }

      if (oldTrash.length < BATCH_SIZE) {
        break;
      }
    }

    console.log(`[${route}] Completed:`, { totalDeleted });

    return { deletedCount: totalDeleted };
  },
  inputSchema: ClearTrashInputSchema,
  outputSchema: ClearTrashOutputSchema,
  route: ROUTE,
  secretEnvVar: "CRON_SECRET",
});
