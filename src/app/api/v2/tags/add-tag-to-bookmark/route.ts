import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
import { BOOKMARK_TAGS_TABLE_NAME, MAIN_TABLE_NAME, TAG_TABLE_NAME } from "@/utils/constants";

import { AddTagToBookmarkInputSchema, AddTagToBookmarkOutputSchema } from "./schema";

const ROUTE = "v2-tags-add-tag-to-bookmark";

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

      const { data: inserted, error: insertError } = await supabase
        .from(BOOKMARK_TAGS_TABLE_NAME)
        .insert({
          bookmark_id: bookmarkId,
          tag_id: tagId,
          user_id: userId,
        })
        .select();

      if (insertError) {
        if (insertError.code === "23505") {
          throw new RecollectApiError("conflict", {
            cause: insertError,
            message: "Tag already assigned to bookmark",
            operation: "tag_add_to_bookmark",
          });
        }
        throw new RecollectApiError("service_unavailable", {
          cause: insertError,
          message: "Failed to add tag to bookmark",
          operation: "tag_add_to_bookmark",
        });
      }

      if (inserted.length === 0) {
        throw new RecollectApiError("service_unavailable", {
          message: "No data returned from database",
          operation: "tag_add_to_bookmark",
        });
      }

      setPayload(ctx, {
        bookmark_tag_inserted: true,
        result_count: inserted.length,
      });

      return inserted;
    },
    inputSchema: AddTagToBookmarkInputSchema,
    outputSchema: AddTagToBookmarkOutputSchema,
    route: ROUTE,
  }),
);
