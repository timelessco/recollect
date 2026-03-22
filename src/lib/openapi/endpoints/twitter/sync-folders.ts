/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const twitterSyncFoldersSupplement = {
  additionalResponses: {
    400: { description: "Invalid request body or category data" },
    409: {
      description: "Duplicate category name detected (race condition — retry request)",
    },
  },
  description:
    "Creates Recollect collections from Twitter/X bookmark folder names. Deduplicates by case-insensitive name match against existing collections. Returns counts of created and skipped collections.",
  method: "post",
  path: "/twitter/sync-folders",
  requestExamples: {
    "case-insensitive-dedup": {
      description:
        'Duplicate names that differ only by case are deduplicated — "Unique Category" and "unique category" are treated as the same. First entry wins.',
      summary: "Case-insensitive deduplication",
      value: {
        categories: [{ name: "Unique Category" }, { name: "unique category" }],
      },
    },
    "empty-categories-array": {
      description: "Returns 400 — at least one category is required.",
      summary: "Validation: empty categories array",
      value: {
        categories: [],
      },
    },
    "empty-category-name": {
      description: "Returns 400 — name must have a minimum length of 1.",
      summary: "Validation: empty category name",
      value: {
        categories: [{ name: "" }],
      },
    },
    "missing-categories-field": {
      description: "Returns 400 — categories field is required.",
      summary: "Validation: missing categories field",
      value: {},
    },
    "multiple-categories": {
      description:
        "Sync multiple folders in one request. Each unique folder name creates a collection.",
      summary: "Create 3 folders",
      value: {
        categories: [
          { name: "Tech Tweets" },
          { name: "Design Inspiration" },
          { name: "Productivity Tips" },
        ],
      },
    },
    "single-category": {
      description: "Sync a single Twitter bookmark folder as a Recollect collection.",
      summary: "Create one folder",
      value: {
        categories: [{ name: "Tech Tweets" }],
      },
    },
    "special-characters": {
      description: "Folder names with special characters are slugified for the collection slug.",
      summary: "Folders with special characters",
      value: {
        categories: [
          { name: "Design & UX Tips!" },
          { name: "AI/ML Resources" },
          { name: "Product Updates (2024)" },
        ],
      },
    },
    "unicode-characters": {
      description: "Folder names containing emoji or non-ASCII characters are supported.",
      summary: "Folders with unicode and emoji",
      value: {
        categories: [{ name: "🚀 Tech Updates" }, { name: "设计灵感" }],
      },
    },
  },
  response400Examples: {
    "empty-categories-array": {
      description: "The categories array must contain at least one category.",
      summary: "Empty array rejected",
      value: {
        data: null,
        error: "categories: Array must contain at least 1 element(s)",
      },
    },
    "empty-category-name": {
      description: "Each category name must be at least 1 character long.",
      summary: "Empty name rejected",
      value: {
        data: null,
        error: "categories[0].name: String must contain at least 1 character(s)",
      },
    },
    "missing-categories-field": {
      description: "Request body must include a categories array.",
      summary: "Missing field rejected",
      value: { data: null, error: "categories: Required" },
    },
  },
  responseExamples: {
    "case-insensitive-dedup": {
      description:
        "The second name matched an existing collection (case-insensitive), so it was skipped.",
      summary: "Duplicate skipped",
      value: { data: { created: 1, skipped: 1 }, error: null },
    },
    "multiple-categories": {
      description: "All three folders created as new collections.",
      summary: "Three folders created",
      value: { data: { created: 3, skipped: 0 }, error: null },
    },
    "single-category": {
      description: "The folder was created as a new Recollect collection.",
      summary: "One folder created",
      value: { data: { created: 1, skipped: 0 }, error: null },
    },
    "special-characters": {
      description: "Folders with special characters in their names created successfully.",
      summary: "Special character folders created",
      value: { data: { created: 3, skipped: 0 }, error: null },
    },
    "unicode-characters": {
      description: "Folders with emoji and non-ASCII characters created successfully.",
      summary: "Unicode folders created",
      value: { data: { created: 2, skipped: 0 }, error: null },
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Sync Twitter bookmark folders as collections",
  tags: ["Twitter"],
} satisfies EndpointSupplement;
