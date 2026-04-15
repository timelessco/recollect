import process from "node:process";

import { Octokit } from "@octokit/core";
import { config } from "dotenv";
import { execa } from "execa";
import gitRemoteOriginUrl from "git-remote-origin-url";
import gitUrlParse from "git-url-parse";

config({ quiet: true });

const SECTION_TITLES = {
  feat: "New Features",
  fix: "Bug Fixes",
  refactor: "Code Refactoring",
  perf: "Performance Improvements",
  docs: "Documentation Changes",
  test: "Test Updates",
  build: "Build Updates",
  ci: "CI Changes",
  revert: "Reverted Changes",
  chore: "Maintenance Updates",
  style: "Code Style Changes",
};
const SECTION_ORDER = [
  "feat",
  "fix",
  "refactor",
  "perf",
  "docs",
  "test",
  "build",
  "ci",
  "revert",
  "chore",
  "style",
];
const RELEASE_COMMIT_FILTER = /^(?:feat\(release\): 🚀|🚀 Release v)/u;
const CONVENTIONAL_HEADER = /^([a-z]+)(?:\(.+\))?!?: .+$/u;
const BREAKING_HEADER = /^\w+(?:\(.+\))?!:/u;
const CHUNK_SIZE = 50;

// process.env used intentionally — release script, GITHUB_TOKEN not in env schema
async function getAuthToken() {
  if (process.env.GITHUB_TOKEN) {
    return process.env.GITHUB_TOKEN;
  }
  const { stdout } = await execa("gh", ["auth", "token"]);
  return stdout.trim();
}

async function resolveRepo() {
  const originUrl = await gitRemoteOriginUrl();
  const parsed = gitUrlParse(originUrl);
  return { owner: parsed.owner, repo: parsed.name };
}

async function deriveRange() {
  const { stdout: tags } = await execa("git", [
    "tag",
    "--sort=-version:refname",
    "--merged",
    "main",
  ]);
  const lastTag = tags.split("\n").find(Boolean);
  if (lastTag) {
    return `${lastTag}..HEAD`;
  }
  const { stdout: base } = await execa("git", ["merge-base", "main", "HEAD"]);
  return `${base.trim()}..HEAD`;
}

async function collectCommits(range) {
  const { stdout } = await execa("git", ["log", "--pretty=format:%H %s", "--no-merges", range]);
  if (!stdout) {
    return [];
  }
  const lines = stdout.split("\n").filter(Boolean);
  const commits = [];
  for (const line of lines) {
    const spaceIndex = line.indexOf(" ");
    if (spaceIndex === -1) {
      continue;
    }
    commits.push({
      hash: line.slice(0, spaceIndex),
      subject: line.slice(spaceIndex + 1),
    });
  }
  return commits;
}

function buildAliasedQuery({ chunk, owner, repo }) {
  const aliases = chunk
    .map(
      (c, idx) =>
        `c${idx}: object(expression: "${c.hash}") { ... on Commit { author { user { login } } associatedPullRequests(first: 1) { nodes { number title author { login } } } } }`,
    )
    .join(" ");
  return `query { repository(name: "${repo}", owner: "${owner}") { ${aliases} } }`;
}

async function fetchCommitsViaGraphQL(props) {
  const { commits, octokit, owner, repo } = props;
  const byHash = new Map();
  for (let i = 0; i < commits.length; i += CHUNK_SIZE) {
    const chunk = commits.slice(i, i + CHUNK_SIZE);
    const query = buildAliasedQuery({ chunk, owner, repo });
    let response;
    try {
      response = await octokit.graphql(query);
    } catch (error) {
      const first = chunk[0].hash.slice(0, 7);
      const last = chunk.at(-1).hash.slice(0, 7);
      throw new Error(`GraphQL chunk failed for ${first}..${last}: ${error.message}`, {
        cause: error,
      });
    }
    const repository = response?.repository ?? {};
    for (const [alias, value] of Object.entries(repository)) {
      if (!value) {
        continue;
      }
      const idx = Number(alias.slice(1));
      const commit = chunk[idx];
      if (!commit) {
        continue;
      }
      const pr = value.associatedPullRequests?.nodes?.[0] ?? null;
      byHash.set(commit.hash, {
        hash: commit.hash,
        subject: commit.subject,
        prNumber: pr?.number ?? null,
        prTitle: pr?.title ?? null,
        prAuthor: pr?.author?.login ?? null,
        commitLogin: value.author?.user?.login ?? null,
      });
    }
  }
  return byHash;
}

