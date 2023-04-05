import fs from "node:fs";
import { createRequire } from "node:module";
import { Octokit } from "@octokit/core";
import dedent from "dedent";
import { config } from "dotenv";
import { execa } from "execa";
import gitRemoteOriginUrl from "git-remote-origin-url";
import gitUrlParse from "git-url-parse";

// see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
config();

const require = createRequire(import.meta.url);
const packagejson = require("../package.json");

const getOldestCommitSinceLastTag = async () => {
	const gitCommandArgs = [
		"log",
		`v${packagejson.version}..HEAD`,
		'--format="%h %aI"',
		"--reverse",
	];
	const { stdout } = await execa("git", gitCommandArgs);
	const [commitResult] = stdout.split("\n");
	const [, commitHash, commitDate] =
		/^"?([\da-f]+)\s([\d+:T\\|-]*)"?$/u.exec(commitResult) || [];

	return { commitHash, commitDate };
};

const octokit = new Octokit({
	auth: `token ${process.env.GITHUB_TOKEN}`,
});

const getQueryString = (afterCursorString) =>
	dedent(
		`
			query getCommits($repo: String!, $owner: String!, $branchName: String!, $pageSize: Int!, $since: GitTimestamp!) {
			          repository(name: $repo, owner: $owner) {
			            ref(qualifiedName: $branchName) {
			              target { ... on Commit {
			                  history(first: $pageSize, since: $since ${afterCursorString}) {
			                    nodes { oid, author { user { login }}}
			                    pageInfo { hasNextPage, endCursor }
			        }}}}}}
		`,
	).trim();

(async () => {
	// https://github.com/lerna-lite/lerna-lite/blob/32d06de5106675127ec8c3a8138d3e343a5912c9/packages/version/src/conventional-commits/get-github-commits.ts
	const originUrl = await gitRemoteOriginUrl();
	const { commitDate } = await getOldestCommitSinceLastTag();

	const repo = gitUrlParse(originUrl);
	const remoteCommits = [];
	let afterCursor = "";
	let hasNextPage = false;

	do {
		const afterCursorString = afterCursor ? `, after: "${afterCursor}"` : "";
		const queryString = getQueryString(afterCursorString);

		const response = await octokit.graphql(queryString, {
			owner: repo.owner,
			repo: repo.name,
			afterCursor,
			branchName: "main",
			pageSize: 100,
			since: commitDate,
		});

		const historyData = "repository.ref.target.history"
			.split(".")
			.reduce((object, property) => object?.[property], response);
		const pageInfo = historyData?.pageInfo;
		hasNextPage = pageInfo?.hasNextPage ?? false;
		afterCursor = pageInfo?.endCursor ?? "";

		if (historyData?.nodes) {
			for (const commit of historyData.nodes) {
				if (commit?.oid && commit?.author) {
					remoteCommits.push({
						shortHash: commit.oid.slice(0, 7),
						login: commit?.author?.user?.login ?? "",
					});
				}
			}
		}
	} while (hasNextPage);

	// eslint-disable-next-line no-console
	console.log(
		"Github found",
		remoteCommits.length,
		"commits since last release timestamp",
		commitDate,
	);

	// eslint-disable-next-line node/no-sync
	fs.writeFileSync(
		"release-it/remote-commits.json",
		JSON.stringify(remoteCommits),
	);
})();
