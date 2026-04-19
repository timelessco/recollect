/**
 * @module Build-time only
 */

export const v2InstagramSyncRequestExamples = {
  "batch-2-bookmarks": {
    description:
      "Send the shown body — queues two new Instagram posts for async archiving. Returns inserted: 2, skipped: 0.",
    summary: "Queue batch of 2 bookmarks",
    value: {
      bookmarks: [
        {
          meta_data: { saved_collection_names: ["Batch Test"] },
          saved_at: "2024-01-15T10:00:00.000Z",
          title: "Batch Post 1",
          type: "instagram",
          url: "https://www.instagram.com/p/BATCH001/",
        },
        {
          meta_data: { saved_collection_names: ["Batch Test"] },
          saved_at: "2024-01-15T09:00:00.000Z",
          title: "Batch Post 2",
          type: "instagram",
          url: "https://www.instagram.com/p/BATCH002/",
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
          saved_at: "2024-01-15T10:30:00.000Z",
          title: "Invalid URL Test",
          type: "instagram",
          url: "not-a-valid-url",
        },
      ],
    },
  },
  "missing-saved-at": {
    description:
      "Send a bookmark without `saved_at` — returns 400: `Invalid input: expected string, received undefined`. saved_at is required.",
    summary: "Validation: missing saved_at (400)",
    value: {
      bookmarks: [
        {
          title: "Missing saved_at Test",
          type: "instagram",
          url: "https://www.instagram.com/p/VALIDURL/",
        },
      ],
    },
  },
  "non-instagram-hostname": {
    description:
      "Send a bookmark with a non-Instagram URL — returns 400: `Must be a valid Instagram URL`. Only instagram.com and www.instagram.com hostnames are accepted.",
    summary: "Validation: wrong hostname (400)",
    value: {
      bookmarks: [
        {
          saved_at: "2024-01-15T10:30:00.000Z",
          title: "Wrong Hostname Test",
          type: "instagram",
          url: "https://twitter.com/someuser/status/123",
        },
      ],
    },
  },
  "single-bookmark": {
    description:
      "Send the shown body — queues one Instagram post for async archiving. Returns inserted: 1, skipped: 0 when the URL has not been seen before.",
    summary: "Queue single Instagram bookmark",
    value: {
      bookmarks: [
        {
          meta_data: {
            saved_collection_names: ["Test Collection"],
          },
          saved_at: "2024-01-15T10:30:00.000Z",
          title: "Test Instagram Post",
          type: "instagram",
          url: "https://www.instagram.com/p/TEST123/",
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
          meta_data: {
            saved_collection_names: ["Test Collection"],
          },
          saved_at: "2024-01-15T10:30:00.000Z",
          title: "Test Instagram Post",
          type: "instagram",
          url: "https://www.instagram.com/p/TEST123/",
        },
      ],
    },
  },
} as const;

export const v2InstagramSyncResponseExamples = {
  "batch-2-bookmarks": {
    description: "Both posts were new and queued successfully.",
    summary: "Batch queued",
    value: { inserted: 2, skipped: 0 },
  },
  "single-bookmark": {
    description: "One new Instagram post accepted and queued for processing.",
    summary: "Single bookmark queued",
    value: { inserted: 1, skipped: 0 },
  },
  "single-bookmark-duplicate": {
    description:
      "URL was already stored for this user — skipped by the transactional dedup in `enqueue_instagram_bookmarks`.",
    summary: "Duplicate URL skipped",
    value: { inserted: 0, skipped: 1 },
  },
} as const;

export const v2InstagramSync400Examples = {
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
  "missing-saved-at": {
    description: "The saved_at field is required on every bookmark.",
    summary: "Missing saved_at",
    value: { error: "Invalid input: expected string, received undefined" },
  },
  "non-instagram-hostname": {
    description: "Only instagram.com and www.instagram.com hostnames are accepted.",
    summary: "Non-Instagram hostname",
    value: { error: "Must be a valid Instagram URL" },
  },
} as const;
