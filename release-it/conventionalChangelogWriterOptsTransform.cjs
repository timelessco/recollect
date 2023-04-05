const { titleCase } = require("title-case");
const { resolve } = require("path");
const { readFileSync } = require("fs");
const remoteCommits = require("./remote-commits.json");

const types = [
	{ type: "feat", section: "⭐ New Features" },
	{ type: "fix", section: "🐞 Bug Fixes" },
	{
		type: "refactor",
		section: "♻️ Refactors",
	},
	{
		type: "perf",
		section: "⚡️ Performance Improvements",
	},
	{
		type: "docs",
		section: "📔 Documentation Changes",
	},
	{ type: "test", section: "🧪 Test Updates" },
	{ type: "build", section: "👷 Build Updates" },
	{ type: "ci", section: "💚 CI Changes" },
	{ type: "revert", section: "⏪️ Reverted Changes" },
	{
		type: "chore",
		section: "🔨 Maintenance Updates",
	},
	{ type: "style", section: "🎨 Other Changes" },
];

function findTypeEntry(types, commit) {
	const typeKey = (commit.revert ? "revert" : commit.type || "").toLowerCase();
	return types.find((entry) => {
		if (entry.type !== typeKey) {
			return false;
		}

		if (entry.scope && entry.scope !== commit.scope) {
			return false;
		}

		return true;
	});
}

const owner =
	"{{#if this.owner}}{{~this.owner}}{{else}}{{~@root.owner}}{{/if}}";
const host = "{{~@root.host}}";
const repository =
	"{{#if this.repository}}{{~this.repository}}{{else}}{{~@root.repository}}{{/if}}";

const commitUrlFormat = expandTemplate(
	"{{host}}/{{owner}}/{{repository}}/commit/{{hash}}",
	{
		host,
		owner,
		repository,
	},
);

function addBangNotes(commit, context) {
	const match = commit.header.match(/^(\w*)(?:\((.*)\))?!: (.*)$/);

	if (match) {
		const noteText = match[3]; // the description of the change.

		const commitHashUrl = `${context.host}/${context.owner}/${context.repository}/commit/${commit.hash}`;

		commit.notes.push({
			title: "🧨 BREAKING CHANGE",
			text: null,
			scope: commit?.scope
				? titleCase(commit.scope.replaceAll(".", " ")).replaceAll("-", " ")
				: null,
			body: commit?.body,
			header: noteText,
			shortHash: commit.shortHash,
			hashUrl: commitHashUrl,
		});

		// Remove the commit to the notable changes as it will be added as breaking change
		commit.body = null;
	}
}

function addNotableChanges(commit, context) {
	if (commit?.body) {
		const commitHashUrl = `${context.host}/${context.owner}/${context.repository}/commit/${commit.hash}`;

		context.notableChanges.push({
			scope: commit?.scope
				? titleCase(commit.scope.replaceAll(".", " ")).replaceAll("-", " ")
				: null,
			body: commit.body,
			shortHash: commit.shortHash,
			hashUrl: commitHashUrl,
		});
	}
}

// expand on the simple mustache-style templates supported in
// configuration (we may eventually want to use handlebars for this).
function expandTemplate(template, context) {
	let expanded = template;
	Object.keys(context).forEach((key) => {
		expanded = expanded.replace(new RegExp(`{{${key}}}`, "g"), context[key]);
	});
	return expanded;
}

const transform = (commit, context) => {
	// Remove commit body if it's author is a bot
	if (commit.authorName === "renovate[bot]") {
		commit.body = "";
	}

	const issues = [];
	const entry = findTypeEntry(types, commit);

	// adds additional breaking change notes
	// for the special case, test(system)!: hello world, where there is
	// a '!' but no 'BREAKING CHANGE' in body:
	addBangNotes(commit, context);

	commit.notes = commit.notes.filter((note) => note.text == null);

	context.hasNotableChanges = true;
	context.notableChangesTitle = "👀 Notable Changes";
	context.notableChanges = context.notableChanges || [];

	addNotableChanges(commit, context);

	if (context.notableChanges.length === 0) {
		context.hasNotableChanges = false;
	}

	if (entry) commit.type = entry.section;

	if (commit.scope === "*") {
		commit.scope = "";
	}

	if (typeof commit.hash === "string") {
		commit.shortHash = commit.hash.substring(0, 7);
	}

	if (typeof commit.subject === "string") {
		const issueRegEx = `([#].join("|"))` + `([0-9]+)`;
		const re = new RegExp(issueRegEx, "g");

		commit.subject = commit.subject.replace(re, (_, prefix, issue) => {
			issues.push(prefix + issue);

			const url = expandTemplate(
				"{{host}}/{{owner}}/{{repository}}/issues/{{id}}",
				{
					host: context.host,
					owner: context.owner,
					repository: context.repository,
					id: issue,
					prefix,
				},
			);

			return `[${prefix}${issue}](${url})`;
		});

		// User URLs.
		commit.subject = commit.subject.replace(
			/\B@([a-z0-9](?:-?[a-z0-9/]){0,38})/g,
			(_, user) => {
				// TODO: investigate why this code exists.
				if (user.includes("/")) {
					return `@${user}`;
				}

				const usernameUrl = expandTemplate("{{host}}/{{user}}", {
					host: context.host,
					owner: context.owner,
					repository: context.repository,
					user,
				});

				return `[@${user}](${usernameUrl})`;
			},
		);
	}

	// remove references that already appear in the subject
	commit.references = commit.references.filter((reference) => {
		if (issues.indexOf(reference.prefix + reference.issue) === -1) {
			return true;
		}

		return false;
	});

	const remoteCommit = remoteCommits.find(
		(c) => c.shortHash === commit.shortHash,
	);

	if (remoteCommit?.login) {
		commit.userLogin = remoteCommit.login;
	}

	return commit;
};

const template = readFileSync(
	resolve(__dirname, "./templates/template.hbs"),
	"utf-8",
);
const mainTemplate = template;

const commit = readFileSync(
	resolve(__dirname, "./templates/commit.hbs"),
	"utf-8",
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

const commitPartial = commit
	.replace(/{{commitUrlFormat}}/g, commitUrlFormat)
	.replace(/{{issueUrlFormat}}/g, issueUrlFormat);

const commitGroupsSort = (a, b) => {
	const commitGroupOrder = [
		"🎨 Other Changes",
		"💚 CI Changes",
		"🔨 Maintenance Updates",
		"📔 Documentation Changes",
		"🧪 Test Updates",
		"👷 Build Updates",
		"⏪️ Reverted Changes",
		"⚡️ Performance Improvements",
		"♻️ Refactors",
		"🐞 Bug Fixes",
		"⭐ New Features",
	];
	const gRankA = commitGroupOrder.indexOf(a.title);
	const gRankB = commitGroupOrder.indexOf(b.title);
	if (gRankA >= gRankB) {
		return -1;
	} else {
		return 1;
	}
};

module.exports = {
	transform,
	mainTemplate,
	commitPartial,
	commitGroupsSort,
};
