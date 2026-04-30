import fs from "node:fs/promises";
import process from "node:process";

import { confirm } from "@inquirer/prompts";
import { execa } from "execa";

export const API_CHANGELOG_FILE = "docs/API_CHANGELOG.md";

export async function askConfirm(props) {
  const { autoYes, message } = props;
  if (autoYes) {
    return true;
  }
  try {
    return await confirm({ message, default: false });
  } catch (error) {
    // Inquirer throws ExitPromptError on Ctrl-C; surface as cancellation so
    // the top-level catch exits non-zero with a stable message.
    throw new Error("Cancelled.", { cause: error });
  }
}

export async function preflight() {
  for (const cmd of ["gh", "git"]) {
    try {
      await execa(cmd, ["--version"]);
    } catch (error) {
      throw new Error(`${cmd} is not installed.`, { cause: error });
    }
  }
}

export async function fetchRemote(remote) {
  console.log(`Fetching latest from ${remote}...`);
  try {
    await execa("git", ["fetch", remote], { stdio: "inherit" });
  } catch (error) {
    throw new Error("git fetch failed.", { cause: error });
  }
}

export async function ancestorCheck(props) {
  const { remote, sourceBranch, targetBranch } = props;
  try {
    // git merge-base --is-ancestor exits non-zero when <target> is NOT an
    // ancestor of <source> — execa throws and we rewrap with a human message.
    await execa("git", [
      "merge-base",
      "--is-ancestor",
      `${remote}/${targetBranch}`,
      `${remote}/${sourceBranch}`,
    ]);
  } catch (error) {
    throw new Error(
      `${remote}/${targetBranch} has commits not in ${remote}/${sourceBranch}.\nMerge ${targetBranch} into ${sourceBranch} first to resolve divergence.`,
      { cause: error },
    );
  }
}

export async function getNextVersion() {
  // Invoke release-it's own `--release-version` flag via the resolved
  // node_modules binary (no pnpm script shim) — that pathway prints the
  // computed next version to stdout without mutating package.json. Overrides:
  //   --no-git.requireBranch         — .release-it.ts pins to `main`; this
  //                                    preview runs on `dev`, and the flag is
  //                                    a read-only query, not a release.
  //   --no-git.requireCommits        — ancestorCheck already guards empty
  //                                    diffs.
  //   --no-git.requireCleanWorkingDir — release-pr builds the branch from
  //                                    origin/dev; the local tree's state
  //                                    doesn't affect the computed bump.
  //   --hooks.before:init=           — skip the interactive `pnpm lint` hook;
  //                                    the caller runs its own lint pipeline.
  // Fail loudly on any error: falling back to package.json.version silently
  // ships a stale PR title (shipped v1.0.0 with a v0.6.0 branch once).
  const { stdout } = await execa("./node_modules/.bin/release-it", [
    "--release-version",
    "--no-git.requireBranch",
    "--no-git.requireCommits",
    "--no-git.requireCleanWorkingDir",
    "--hooks.before:init=",
  ]);
  const version = stdout.trim().split("\n").at(-1)?.trim();
  if (!version || !/^\d+\.\d+\.\d+/u.test(version)) {
    throw new Error(`release-it printed no parseable version. stdout: ${JSON.stringify(stdout)}`);
  }
  return version;
}

export async function postApiChangelogComment(prNumber) {
  const stat = await fs.stat(API_CHANGELOG_FILE).catch(() => null);
  if (!stat || stat.size === 0) {
    return;
  }
  const contents = await fs.readFile(API_CHANGELOG_FILE, "utf-8");
  const body = `## API Changelog\n\n${contents}`;
  await execa("gh", ["pr", "comment", String(prNumber), "--body", body], {
    stdio: "inherit",
  });
  console.log(`Posted API changelog as comment on PR #${prNumber}`);
}

