/**
 * @module Build-time only
 */

export const instagramSyncRequestExamples = {
  "batch-2-bookmarks": {
    description:
      "Queue multiple Instagram posts in one request. Bookmarks are ordered by saved_at descending during insertion. Returns inserted: 2, skipped: 0 for new URLs.",
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
    description:
      "Sending an empty bookmarks array fails validation. Returns 400 with 'At least one bookmark required'.",
    summary: "Validation: empty array (400)",
    value: {
      bookmarks: [],
    },
  },
  "invalid-type-field": {
    description:
      "The type field is a literal — only 'instagram' is accepted. Any other string is rejected.",
    summary: "Validation: type must be 'instagram' (400)",
    value: {
      bookmarks: [
        {
          title: "Wrong Type Test",
          type: "twitter",
          url: "https://www.instagram.com/p/VALIDURL/",
        },
      ],
    },
  },
  "invalid-url-format": {
    description:
      "URL field must be a valid URL. A plain string without protocol fails URL schema validation.",
    summary: "Validation: not a URL (400)",
    value: {
      bookmarks: [
        {
          title: "Invalid URL Test",
          type: "instagram",
          url: "not-a-valid-url",
        },
      ],
    },
  },
  "javascript-protocol-xss": {
    description:
      "The javascript: protocol fails URL format validation before even reaching hostname validation, blocking XSS injection attempts.",
    summary: "Validation: javascript: protocol (400)",
    value: {
      bookmarks: [
        {
          title: "XSS Attempt Test",
          type: "instagram",
          // oxlint-disable-next-line no-script-url
          url: "javascript:alert('xss')",
        },
      ],
    },
  },
  "non-instagram-hostname": {
    description:
      "URL must have instagram.com or www.instagram.com as hostname. Twitter and other domains are rejected.",
    summary: "Validation: wrong hostname (400)",
    value: {
      bookmarks: [
        {
          title: "Wrong Hostname Test",
          type: "instagram",
          url: "https://twitter.com/someuser/status/123",
        },
      ],
    },
  },
  "single-bookmark": {
    description:
      "Queue one Instagram post for async archiving. Returns inserted: 1, skipped: 0 when the URL has not been seen before.",
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
} as const;

export const instagramSyncResponseExamples = {
  "batch-2-bookmarks": {
    description: "Both posts were new and queued successfully.",
    summary: "Batch queued",
    value: { data: { inserted: 2, skipped: 0 }, error: null },
  },
  "single-bookmark": {
    description: "One new Instagram post accepted and queued for processing.",
    summary: "Single bookmark queued",
    value: { data: { inserted: 1, skipped: 0 }, error: null },
  },
} as const;

export const instagramSync400Examples = {
  "empty-bookmarks-array": {
    description: "The bookmarks array must contain at least one item.",
    summary: "Empty array rejected",
    value: { data: null, error: "At least one bookmark required" },
  },
  "invalid-type-field": {
    description: 'The type field only accepts the literal string "instagram".',
    summary: "Invalid type literal",
    value: { data: null, error: 'Invalid input: expected "instagram"' },
  },
  "invalid-url-format": {
    description: "The url field must be a valid URL with a protocol.",
    summary: "Invalid URL format",
    value: { data: null, error: "Invalid URL" },
  },
  "javascript-protocol-xss": {
    description: "The javascript: protocol is rejected at URL format validation.",
    summary: "XSS attempt blocked",
    value: { data: null, error: "Invalid URL" },
  },
  "non-instagram-hostname": {
    description: "Only instagram.com and www.instagram.com hostnames are accepted.",
    summary: "Non-Instagram hostname",
    value: { data: null, error: "Must be a valid Instagram URL" },
  },
} as const;
