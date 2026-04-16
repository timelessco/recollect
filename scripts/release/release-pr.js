import fs from "node:fs/promises";
import process from "node:process";

import {
  ancestorCheck,
  API_CHANGELOG_FILE,
  askConfirm,
  createReleasePrFlow,
  fetchRemote,
  getNextVersion,
  handleExistingReleaseBranch,
  preflight,
} from "./release-pr/helpers.js";
import { renderChangelog } from "./render-changelog.js";

const DRY_RUN = process.argv.includes("--dry-run");
const AUTO_YES = process.argv.includes("--yes") || process.argv.includes("-y");

const SOURCE_BRANCH = process.env.SOURCE_BRANCH ?? "dev";
const TARGET_BRANCH = process.env.TARGET_BRANCH ?? "main";
const REMOTE = process.env.REMOTE ?? "origin";

async function main() {
  await preflight();
  await fetchRemote(REMOTE);
  await handleExistingReleaseBranch({
    autoYes: AUTO_YES,
    dryRun: DRY_RUN,
    remote: REMOTE,
    targetBranch: TARGET_BRANCH,
  });
  await ancestorCheck({
    remote: REMOTE,
    sourceBranch: SOURCE_BRANCH,
    targetBranch: TARGET_BRANCH,
  });

  const { markdown } = await renderChangelog();
  if (!markdown) {
    console.log("No new commits. Nothing to release.");
    process.exit(0);
  }

  // Use stdout.write (not console.log) for byte-level fidelity — the renderer
  // emits a complete Markdown block and appending an extra trailing newline
  // would break the D-23 diff against release-it's output (Plan 04 gate).
  process.stdout.write(markdown);
  process.stdout.write("\n");

  const nextVersion = await getNextVersion();
  const releaseBranch = `release/v${nextVersion}`;
  const title = `chore(release): 🚀 Release v${nextVersion}`;

  console.log(`\nPR: ${releaseBranch} → ${TARGET_BRANCH}`);
  console.log(`Title: ${title}`);

  if (DRY_RUN) {
    const stat = await fs.stat(API_CHANGELOG_FILE).catch(() => null);
    if (stat && stat.size > 0) {
      console.log("\n[dry-run] Would post API changelog as PR comment.");
    }
    console.log("[dry-run] No branches created, no PR opened.");
    process.exit(0);
  }

  const proceed = await askConfirm({
    autoYes: AUTO_YES,
    message: "Create release branch and PR?",
  });
  if (!proceed) {
    console.log("Cancelled.");
    process.exit(0);
  }

  await createReleasePrFlow({
    markdown,
    releaseBranch,
    remote: REMOTE,
    sourceBranch: SOURCE_BRANCH,
    targetBranch: TARGET_BRANCH,
    title,
  });
}

try {
  await main();
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
