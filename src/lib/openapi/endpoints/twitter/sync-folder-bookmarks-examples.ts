/**
 * @module Build-time only
 */

export const twitterSyncFolderBookmarksRequestExamples = {
  "empty-category-name": {
    description: "Returns 400 — category_name must have a minimum length of 1.",
    summary: "Validation: empty category_name",
    value: {
      mappings: [
        {
          category_name: "",
          url: "https://x.com/testuser/status/1990000000000000001",
        },
      ],
    },
  },
  "empty-mappings-array": {
    description: "Returns 400 — at least one mapping is required.",
    summary: "Validation: empty mappings array",
    value: {
      mappings: [],
    },
  },
  "invalid-url-format": {
    description: "Returns 400 — url must be a valid URL.",
    summary: "Validation: invalid URL format",
    value: {
      mappings: [
        {
          category_name: "Tech Tweets",
          url: "not-a-valid-url",
        },
      ],
    },
  },
  "large-batch-6-mappings": {
    description: "Queue 6 bookmark-to-collection mappings in a single request.",
    summary: "Large batch — 6 mappings across 3 folders",
    value: {
      mappings: [
        {
          category_name: "Tech Tweets",
          url: "https://x.com/testuser/status/1990000000000000010",
        },
        {
          category_name: "Tech Tweets",
          url: "https://x.com/testuser/status/1990000000000000011",
        },
        {
          category_name: "Tech Tweets",
          url: "https://x.com/testuser/status/1990000000000000012",
        },
        {
          category_name: "Design Inspiration",
          url: "https://x.com/testuser/status/1990000000000000013",
        },
        {
          category_name: "Design Inspiration",
          url: "https://x.com/testuser/status/1990000000000000014",
        },
        {
          category_name: "Productivity Tips",
          url: "https://x.com/testuser/status/1990000000000000015",
        },
      ],
    },
  },
  "missing-category-name": {
    description: "Returns 400 — category_name is required in each mapping.",
    summary: "Validation: missing category_name",
    value: {
      mappings: [
        {
          url: "https://x.com/testuser/status/1990000000000000001",
        },
      ],
    },
  },
  "missing-mappings-field": {
    description: "Returns 400 — mappings field is required.",
    summary: "Validation: missing mappings field",
    value: {},
  },
  "missing-url": {
    description: "Returns 400 — url is required in each mapping.",
    summary: "Validation: missing url",
    value: {
      mappings: [
        {
          category_name: "Tech Tweets",
        },
      ],
    },
  },
  "multiple-links": {
    description: "Queue multiple bookmark-to-collection mappings in one request.",
    summary: "Link 2 bookmarks to different folders",
    value: {
      mappings: [
        {
          category_name: "Tech Tweets",
          url: "https://x.com/narendramodi/status/1984243645050945961",
        },
        {
          category_name: "Design Inspiration",
          url: "https://x.com/elonmusk/status/1985699323099713668",
        },
      ],
    },
  },
  "same-bookmark-multiple-categories": {
    description: "A single bookmark can belong to multiple collections.",
    summary: "One bookmark linked to 3 folders",
    value: {
      mappings: [
        {
          category_name: "Tech Tweets",
          url: "https://x.com/testuser/status/1990000000000000001",
        },
        {
          category_name: "Design Inspiration",
          url: "https://x.com/testuser/status/1990000000000000001",
        },
        {
          category_name: "Productivity Tips",
          url: "https://x.com/testuser/status/1990000000000000001",
        },
      ],
    },
  },
  "single-link": {
    description:
      "Queue a single bookmark-to-collection mapping. Prerequisite: folder and bookmark must already exist.",
    summary: "Link one bookmark to one folder",
    value: {
      mappings: [
        {
          category_name: "Tech Tweets",
          url: "https://x.com/SawyerMerritt/status/1986170355535286529",
        },
      ],
    },
  },
} as const;

export const twitterSyncFolderBookmarksResponse200Examples = {
  "large-batch-6-mappings": {
    description: "All 6 bookmark-to-collection mappings accepted and queued.",
    summary: "Six mappings queued",
    value: { data: { queued: 6 }, error: null },
  },
  "multiple-links": {
    description: "Both bookmark-to-collection mappings accepted and queued.",
    summary: "Two mappings queued",
    value: { data: { queued: 2 }, error: null },
  },
  "same-bookmark-multiple-categories": {
    description: "One bookmark linked to 3 different collections. All mappings queued.",
    summary: "Three mappings queued",
    value: { data: { queued: 3 }, error: null },
  },
  "single-link": {
    description: "One bookmark-to-collection mapping accepted and queued.",
    summary: "One mapping queued",
    value: { data: { queued: 1 }, error: null },
  },
} as const;

export const twitterSyncFolderBookmarksResponse400Examples = {
  "empty-category-name": {
    description: "The category_name must be a non-empty string.",
    summary: "Empty category_name rejected",
    value: {
      data: null,
      error: "mappings[0].category_name: String must contain at least 1 character(s)",
    },
  },
  "empty-mappings-array": {
    description: "The mappings array must contain at least one item.",
    summary: "Empty array rejected",
    value: {
      data: null,
      error: "mappings: Array must contain at least 1 element(s)",
    },
  },
  "invalid-url-format": {
    description: "The url field must be a valid URL with a protocol.",
    summary: "Invalid URL rejected",
    value: { data: null, error: "mappings[0].url: Invalid url" },
  },
  "missing-category-name": {
    description: "Each mapping must include a category_name property.",
    summary: "Missing category_name rejected",
    value: { data: null, error: "mappings[0].category_name: Required" },
  },
  "missing-mappings-field": {
    description: "The request body must include a mappings property.",
    summary: "Missing field rejected",
    value: { data: null, error: "mappings: Required" },
  },
  "missing-url": {
    description: "Each mapping must include a url property.",
    summary: "Missing url rejected",
    value: { data: null, error: "mappings[0].url: Required" },
  },
} as const;
