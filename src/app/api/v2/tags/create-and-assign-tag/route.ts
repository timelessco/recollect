import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";

import { CreateAndAssignTagInputSchema, CreateAndAssignTagOutputSchema } from "./schema";

const ROUTE = "v2-tags-create-and-assign-tag";

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const { bookmarkId, name } = data;
      const userId = user.id;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
        ctx.fields.bookmark_id = bookmarkId;
      }

      // Single atomic RPC call:
      // 1. Verifies bookmark ownership (with FOR UPDATE lock)
      // 2. Creates the tag
      // 3. Assigns tag to bookmark
      // All operations succeed or all fail (PostgreSQL transaction).
      const { data: rpcData, error: rpcError } = await supabase.rpc("create_and_assign_tag", {
        p_bookmark_id: bookmarkId,
        p_tag_name: name,
      });

      if (rpcError) {
        if (rpcError.code === "42501") {
          // insufficient_privilege — bookmark not owned by user
          throw new RecollectApiError("forbidden", {
            message: "Bookmark not found or not owned by user",
            operation: "tag_create_and_assign",
          });
        }

        if (rpcError.code === "23505") {
          // unique_violation — duplicate tag name for this user, or duplicate
          // (bookmark_id, tag_id) junction row if somehow the tag already exists
          // and is already assigned. Single conflict code for both branches.
          throw new RecollectApiError("conflict", {
            cause: rpcError,
            message: "You already have a tag with this name, please use a different name",
            operation: "tag_create_and_assign",
          });
        }

        throw new RecollectApiError("service_unavailable", {
          cause: rpcError,
          message: "Failed to create and assign tag",
          operation: "tag_create_and_assign",
        });
      }

      const rpcRow = rpcData?.[0];
      if (!rpcRow) {
        throw new RecollectApiError("service_unavailable", {
          message: "No data returned from create_and_assign_tag RPC",
          operation: "tag_create_and_assign",
        });
      }

      if (ctx?.fields) {
        ctx.fields.tag_id = rpcRow.tag_id;
        ctx.fields.bookmark_tag_id = rpcRow.bookmark_tag_id;
      }
      setPayload(ctx, { tag_created_and_assigned: true });

      return {
        bookmarkTag: {
          bookmark_id: rpcRow.bookmark_tag_bookmark_id,
          created_at: rpcRow.bookmark_tag_created_at,
          id: rpcRow.bookmark_tag_id,
          tag_id: rpcRow.bookmark_tag_tag_id,
          user_id: rpcRow.bookmark_tag_user_id,
        },
        tag: {
          created_at: rpcRow.tag_created_at,
          id: rpcRow.tag_id,
          name: rpcRow.tag_name,
          user_id: rpcRow.tag_user_id,
        },
      };
    },
    inputSchema: CreateAndAssignTagInputSchema,
    outputSchema: CreateAndAssignTagOutputSchema,
    route: ROUTE,
  }),
);
