/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const v2TwitterSyncFoldersSupplement = {
  additionalResponses: {
    400: { description: "Invalid request body or category data" },
    401: { description: "Not authenticated" },
    409: {
      description: "Duplicate category name detected (race condition — retry request)",
    },
    503: { description: "Database error" },
  },
  description:
    "Creates Recollect collections from Twitter/X bookmark folder names. Deduplicates by case-insensitive name match against existing collections and dedupes within the submitted batch (first occurrence wins). Also appends newly created collection IDs to the caller's `profiles.category_order`. Returns counts of created and skipped collections.",
  method: "post",
  path: "/v2/twitter/sync-folders",
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Sync Twitter bookmark folders as collections",
  tags: ["Twitter"],
} satisfies EndpointSupplement;
