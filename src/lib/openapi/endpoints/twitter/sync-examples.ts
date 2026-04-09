/**
 * @module Build-time only
 */

export const twitterSyncRequestExamples = {
  "all-optional-fields": {
    description:
      "Sync a tweet that includes the optional video_url in meta_data and all other fields populated.",
    summary: "Tweet with all optional fields including video_url",
    value: {
      bookmarks: [
        {
          description: "Tweet with all fields including video",
          inserted_at: "2026-01-15T10:30:00.000Z",
          meta_data: {
            favIcon: "https://abs.twimg.com/favicons/twitter.3.ico",
            twitter_avatar_url: "https://pbs.twimg.com/profile_images/avatar.jpg",
            video_url: "https://video.twimg.com/ext_tw_video/video.mp4",
          },
          ogImage: "https://pbs.twimg.com/media/full.jpg",
          sort_index: "1848019423856806627",
          title: "Full Tweet",
          type: "tweet",
          url: "https://www.x.com/testuser/status/1990000000000000001",
        },
      ],
    },
  },
  "batch-2-tweets": {
    description: "Sync two Twitter/X bookmarks in one request. Returns inserted: 2, skipped: 0.",
    summary: "Sync 2 tweets in a batch",
    value: {
      bookmarks: [
        {
          description: "First batch tweet",
          inserted_at: "2026-01-28T16:59:49.475Z",
          meta_data: {
            favIcon:
              "https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://x.com&size=128",
            twitter_avatar_url:
              "https://pbs.twimg.com/profile_images/1833509376528945157/5AeMNn9f_normal.jpg",
          },
          ogImage: null,
          sort_index: "1847926557696091535",
          title: "Modi",
          type: "tweet",
          url: "https://x.com/narendramodi/status/1984243645050945961",
        },
        {
          description: "Second batch tweet",
          inserted_at: "2026-01-28T16:59:54.475Z",
          meta_data: {
            favIcon:
              "https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://x.com&size=128",
            twitter_avatar_url:
              "https://pbs.twimg.com/profile_images/2008546467615580160/57KcqsTA_normal.jpg",
          },
          ogImage: null,
          sort_index: "1847927476774215422",
          title: "Musk",
          type: "tweet",
          url: "https://x.com/elonmusk/status/1985699323099713668",
        },
      ],
    },
  },
  "duplicate-detection": {
    description:
      "Send the same tweet URL as a prior sync. Returns inserted: 0, skipped: 1 if already stored.",
    summary: "Re-sync existing tweet (dedup)",
    value: {
      bookmarks: [
        {
          description:
            "BREAKING: SpaceX has announced that @Starlink now has over 8 million customers",
          inserted_at: "2026-01-20T08:53:32.394Z",
          meta_data: {
            favIcon:
              "https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://x.com&size=128",
            twitter_avatar_url:
              "https://pbs.twimg.com/profile_images/1837744842715082752/xH9vYixL_normal.jpg",
          },
          ogImage: "https://pbs.twimg.com/media/G5BK9fuXcAAXZ5Y.jpg",
          sort_index: "1848019423856806627",
          title: "Sawyer Merritt",
          type: "tweet",
          url: "https://x.com/SawyerMerritt/status/1986170355535286529",
        },
      ],
    },
  },
  "empty-bookmarks-array": {
    description: "Returns 400 — at least one bookmark is required.",
    summary: "Validation: empty bookmarks array",
    value: {
      bookmarks: [],
    },
  },
  "invalid-url-format": {
    description: "Returns 400 — url must be a valid URL.",
    summary: "Validation: invalid URL format",
    value: {
      bookmarks: [
        {
          description: "Test description",
          meta_data: {},
          sort_index: "1848019423856806630",
          title: "Invalid URL Test",
          type: "tweet",
          url: "not-a-valid-url",
        },
      ],
    },
  },
  "minimal-fields": {
    description:
      "Only required fields provided. title and description default to empty string, ogImage defaults to null.",
    summary: "Tweet with minimal fields (defaults applied)",
    value: {
      bookmarks: [
        {
          meta_data: {},
          sort_index: "1848019423856806628",
          type: "tweet",
          url: "https://x.com/testuser/status/1990000000000000002",
        },
      ],
    },
  },
  "missing-bookmarks-field": {
    description: "Returns 400 — bookmarks field is required.",
    summary: "Validation: missing bookmarks field",
    value: {},
  },
  "single-tweet": {
    description: "Sync a single Twitter/X bookmark. Returns inserted: 1, skipped: 0 on first sync.",
    summary: "Sync single tweet",
    value: {
      bookmarks: [
        {
          description:
            "BREAKING: SpaceX has announced that @Starlink now has over 8 million customers",
          inserted_at: "2026-01-20T08:53:32.394Z",
          meta_data: {
            favIcon:
              "https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://x.com&size=128",
            twitter_avatar_url:
              "https://pbs.twimg.com/profile_images/1837744842715082752/xH9vYixL_normal.jpg",
          },
          ogImage: "https://pbs.twimg.com/media/G5BK9fuXcAAXZ5Y.jpg",
          sort_index: "1848019423856806627",
          title: "Sawyer Merritt",
          type: "tweet",
          url: "https://x.com/SawyerMerritt/status/1986170355535286529",
        },
      ],
    },
  },
  "twitter-com-domain": {
    description:
      "Sync a bookmark from the legacy twitter.com domain. Both x.com and twitter.com are accepted.",
    summary: "Tweet from twitter.com domain",
    value: {
      bookmarks: [
        {
          description: "From twitter.com",
          inserted_at: "2026-01-28T16:59:49.475Z",
          meta_data: {},
          sort_index: "1848019423856806629",
          title: "Old Domain Tweet",
          type: "tweet",
          url: "https://twitter.com/testuser/status/1990000000000000003",
        },
      ],
    },
  },
} as const;

