/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const v2MoveBookmarkToTrashSupplement = {
  additionalResponses: {
    400: {
      description: "Invalid request: missing or invalid data array, or missing/non-boolean isTrash",
    },
    401: { description: "Not authenticated" },
    503: { description: "Database error updating bookmark trash state" },
  },
  description:
    "Soft-deletes one or more bookmarks by setting their `trash` timestamp, or restores them by clearing it. Set `isTrash: true` to trash, `isTrash: false` to restore. Ownership is enforced via `user_id` — only the caller's bookmarks are affected. Revalidation of any associated public category pages runs after the response is sent. Returns the updated `{ id, trash }` rows.",
  method: "post",
  path: "/v2/bookmark/move-bookmark-to-trash",
  requestExamples: {
    "trash-single-bookmark": {
      description:
        "Send the shown body — moves bookmark 42 to trash (returns the trashed row with ISO timestamp).",
      summary: "Trash a single bookmark",
      value: { data: [{ id: 42 }], isTrash: true },
    },
    "restore-from-trash": {
      description: "Send the shown body — restores bookmark 42 from trash (trash set to null).",
      summary: "Restore a bookmark from trash",
      value: { data: [{ id: 42 }], isTrash: false },
    },
    "trash-multiple-bookmarks": {
      description: "Send the shown body — trashes bookmarks 42 and 43 in one call.",
      summary: "Trash multiple bookmarks in a batch",
      value: { data: [{ id: 42 }, { id: 43 }], isTrash: true },
    },
    "idempotent-re-trash": {
      description:
        "Re-sending the same trash payload is safe — the trash timestamp is overwritten with the new value, not rejected.",
      summary: "Re-trash an already-trashed bookmark (idempotent)",
      value: { data: [{ id: 42 }], isTrash: true },
    },
  },
  response400Examples: {
    "empty-data-array": {
      description: "Send `{ data: [], isTrash: true }` — returns 400 when the data array is empty.",
      summary: "Empty data array rejected",
      value: { error: "At least one bookmark is required" },
    },
    "missing-is-trash": {
      description: "Send `{ data: [{id: 42}] }` (no isTrash) — returns 400; isTrash is required.",
      summary: "Missing isTrash rejected",
      value: { error: "isTrash must be a boolean" },
    },
  },
  responseExamples: {
    "trash-single-bookmark": {
      description: "Bookmark 42 moved to trash; response contains the trashed row.",
      summary: "Single bookmark trashed",
      value: [{ id: 42, trash: "2026-04-18T18:49:28.362+00:00" }],
    },
    "restore-from-trash": {
      description: "Bookmark 42 restored; trash is now null.",
      summary: "Bookmark restored",
      value: [{ id: 42, trash: null }],
    },
    "trash-multiple-bookmarks": {
      description: "Two bookmarks trashed in one call; both rows returned.",
      summary: "Batch trash response",
      value: [
        { id: 42, trash: "2026-04-18T18:49:28.362+00:00" },
        { id: 43, trash: "2026-04-18T18:49:28.362+00:00" },
      ],
    },
    "idempotent-re-trash": {
      description:
        "Re-trashing updates the timestamp to a newer value — no error, no duplicate row.",
      summary: "Re-trash returns updated timestamp",
      value: [{ id: 42, trash: "2026-04-18T18:49:29.160+00:00" }],
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Move bookmarks to trash or restore them",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
