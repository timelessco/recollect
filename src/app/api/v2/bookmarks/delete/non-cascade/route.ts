import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { MAIN_TABLE_NAME } from "@/utils/constants";

// Called by: Cypress e2e tests only (non-cascade delete for test cleanup)
import {
  BookmarksDeleteNonCascadeInputSchema,
  BookmarksDeleteNonCascadeOutputSchema,
} from "./schema";

const ROUTE = "v2-bookmarks-delete-non-cascade";

export const DELETE = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const userId = user.id;
      const bookmarkId = data.data.id;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
        ctx.fields.bookmark_id = bookmarkId;
      }

      const { error } = await supabase
        .from(MAIN_TABLE_NAME)
        .delete()
        .eq("user_id", userId)
        .eq("id", bookmarkId);

      if (error) {
        throw new RecollectApiError("service_unavailable", {
          cause: error,
          message: "Failed to delete bookmark",
          operation: "delete_bookmarks_non_cascade",
        });
      }

      if (ctx?.fields) {
        ctx.fields.deleted = true;
      }

      return null;
    },
    inputSchema: BookmarksDeleteNonCascadeInputSchema,
    outputSchema: BookmarksDeleteNonCascadeOutputSchema,
    route: ROUTE,
  }),
);