export const twitterSyncResponse200Examples = {
  "all-optional-fields": {
    description: "Tweet with video_url and all optional fields was stored successfully.",
    summary: "Tweet with all fields inserted",
    value: { data: { inserted: 1, skipped: 0 }, error: null },
  },
  "batch-2-tweets": {
    description: "Both tweets were new and stored successfully.",
    summary: "Batch of 2 inserted",
    value: { data: { inserted: 2, skipped: 0 }, error: null },
  },
  "duplicate-detection": {
    description: "The URL already exists in the database, so it's skipped to avoid duplicates.",
    summary: "Duplicate tweet skipped",
    value: { data: { inserted: 0, skipped: 1 }, error: null },
  },
  "minimal-fields": {
    description:
      "Only required fields were provided. Defaults applied for title, description, and ogImage.",
    summary: "Minimal tweet inserted",
    value: { data: { inserted: 1, skipped: 0 }, error: null },
  },
  "single-tweet": {
    description: "One new tweet bookmark accepted and stored.",
    summary: "Single tweet inserted",
    value: { data: { inserted: 1, skipped: 0 }, error: null },
  },
  "twitter-com-domain": {
    description: "Tweet from twitter.com domain accepted. Both x.com and twitter.com are valid.",
    summary: "Legacy domain tweet inserted",
    value: { data: { inserted: 1, skipped: 0 }, error: null },
  },
} as const;

export const twitterSyncResponse400Examples = {
  "empty-bookmarks-array": {
    description: "The bookmarks array must contain at least one item.",
    summary: "Empty array rejected",
    value: {
      data: null,
      error: "bookmarks: Array must contain at least 1 element(s)",
    },
  },
  "invalid-url-format": {
    description: "The url field must be a valid URL with a protocol.",
    summary: "Invalid URL rejected",
    value: {
      data: null,
      error: "bookmarks[0].url: Invalid url",
    },
  },
  "missing-bookmarks-field": {
    description: "The request body must include a bookmarks property.",
    summary: "Missing field rejected",
    value: {
      data: null,
      error: "bookmarks: Required",
    },
  },
} as const;
