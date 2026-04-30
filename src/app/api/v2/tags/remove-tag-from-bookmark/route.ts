import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
import { BOOKMARK_TAGS_TABLE_NAME, MAIN_TABLE_NAME, TAG_TABLE_NAME } from "@/utils/constants";

import { RemoveTagFromBookmarkInputSchema, RemoveTagFromBookmarkOutputSchema } from "./schema";

const ROUTE = "v2-tags-remove-tag-from-bookmark";

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const { bookmarkId, tagId } = data;
      const userId = user.id;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
        ctx.fields.bookmark_id = bookmarkId;
        ctx.fields.tag_id = tagId;
      }

      const [bookmarkResult, tagResult] = await Promise.all([
        supabase.from(MAIN_TABLE_NAME).select("user_id").eq("id", bookmarkId).single(),
        supabase.from(TAG_TABLE_NAME).select("user_id").eq("id", tagId).single(),
      ]);

      if (bookmarkResult.error) {
        if (bookmarkResult.error.code === "PGRST116") {
          throw new RecollectApiError("not_found", {
            message: "Bookmark not found",
            operation: "verify_bookmark_owner",
          });
        }
        throw new RecollectApiError("service_unavailable", {
          cause: bookmarkResult.error,
          message: "Failed to verify bookmark ownership",
          operation: "verify_bookmark_owner",
        });
      }

      if (bookmarkResult.data.user_id !== userId) {
        throw new RecollectApiError("forbidden", {
          message: "User is not the owner of the bookmark",
        });
      }

      if (tagResult.error) {
        if (tagResult.error.code === "PGRST116") {
          throw new RecollectApiError("not_found", {
            message: "Tag not found",
            operation: "verify_tag_owner",
          });
        }
        throw new RecollectApiError("service_unavailable", {
          cause: tagResult.error,
          message: "Failed to verify tag ownership",
          operation: "verify_tag_owner",
        });
      }

      if (tagResult.data.user_id !== userId) {
        throw new RecollectApiError("forbidden", {
          message: "User is not the owner of the tag",
        });
      }

      const { data: deleted, error: deleteError } = await supabase
        .from(BOOKMARK_TAGS_TABLE_NAME)
        .delete()
        .eq("bookmark_id", bookmarkId)
        .eq("tag_id", tagId)
        .select();

      if (deleteError) {
        throw new RecollectApiError("service_unavailable", {
          cause: deleteError,
          message: "Failed to remove tag from bookmark",
          operation: "tag_remove_from_bookmark",
        });
      }

      if (deleted.length === 0) {
        throw new RecollectApiError("not_found", {
          message: "Tag was not assigned to this bookmark",
          operation: "tag_remove_from_bookmark",
        });
      }

      setPayload(ctx, {
        bookmark_tag_removed: true,
        result_count: deleted.length,
      });

      return deleted;
    },
    inputSchema: RemoveTagFromBookmarkInputSchema,
    outputSchema: RemoveTagFromBookmarkOutputSchema,
    route: ROUTE,
  }),
);
