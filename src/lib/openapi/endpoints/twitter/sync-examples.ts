/**
 * @module Build-time only
 */

export const twitterSyncRequestExamples = {
	"single-tweet": {
		summary: "Sync single tweet",
		description:
			"Sync a single Twitter/X bookmark. Returns inserted: 1, skipped: 0 on first sync.",
		value: {
			bookmarks: [
				{
					url: "https://x.com/SawyerMerritt/status/1986170355535286529",
					title: "Sawyer Merritt",
					description:
						"BREAKING: SpaceX has announced that @Starlink now has over 8 million customers",
					type: "tweet",
					ogImage: "https://pbs.twimg.com/media/G5BK9fuXcAAXZ5Y.jpg",
					meta_data: {
						favIcon:
							"https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://x.com&size=128",
						twitter_avatar_url:
							"https://pbs.twimg.com/profile_images/1837744842715082752/xH9vYixL_normal.jpg",
					},
					inserted_at: "2026-01-20T08:53:32.394Z",
					sort_index: "1848019423856806627",
				},
			],
		},
	},
	"batch-2-tweets": {
		summary: "Sync 2 tweets in a batch",
		description:
			"Sync two Twitter/X bookmarks in one request. Returns inserted: 2, skipped: 0.",
		value: {
			bookmarks: [
				{
					url: "https://x.com/narendramodi/status/1984243645050945961",
					title: "Modi",
					description: "First batch tweet",
					type: "tweet",
					ogImage: null,
					meta_data: {
						favIcon:
							"https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://x.com&size=128",
						twitter_avatar_url:
							"https://pbs.twimg.com/profile_images/1833509376528945157/5AeMNn9f_normal.jpg",
					},
					inserted_at: "2026-01-28T16:59:49.475Z",
					sort_index: "1847926557696091535",
				},
				{
					url: "https://x.com/elonmusk/status/1985699323099713668",
					title: "Musk",
					description: "Second batch tweet",
					type: "tweet",
					ogImage: null,
					meta_data: {
						favIcon:
							"https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://x.com&size=128",
						twitter_avatar_url:
							"https://pbs.twimg.com/profile_images/2008546467615580160/57KcqsTA_normal.jpg",
					},
					inserted_at: "2026-01-28T16:59:54.475Z",
					sort_index: "1847927476774215422",
				},
			],
		},
	},
	"duplicate-detection": {
		summary: "Re-sync existing tweet (dedup)",
		description:
			"Send the same tweet URL as a prior sync. Returns inserted: 0, skipped: 1 if already stored.",
		value: {
			bookmarks: [
				{
					url: "https://x.com/SawyerMerritt/status/1986170355535286529",
					title: "Sawyer Merritt",
					description:
						"BREAKING: SpaceX has announced that @Starlink now has over 8 million customers",
					type: "tweet",
					ogImage: "https://pbs.twimg.com/media/G5BK9fuXcAAXZ5Y.jpg",
					meta_data: {
						favIcon:
							"https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://x.com&size=128",
						twitter_avatar_url:
							"https://pbs.twimg.com/profile_images/1837744842715082752/xH9vYixL_normal.jpg",
					},
					inserted_at: "2026-01-20T08:53:32.394Z",
					sort_index: "1848019423856806627",
				},
			],
		},
	},
	"all-optional-fields": {
		summary: "Tweet with all optional fields including video_url",
		description:
			"Sync a tweet that includes the optional video_url in meta_data and all other fields populated.",
		value: {
			bookmarks: [
				{
					url: "https://www.x.com/testuser/status/1990000000000000001",
					title: "Full Tweet",
					description: "Tweet with all fields including video",
					type: "tweet",
					ogImage: "https://pbs.twimg.com/media/full.jpg",
					sort_index: "1848019423856806627",
					inserted_at: "2026-01-15T10:30:00.000Z",
					meta_data: {
						favIcon: "https://abs.twimg.com/favicons/twitter.3.ico",
						twitter_avatar_url:
							"https://pbs.twimg.com/profile_images/avatar.jpg",
						video_url: "https://video.twimg.com/ext_tw_video/video.mp4",
					},
				},
			],
		},
	},
	"minimal-fields": {
		summary: "Tweet with minimal fields (defaults applied)",
		description:
			"Only required fields provided. title and description default to empty string, ogImage defaults to null.",
		value: {
			bookmarks: [
				{
					url: "https://x.com/testuser/status/1990000000000000002",
					type: "tweet",
					meta_data: {},
					sort_index: "1848019423856806628",
				},
			],
		},
	},
	"twitter-com-domain": {
		summary: "Tweet from twitter.com domain",
		description:
			"Sync a bookmark from the legacy twitter.com domain. Both x.com and twitter.com are accepted.",
		value: {
			bookmarks: [
				{
					url: "https://twitter.com/testuser/status/1990000000000000003",
					title: "Old Domain Tweet",
					description: "From twitter.com",
					type: "tweet",
					meta_data: {},
					sort_index: "1848019423856806629",
				},
			],
		},
	},
	"empty-bookmarks-array": {
		summary: "Validation: empty bookmarks array",
		description: "Returns 400 — at least one bookmark is required.",
		value: {
			bookmarks: [],
		},
	},
	"missing-bookmarks-field": {
		summary: "Validation: missing bookmarks field",
		description: "Returns 400 — bookmarks field is required.",
		value: {},
	},
	"invalid-url-format": {
		summary: "Validation: invalid URL format",
		description: "Returns 400 — url must be a valid URL.",
		value: {
			bookmarks: [
				{
					url: "not-a-valid-url",
					title: "Invalid URL Test",
					description: "Test description",
					type: "tweet",
					meta_data: {},
					sort_index: "1848019423856806630",
				},
			],
		},
	},
} as const;

export const twitterSyncResponse200Examples = {
	"single-tweet": {
		summary: "Single tweet inserted",
		value: { data: { inserted: 1, skipped: 0 }, error: null },
	},
	"batch-2-tweets": {
		summary: "Batch of 2 inserted",
		value: { data: { inserted: 2, skipped: 0 }, error: null },
	},
	"duplicate-detection": {
		summary: "Duplicate tweet skipped",
		value: { data: { inserted: 0, skipped: 1 }, error: null },
	},
	"all-optional-fields": {
		summary: "Tweet with all fields inserted",
		value: { data: { inserted: 1, skipped: 0 }, error: null },
	},
	"minimal-fields": {
		summary: "Minimal tweet inserted",
		value: { data: { inserted: 1, skipped: 0 }, error: null },
	},
	"twitter-com-domain": {
		summary: "Legacy domain tweet inserted",
		value: { data: { inserted: 1, skipped: 0 }, error: null },
	},
} as const;

export const twitterSyncResponse400Examples = {
	"empty-bookmarks-array": {
		summary: "Empty array rejected",
		value: {
			data: null,
			error: "bookmarks: Array must contain at least 1 element(s)",
		},
	},
	"missing-bookmarks-field": {
		summary: "Missing field rejected",
		value: {
			data: null,
			error: "bookmarks: Required",
		},
	},
	"invalid-url-format": {
		summary: "Invalid URL rejected",
		value: {
			data: null,
			error: "bookmarks[0].url: Invalid url",
		},
	},
} as const;
