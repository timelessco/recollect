/* eslint-disable no-template-curly-in-string */
const {
	mainTemplate,
	commitPartial,
	transform,
	commitGroupsSort,
} = require("./release-it/conventionalChangelogWriterOptsTransform.cjs");

module.exports = {
	hooks: {
		"before:init": [
			"npx turbo run lint:eslint lint:types lint:css lint:md lint:knip lint:package-json lint:spelling lint:prettier test",
		],
	},
	git: {
		requireBranch: "main",
		requireCommits: true,
		commitMessage: "🚀 Release v${version}",
		commitArgs: ["--no-verify", "-S"],
		tagArgs: ["-s"],
	},
	github: {
		releaseName: "Release v${version}",
		release: true,
		comments: {
			submit: true,
		},
	},
	npm: {
		publish: false,
	},
	plugins: {
		"@release-it/conventional-changelog": {
			preset: { name: "conventionalcommits" },
			infile: "CHANGELOG.md",
			gitRawCommitsOpts: {
				format:
					"%B%n-hash-%n%H%n-shortHash-%n%h%n-gitTags-%n%d%n-committerDate-%n%ci%n-authorName-%n%an%n-authorEmail-%n%ae%n-gpgStatus-%n%G?%n-gpgSigner-%n%GS",
			},
			writerOpts: {
				mainTemplate,
				commitPartial,
				transform,
				commitGroupsSort,
			},
		},
	},
};
