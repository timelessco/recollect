import { createAxiomRouteHandler, withSecret } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
import { deleteBookmarksByIds } from "@/lib/bookmark-helpers/delete-bookmarks";
import { createServerServiceClient } from "@/lib/supabase/service";
import { MAIN_TABLE_NAME } from "@/utils/constants";

import { ClearTrashInputSchema, ClearTrashOutputSchema } from "./schema";

const ROUTE = "v2-cron-clear-trash";
const BATCH_SIZE = 1000;
const TRASH_RETENTION_DAYS = 30;

export const POST = createAxiomRouteHandler(
  withSecret({
    handler: async ({ route }) => {
      const ctx = getServerContext();
      const supabase = createServerServiceClient();

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - TRASH_RETENTION_DAYS);
      const cutoffISO = cutoffDate.toISOString();

      setPayload(ctx, {
        cutoff_date: cutoffISO,
        retention_days: TRASH_RETENTION_DAYS,
      });

      let totalDeleted = 0;
      let batchCount = 0;
      let batchDeleteFailures = 0;

      while (true) {
        const { data: oldTrash, error: fetchError } = await supabase
          .from(MAIN_TABLE_NAME)
          .select("id, user_id, type")
          .lt("trash", cutoffISO)
          .not("trash", "is", null)
          .limit(BATCH_SIZE);

        if (fetchError) {
          setPayload(ctx, { deleted_count: totalDeleted });
          throw new RecollectApiError("service_unavailable", {
            cause: fetchError,
            message: "Failed to fetch old trash items",
            operation: "cron_clear_old_trash_fetch",
          });
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

        let iterationDeleted = 0;

        for (const [userId, bookmarkIds] of byUser) {
          const result = await deleteBookmarksByIds(supabase, bookmarkIds, userId, route);

          if (result.error) {
            batchDeleteFailures += 1;
            continue;
          }

          iterationDeleted += result.deletedCount;
        }

        totalDeleted += iterationDeleted;
        batchCount += 1;

        // Every per-user delete failed on a full batch — the same rows will
        // refetch next iteration, so bail out instead of spinning forever.
        if (iterationDeleted === 0) {
          setPayload(ctx, { aborted_reason: "no_rows_deleted_in_iteration" });
          break;
        }

        if (oldTrash.length < BATCH_SIZE) {
          break;
        }
      }

      setPayload(ctx, {
        batch_count: batchCount,
        batch_delete_failures: batchDeleteFailures,
        deleted_count: totalDeleted,
      });

      return { deletedCount: totalDeleted };
    },
    inputSchema: ClearTrashInputSchema,
    outputSchema: ClearTrashOutputSchema,
    route: ROUTE,
    // process.env used intentionally — DEV_SUPABASE_SERVICE_KEY is not available in the factory
    secretEnvVar:
      process.env.NODE_ENV === "development" ? "DEV_SUPABASE_SERVICE_KEY" : "SUPABASE_SERVICE_KEY",
  }),
);
