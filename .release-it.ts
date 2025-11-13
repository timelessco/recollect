import { type Config } from "release-it";

import {
	commitGroupsSort,
	commitPartial,
	mainTemplate,
	transform,
} from "./scripts/release-it/conventional-changelog-writer-options.js";

export default {
	git: {
		commitArgs: ["--no-verify", "-S"],
		// eslint-disable-next-line no-template-curly-in-string
		commitMessage: "🚀 Release v${version}",
		requireBranch: "main",
		requireCleanWorkingDir: false,
		requireCommits: true,
		tagArgs: ["-s"],
	},
	github: {
		comments: { submit: true },
		release: true,
		// eslint-disable-next-line no-template-curly-in-string
		releaseName: "Release v${version}",
	},
	hooks: { "before:init": ["pnpm lint"] },
	npm: { publish: false },
	plugins: {
		"@release-it/conventional-changelog": {
			gitRawCommitsOpts: {
				format:
					"%B%n-hash-%n%H%n-shortHash-%n%h%n-gitTags-%n%d%n-committerDate-%n%ci%n-authorName-%n%an%n-authorEmail-%n%ae%n",
			},
			// ignoreRecommendedBump: true,
			infile: "CHANGELOG.md",
			preset: { name: "conventionalcommits" },
			writerOpts: {
				commitGroupsSort,
				commitPartial,
				mainTemplate,
				transform,
			},
		},
	},
} satisfies Config;