export async function handleExistingReleaseBranch(props) {
  const { autoYes, dryRun, remote, targetBranch } = props;

  const { stdout } = await execa("git", ["branch", "-r", "--list", `${remote}/release/*`]);
  const branches = stdout.split(/\s+/u).filter(Boolean);

  if (branches.length > 1) {
    throw new Error(`multiple release branches found:\n${branches.join("\n")}`);
  }
  if (branches.length === 0) {
    return;
  }

  const prefix = `${remote}/`;
  const existingBranch = branches[0].startsWith(prefix)
    ? branches[0].slice(prefix.length)
    : branches[0];

  const prListResult = await execa("gh", [
    "pr",
    "list",
    "--head",
    existingBranch,
    "--base",
    targetBranch,
    "--state",
    "open",
    "--json",
    "number",
    "-q",
    ".[0].number",
  ]);
  const existingPr = prListResult.stdout.trim();

  if (!existingPr) {
    throw new Error(
      `stale release branch '${existingBranch}' exists without an open PR.\nRun: pnpm release:cleanup`,
    );
  }

  console.log(`Found existing release PR #${existingPr} (${existingBranch})`);

  if (dryRun) {
    console.log(
      `[dry-run] Would delete PR #${existingPr} and branch ${existingBranch}, then recreate.`,
    );
    return;
  }

  const proceed = await askConfirm({
    autoYes,
    message: "Delete and recreate release PR?",
  });
  if (!proceed) {
    console.log("Cancelled.");
    process.exit(0);
  }

  console.log(`Closing PR #${existingPr} and deleting ${existingBranch}...`);
  await execa("gh", ["pr", "close", existingPr, "--delete-branch"], {
    stdio: "inherit",
  });
  // Local branch may not exist (different clone); swallow that specific case.
  await execa("git", ["branch", "-d", existingBranch]).catch(() => null);
}

export async function createReleasePrFlow(props) {
  const { markdown, releaseBranch, remote, sourceBranch, targetBranch, title } = props;

  const { stdout: originalBranchRaw } = await execa("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  const originalBranch = originalBranchRaw.trim();

  // Clean up stale local branch from a previous aborted attempt so the
  // checkout below does not fail with "branch already exists".
  try {
    await execa("git", ["show-ref", "--verify", "--quiet", `refs/heads/${releaseBranch}`]);
    console.log(`Removing stale local branch: ${releaseBranch}`);
    await execa("git", ["branch", "-D", releaseBranch]);
  } catch {
    // show-ref exits non-zero when the branch does not exist — expected.
  }

  try {
    console.log(`Creating release branch: ${releaseBranch} from ${remote}/${sourceBranch}`);
    await execa("git", ["checkout", "-b", releaseBranch, `${remote}/${sourceBranch}`]);
    await execa("git", ["push", remote, releaseBranch], { stdio: "inherit" });

    const { stdout: prUrl } = await execa("gh", [
      "pr",
      "create",
      "--base",
      targetBranch,
      "--head",
      releaseBranch,
      "--title",
      title,
      "--label",
      "release",
      "--body",
      markdown,
    ]);

    const prNumberMatch = /\/pull\/(\d+)/u.exec(prUrl);
    const prNumber = prNumberMatch?.[1];
    if (!prNumber) {
      throw new Error(`Could not extract PR number from gh output:\n${prUrl}`);
    }

    await postApiChangelogComment(prNumber);

    console.log(prUrl.trim());
    console.log("Release PR created.");
  } catch (error) {
    console.error("Cleaning up release branch...");
    // Each cleanup step may fail independently (remote already gone, local
    // branch absent). Swallow only to avoid masking the original `error`.
    await execa("git", ["checkout", originalBranch]).catch(() => null);
    await execa("git", ["branch", "-D", releaseBranch]).catch(() => null);
    await execa("git", ["push", remote, "--delete", releaseBranch]).catch(() => null);
    throw error;
  }

  await execa("git", ["checkout", originalBranch]).catch(() => null);
}
