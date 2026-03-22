import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { isNonEmptyArray } from "@/utils/assertion-utils";
import { MAIN_TABLE_NAME } from "@/utils/constants";
import { HttpStatus } from "@/utils/error-utils/common";

import {
  ToggleBookmarkDiscoverablePayloadSchema,
  ToggleBookmarkDiscoverableResponseSchema,
} from "./schema";

const ROUTE = "toggle-discoverable-on-bookmark";

export const POST = createPostApiHandlerWithAuth({
  handler: async ({ data, route, supabase, user }) => {
    const { bookmark_id: bookmarkId, make_discoverable: makeDiscoverable } = data;
    const userId = user.id;

    console.log(`[${route}] API called:`, {
      bookmarkId,
      makeDiscoverable,
      userId,
    });

    // Build match conditions - atomic update prevents TOCTOU race condition
    const matchConditions: Record<string, unknown> = {
      id: bookmarkId,
      user_id: userId,
    };

    // Build the update query
    let updateQuery = supabase
      .from(MAIN_TABLE_NAME)
      .update({
        make_discoverable: makeDiscoverable ? new Date().toISOString() : null,
      })
      .match(matchConditions);

    // Only require trash IS NULL when making discoverable (removing discoverability is always safe)
    if (makeDiscoverable) {
      updateQuery = updateQuery.is("trash", null);
    }

    const { data: updatedData, error } = await updateQuery.select();

    if (error) {
      return apiError({
        error,
        extra: {
          bookmarkId,
          makeDiscoverable,
        },
        message: "Failed to toggle bookmark discoverable status",
        operation: "toggle_discoverable_on_bookmark",
        route,
        userId,
      });
    }

    if (!isNonEmptyArray(updatedData)) {
      return apiWarn({
        context: {
          bookmarkId,
          userId,
        },
        message: makeDiscoverable
          ? "Bookmark not found, you lack permission, or bookmark is trashed"
          : "Bookmark not found or you lack permission",
        route,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    console.log(`[${route}] Bookmark discoverable status toggled successfully:`, {
      bookmarkId: updatedData[0].id,
      makeDiscoverable,
    });

    return updatedData[0];
  },
  inputSchema: ToggleBookmarkDiscoverablePayloadSchema,
  outputSchema: ToggleBookmarkDiscoverableResponseSchema,
  route: ROUTE,
});
