/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

import {
  raindropImport400Examples,
  raindropImportRequestExamples,
  raindropImportResponseExamples,
} from "./import-examples";

export const raindropImportSupplement = {
  additionalResponses: {
    400: { description: "Invalid request body or bookmark data" },
  },
  description:
    "Enqueues a batch of Raindrop.io bookmarks for async import. Deduplicates within the batch and against existing bookmarks. Returns counts of queued and skipped items.",
  method: "post",
  path: "/raindrop/import",
  requestExamples: raindropImportRequestExamples,
  response400Examples: raindropImport400Examples,
  responseExamples: raindropImportResponseExamples,
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Import Raindrop.io bookmarks",
  tags: ["Raindrop"],
} satisfies EndpointSupplement;
