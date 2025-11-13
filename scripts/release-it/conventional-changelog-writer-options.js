import path from "node:path";
import { fileURLToPath } from "node:url";
import fsExtra from "fs-extra";

import { getGithubCommits } from "./get-commits-since-last-release.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let remoteCommits = [];

// Cache for remote commits to avoid multiple API calls
async function getRemoteCommits() {
	if (remoteCommits.length === 0) {
		remoteCommits = await getGithubCommits();
	}

	return remoteCommits;
}

const owner =
	"{{#if this.owner}}{{~this.owner}}{{else}}{{~@root.owner}}{{/if}}";
const host = "{{~@root.host}}";
const repository =
	"{{#if this.repository}}{{~this.repository}}{{else}}{{~@root.repository}}{{/if}}";
const issuePrefixes = ["#"];

const types = [
	{ type: "feat", section: "⭐ New Features" },
	{ type: "fix", section: "🐞 Bug Fixes" },
	{
		type: "refactor",
		section: "♻️  Code Refactoring",
	},
	{
		type: "perf",
		section: "⚡️  Performance Improvements",
	},
	{
		type: "docs",
		section: "📔 Documentation Changes",
	},
	{ type: "test", section: "🧪 Test Updates" },
	{ type: "build", section: "🛠️ Build Updates" },
	{ type: "ci", section: "💚 CI Changes" },
	{ type: "revert", section: "⏪️ Reverted Changes" },
	{
		type: "chore",
		section: "🔨 Maintenance Updates",
	},
	{ type: "style", section: "🎨 Code Style Changes" },
];

const findTypeEntry = (typesArgument, commitArgument) => {
	const typeKey = (
		commitArgument.revert ? "revert" : commitArgument.type || ""
	).toLowerCase();

	return typesArgument.find((entry) => {
		return (
			entry.type === typeKey &&
			(!entry.scope || entry.scope === commitArgument.scope)
		);
	});
};

// expand on the simple mustache-style templates supported in
// configuration (we may eventually want to use handlebars for this).
const expandTemplate = (templateArgument, context) => {
	let expanded = templateArgument;

	for (const key of Object.keys(context)) {
		// eslint-disable-next-line unicorn/prefer-string-replace-all
		expanded = expanded.replace(
			// Need to disable the rule here because of the runtime error - SyntaxError: Invalid regular expression: /{{host}}/: Lone quantifier brackets
			// eslint-disable-next-line require-unicode-regexp
			new RegExp(`{{${key}}}`, "g"),
			context[key],
		);
	}

	return expanded;
};

const commitUrlFormat = expandTemplate(
	"{{host}}/{{owner}}/{{repository}}/commit/{{hash}}",
	{
		host,
		owner,
		repository,
	},
);

/**
 * Generates a URL for a commit hash based on the provided context.
 * @param {object} context - The context object containing host, owner, and repository information.
 * @param {string} commitHash - The commit hash for which to generate the URL.
 * @returns {string} The URL for the specified commit hash.
 */
function generateCommitUrl(context, commitHash) {
	return `${context.host}/${context.owner}/${context.repository}/commit/${commitHash}`;
}

const addBreakingChanges = (commit, context) => {
	const breakingHeaderPatternRegex = /^\w*(?:\(.*\))?!: (.*)$/u;
	const match = breakingHeaderPatternRegex.exec(commit.header);

	if (match) {
		// the description of the change.
		const noteText = match[1];

		context.breakingChanges.push({
			scope: commit?.scope,
			body: commit?.body,
			subject: commit?.subject,
			header: noteText,
			shortHash: commit.shortHash,
			hashUrl: generateCommitUrl(context, commit.hash),
		});

		// Remove the commit to the notable changes as it will be added as breaking change
		commit.body = null;
	}
};

const addNotableChanges = (commit, context) => {
	// eslint-disable-next-line regexp/optimal-quantifier-concatenation
	const pattern = /^(?:feat|fix)\(.+\)?!?:\s.*$/u;
	const match = pattern.exec(commit.header);

	if (match && commit?.body) {
		context.notableChanges.push({
			scope: commit?.scope,
			body: commit.body,
			subject: commit?.subject,
			shortHash: commit.shortHash,
			hashUrl: generateCommitUrl(context, commit.hash),
		});
	}
};

const addOtherNotableChanges = (commit, context) => {
	// eslint-disable-next-line regexp/optimal-quantifier-concatenation
	const pattern = /^(?:refactor|perf|docs)\(.+\)?!?:\s.*$/u;
	const match = pattern.exec(commit.header);

	if (match && commit?.body) {
		context.otherNotableChanges.push({
			scope: commit?.scope,
			body: commit.body,
			subject: commit?.subject,
			shortHash: commit.shortHash,
			hashUrl: generateCommitUrl(context, commit.hash),
		});
	}
};

