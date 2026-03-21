import { bearerAuth } from "@/lib/openapi/registry";
/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";

export const deleteBookmarkSupplement = {
  path: "/bookmark/delete-bookmark",
  method: "post",
  tags: ["Bookmarks"],
  summary: "Permanently delete bookmarks",
  description:
    "Permanently deletes one or more bookmarks by ID. The caller must own the bookmarks. Processes in batches of 1000. Bookmarks in trash can be deleted directly — this skips the trash and is irreversible.",
  security: [{ [bearerAuth.name]: [] }, {}],
  requestExample: {
    deleteData: [{ id: 42 }, { id: 43 }, { id: 44 }],
  },
  responseExample: {
    data: {
      deletedCount: 3,
      message: "Deleted 3 bookmark(s)",
    },
    error: null,
  },
} satisfies EndpointSupplement;