function formatEntry(props) {
  const { record, owner, repo } = props;
  const { hash, subject, prNumber, prTitle, prAuthor, commitLogin } = record;

  const source = prNumber && prTitle ? prTitle : subject;
  let header = source;
  if (BREAKING_HEADER.test(header)) {
    header = `**BREAKING:** ${header}`;
  }

  const link = prNumber
    ? `[#${prNumber}](https://github.com/${owner}/${repo}/pull/${prNumber})`
    : `[${hash.slice(0, 7)}](https://github.com/${owner}/${repo}/commit/${hash})`;

  const login = prAuthor ?? commitLogin;
  if (!login) {
    throw new Error(
      `Cannot resolve GitHub login for commit ${hash}. PR author and commit author login both empty.`,
    );
  }

  const match = CONVENTIONAL_HEADER.exec(source);
  const type = match?.[1] ?? null;

  return { type, line: `* ${header} (${link}) — @${login}` };
}

export async function renderChangelog(opts = {}) {
  const { owner, repo } = await resolveRepo();
  const range = opts.range ?? (await deriveRange());
  const rawCommits = await collectCommits(range);
  const commits = rawCommits.filter((c) => !RELEASE_COMMIT_FILTER.test(c.subject));
  if (commits.length === 0) {
    return { markdown: "", sections: [] };
  }

  const octokit = new Octokit({ auth: await getAuthToken() });
  const enriched = await fetchCommitsViaGraphQL({
    commits,
    octokit,
    owner,
    repo,
  });

  const seenPrs = new Set();
  const bucketsByType = new Map();
  const otherBucket = [];

  for (const commit of commits) {
    const record = enriched.get(commit.hash);
    if (!record) {
      continue;
    }
    // A commit may resolve to a release PR via GraphQL enrichment (e.g. a
    // direct commit on the release branch). Release PRs collapse many
    // commits under one title that matches RELEASE_COMMIT_FILTER — adopting
    // that title would hide the real change. Drop the PR association and
    // render as a direct commit with its own subject.
    const isReleasePrAssociation = record.prTitle && RELEASE_COMMIT_FILTER.test(record.prTitle);
    const effective = isReleasePrAssociation
      ? { ...record, prNumber: null, prTitle: null, prAuthor: null }
      : record;
    if (effective.prNumber !== null) {
      if (seenPrs.has(effective.prNumber)) {
        continue;
      }
      seenPrs.add(effective.prNumber);
    }
    const { type, line } = formatEntry({ record: effective, owner, repo });
    if (type === null || !(type in SECTION_TITLES)) {
      otherBucket.push(line);
      continue;
    }
    if (!bucketsByType.has(type)) {
      bucketsByType.set(type, []);
    }
    bucketsByType.get(type).push(line);
  }

  const sections = [];
  for (const type of SECTION_ORDER) {
    const lines = bucketsByType.get(type);
    if (lines && lines.length > 0) {
      sections.push({ type, title: SECTION_TITLES[type], entries: lines });
    }
  }
  if (otherBucket.length > 0) {
    sections.push({ type: "other", title: "Other", entries: otherBucket });
  }

  const markdown = sections.map((s) => `### ${s.title}\n\n${s.entries.join("\n")}`).join("\n\n");
  return { markdown, sections };
}

if (process.argv[1] === import.meta.filename) {
  const { markdown } = await renderChangelog();
  process.stdout.write(markdown);
}