export const transform = async (commitOriginal, context) => {
	const commit = { ...commitOriginal };

	commit.body = commit?.body || commit?.footer;
	// Remove commit body if it's author is a bot
	if (commit.authorName === "renovate[bot]") {
		commit.body = "";
	}

	const issues = [];

	if (!commit?.type || !commit?.scope || !commit?.subject) {
		const typePattern = /^(\w*)(?:\((.*)\))?!?: (.*)$/;
		const match = typePattern.exec(commit.header);

		if (match) {
			commit.type = match[1];
			commit.scope = match[2];
			commit.subject = match[3];
		}
	}

	const entry = findTypeEntry(types, commit);

	context.hasBreakingChanges = true;
	context.breakingChangesTitle = "🧨 BREAKING CHANGE";
	context.breakingChanges = context.breakingChanges || [];
	// adds additional breaking change notes
	// for the special case, test(system)!: hello world, where there is
	// a '!' but no 'BREAKING CHANGE' in body:
	addBreakingChanges(commit, context);

	if (context.breakingChanges.length === 0) {
		context.hasBreakingChanges = false;
	}

	context.hasNotableChanges = true;
	context.notableChangesTitle = "👀 Notable Changes";
	context.notableChanges = context.notableChanges || [];

	addNotableChanges(commit, context);

	if (context.notableChanges.length === 0) {
		context.hasNotableChanges = false;
	}

	context.hasOtherNotableChanges = true;
	context.otherNotableChangesTitle = "📌 Other Notable Changes";
	context.otherNotableChanges = context.otherNotableChanges || [];

	addOtherNotableChanges(commit, context);

	if (context.otherNotableChanges.length === 0) {
		context.hasOtherNotableChanges = false;
	}

	if (entry) {
		commit.type = entry.section;
	}

	if (commit.scope === "*") {
		commit.scope = "";
	}

	if (typeof commit.hash === "string") {
		commit.shortHash = commit.hash.slice(0, 7);
	}

	if (typeof commit.subject === "string") {
		// Issue URLs.
		const issueRegEx = `(${issuePrefixes.join("|")})(\\d+)`;
		const re = new RegExp(issueRegEx, "gu");

		// eslint-disable-next-line unicorn/prefer-string-replace-all
		commit.subject = commit.subject.replace(re, (_, prefix, issue) => {
			issues.push(prefix + issue);

			const url = expandTemplate(
				"{{host}}/{{owner}}/{{repository}}/issues/{{id}}",
				{
					host: context.host,
					owner: context.owner,
					repository: context.repository,
					id: issue,
				},
			);

			return `[${prefix}${issue}](${url})`;
		});

		// User URLs.
		// eslint-disable-next-line unicorn/prefer-string-replace-all
		commit.subject = commit.subject.replace(
			/\B@([a-z\d](?:-?[a-z\d/]){0,38})/gu,
			(_, user) => {
				if (user.includes("/")) {
					return `@${user}`;
				}

				const usernameUrl = expandTemplate("{{host}}/{{user}}", {
					host: context.host,
					user,
				});

				return `[@${user}](${usernameUrl})`;
			},
		);
	}

	// remove references that already appear in the subject
	commit.references = commit.references.filter((reference) => {
		if (!issues.includes(reference.prefix + reference.issue)) {
			return true;
		}

		return false;
	});

	// Add GitHub user info
	const commits = await getRemoteCommits();
	const matchedRemoteCommit = commits.find(
		(remoteCommit) => remoteCommit.shortHash === commit.shortHash,
	);
	if (matchedRemoteCommit?.login) {
		commit.userLogin = matchedRemoteCommit.login;
	}

	return commit;
};

export const mainTemplate = fsExtra.readFileSync(
	path.resolve(__dirname, "./templates/template.hbs"),
	"utf8",
);

const commitTemplate = fsExtra.readFileSync(
	path.resolve(__dirname, "./templates/commit.hbs"),
	"utf8",
);

const issueUrlFormat = expandTemplate(
	"{{host}}/{{owner}}/{{repository}}/issues/{{id}}",
	{
		host,
		owner,
		repository,
		id: "{{this.issue}}",
		prefix: "{{this.prefix}}",
	},
);

export const commitPartial = commitTemplate
	.replaceAll("{{commitUrlFormat}}", commitUrlFormat)
	.replaceAll("{{issueUrlFormat}}", issueUrlFormat);

export function commitGroupsSort(a, b) {
	const commitGroupOrder = [
		"🎨 Code Style Changes",
		"💚 CI Changes",
		"🔨 Maintenance Updates",
		"🧪 Test Updates",
		"🛠️ Build Updates",
		"⏪️ Reverted Changes",
		"📔 Documentation Changes",
		"⚡️  Performance Improvements",
		"♻️  Code Refactoring",
		"🐞 Bug Fixes",
		"⭐ New Features",
	];
	const gRankA = commitGroupOrder.indexOf(a.title);
	const gRankB = commitGroupOrder.indexOf(b.title);

	return gRankA >= gRankB ? -1 : 1;
}
