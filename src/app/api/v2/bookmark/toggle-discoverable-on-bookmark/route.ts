import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { MAIN_TABLE_NAME } from "@/utils/constants";

import {
  ToggleDiscoverableOnBookmarkInputSchema,
  ToggleDiscoverableOnBookmarkOutputSchema,
} from "./schema";

const ROUTE = "v2-bookmark-toggle-discoverable-on-bookmark";

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const { bookmark_id: bookmarkId, make_discoverable: makeDiscoverable } = data;
      const userId = user.id;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
        ctx.fields.bookmark_id = bookmarkId;
        ctx.fields.make_discoverable = makeDiscoverable;
      }

      // Atomic match prevents TOCTOU between ownership check and update.
      // trash IS NULL is enforced only when enabling — removing discoverability
      // stays safe for trashed rows so users can always clean up.
      let updateQuery = supabase
        .from(MAIN_TABLE_NAME)
        .update({
          make_discoverable: makeDiscoverable ? new Date().toISOString() : null,
        })
        .match({ id: bookmarkId, user_id: userId });

      if (makeDiscoverable) {
        updateQuery = updateQuery.is("trash", null);
      }

      const { data: updatedRows, error: updateError } = await updateQuery.select();

      if (updateError) {
        throw new RecollectApiError("service_unavailable", {
          cause: updateError,
          message: "Failed to toggle bookmark discoverable status",
          operation: "toggle_discoverable_on_bookmark",
        });
      }

      const rows = updatedRows ?? [];
      if (rows.length === 0) {
        throw new RecollectApiError("bad_request", {
          context: { bookmark_id: bookmarkId, make_discoverable: makeDiscoverable },
          message: makeDiscoverable
            ? "Bookmark not found, you lack permission, or bookmark is trashed"
            : "Bookmark not found or you lack permission",
          operation: "toggle_discoverable_on_bookmark",
        });
      }

      const [updatedRow] = rows;

      if (ctx?.fields) {
        ctx.fields.toggled = true;
        ctx.fields.now_discoverable = updatedRow.make_discoverable !== null;
      }

      return {
        id: updatedRow.id,
        make_discoverable: updatedRow.make_discoverable,
      };
    },
    inputSchema: ToggleDiscoverableOnBookmarkInputSchema,
    outputSchema: ToggleDiscoverableOnBookmarkOutputSchema,
    route: ROUTE,
  }),
);
