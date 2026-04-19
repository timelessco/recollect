/**
 * @module Build-time only
 */

export const v2TwitterSyncRequestExamples = {
  "batch-2-bookmarks": {
    description:
      "Send the shown body — queues two new Twitter/X posts for async archiving. Returns inserted: 2, skipped: 0.",
    summary: "Queue batch of 2 bookmarks",
    value: {
      bookmarks: [
        {
          description: "First example tweet",
          inserted_at: "2024-01-15T10:00:00.000Z",
          meta_data: { test: true },
          ogImage: "https://pbs.twimg.com/example1.jpg",
          sort_index: "0",
          title: "Batch Tweet 1",
          type: "tweet",
          url: "https://twitter.com/example/status/1234567891",
        },
        {
          description: "Second example tweet",
          inserted_at: "2024-01-15T09:00:00.000Z",
          meta_data: { test: true },
          ogImage: "https://pbs.twimg.com/example2.jpg",
          sort_index: "1",
          title: "Batch Tweet 2",
          type: "tweet",
          url: "https://twitter.com/example/status/1234567892",
        },
      ],
    },
  },
  "empty-bookmarks-array": {
    description: "Send `{ bookmarks: [] }` — returns 400: `At least one bookmark required`.",
    summary: "Validation: empty array (400)",
    value: {
      bookmarks: [],
    },
  },
  "invalid-url-format": {
    description:
      "Send a bookmark with a plain string url — returns 400: `Invalid URL`. The url field must be a valid URL with protocol.",
    summary: "Validation: not a URL (400)",
    value: {
      bookmarks: [
        {
          description: "Example tweet body",
          inserted_at: "2024-01-15T10:30:00.000Z",
          meta_data: {},
          sort_index: "0",
          title: "Invalid URL Test",
          type: "tweet",
          url: "not-a-url",
        },
      ],
    },
  },
  "missing-url": {
    description:
      "Send a bookmark without `url` — returns 400: `Invalid input: expected string, received undefined`. url is required.",
    summary: "Validation: missing url (400)",
    value: {
      bookmarks: [
        {
          description: "Example tweet body",
          inserted_at: "2024-01-15T10:30:00.000Z",
          meta_data: {},
          sort_index: "0",
          title: "Missing URL Test",
          type: "tweet",
        },
      ],
    },
  },
  "single-bookmark": {
    description:
      "Send the shown body — queues one Twitter/X post for async archiving. Returns inserted: 1, skipped: 0 when the URL has not been seen before.",
    summary: "Queue single Twitter/X bookmark",
    value: {
      bookmarks: [
        {
          description: "Example tweet body",
          inserted_at: "2024-01-15T10:30:00.000Z",
          meta_data: { saved_at: "2024-01-15T10:30:00.000Z" },
          ogImage: "https://pbs.twimg.com/example.jpg",
          sort_index: "0",
          title: "Test Tweet",
          type: "tweet",
          url: "https://twitter.com/example/status/1234567890",
        },
      ],
    },
  },
  "single-bookmark-duplicate": {
    description:
      "Re-send a URL already stored for this user — returns inserted: 0, skipped: 1. Safe to retry; dedup is transactional in the RPC.",
    summary: "Idempotency: duplicate URL",
    value: {
      bookmarks: [
        {
          description: "Example tweet body",
          inserted_at: "2024-01-15T10:30:00.000Z",
          meta_data: { saved_at: "2024-01-15T10:30:00.000Z" },
          ogImage: "https://pbs.twimg.com/example.jpg",
          sort_index: "0",
          title: "Test Tweet",
          type: "tweet",
          url: "https://twitter.com/example/status/1234567890",
        },
      ],
    },
  },
} as const;

export const v2TwitterSyncResponseExamples = {
  "batch-2-bookmarks": {
    description: "Both posts were new and queued successfully.",
    summary: "Batch queued",
    value: { inserted: 2, skipped: 0 },
  },
  "single-bookmark": {
    description: "One new Twitter/X post accepted and queued for processing.",
    summary: "Single bookmark queued",
    value: { inserted: 1, skipped: 0 },
  },
  "single-bookmark-duplicate": {
    description:
      "URL was already stored for this user — skipped by the transactional dedup in `enqueue_twitter_bookmarks`.",
    summary: "Duplicate URL skipped",
    value: { inserted: 0, skipped: 1 },
  },
} as const;

export const v2TwitterSync400Examples = {
  "empty-bookmarks-array": {
    description: "The bookmarks array must contain at least one item.",
    summary: "Empty array rejected",
    value: { error: "At least one bookmark required" },
  },
  "invalid-url-format": {
    description: "The url field must be a valid URL with a protocol.",
    summary: "Invalid URL format",
    value: { error: "Invalid URL" },
  },
  "missing-url": {
    description: "The url field is required on every bookmark.",
    summary: "Missing url",
    value: { error: "Invalid input: expected string, received undefined" },
  },
} as const;
