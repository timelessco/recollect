/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const deleteBookmarkSupplement = {
  description:
    "Permanently deletes one or more bookmarks by ID. The caller must own the bookmarks. Processes in batches of 1000. Bookmarks in trash can be deleted directly — this skips the trash and is irreversible.",
  method: "post",
  path: "/bookmark/delete-bookmark",
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
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Permanently delete bookmarks",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
