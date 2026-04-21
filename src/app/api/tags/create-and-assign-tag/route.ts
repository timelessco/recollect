import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { isNonEmptyArray } from "@/utils/assertion-utils";

import { CreateAndAssignTagPayloadSchema, CreateAndAssignTagResponseSchema } from "./schema";

const ROUTE = "create-and-assign-tag";

/**
 * @deprecated Use /api/v2/tags/create-and-assign-tag instead. Retained for iOS and extension clients.
 */
export const POST = createPostApiHandlerWithAuth({
  handler: async ({ data, route, supabase, user }) => {
    const { bookmarkId, name } = data;
    const userId = user.id;

    console.log(`[${route}] API called:`, { bookmarkId, name, userId });

    // Single atomic RPC call that:
    // 1. Verifies bookmark ownership (with FOR UPDATE lock)
    // 2. Creates the tag
    // 3. Assigns tag to bookmark
    // All operations succeed or all fail (PostgreSQL transaction)
    const { data: rpcData, error: rpcError } = await supabase.rpc("create_and_assign_tag", {
      p_bookmark_id: bookmarkId,
      p_tag_name: name,
    });

    if (rpcError) {
      // Handle specific error codes
      if (rpcError.code === "42501") {
        // insufficient_privilege - bookmark not owned by user
        return apiWarn({
          context: { bookmarkId, userId },
          message: "Bookmark not found or not owned by user",
          route,
          status: 403,
        });
      }

      if (rpcError.code === "23505") {
        // unique_violation (23505) - duplicate tag name
        return apiWarn({
          context: { name, userId },
          message: "You already have a tag with this name, please use a different name",
          route,
          status: 409,
        });
      }

      return apiError({
        error: rpcError,
        extra: { bookmarkId, name },
        message: "Error creating and assigning tag",
        operation: "create_and_assign_tag_rpc",
        route,
        userId,
      });
    }

    if (!isNonEmptyArray(rpcData)) {
      return apiError({
        error: new Error("Empty RPC result"),
        message: "No data returned from create_and_assign_tag RPC",
        operation: "create_and_assign_tag_empty",
        route,
        userId,
      });
    }

    const [rpcRow] = rpcData;

    console.log(`[${route}] Tag created and assigned:`, {
      bookmarkId: rpcRow.bookmark_tag_bookmark_id,
      bookmarkTagId: rpcRow.bookmark_tag_id,
      tagId: rpcRow.tag_id,
      tagName: rpcRow.tag_name,
    });

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
  inputSchema: CreateAndAssignTagPayloadSchema,
  outputSchema: CreateAndAssignTagResponseSchema,
  route: ROUTE,
});
