// @ts-check
// If you want to use the fully resolved Next.js
// configuration to resolve Serwist configuration,
// use `serwist.withNextConfig` instead.
import { spawnSync } from "node:child_process";

import { serwist } from "@serwist/next/config";

// This is optional!
// A revision helps Serwist version a precached page. This
// avoids outdated precached responses being used. Using
// `git rev-parse HEAD` might not the most efficient way
// of determining a revision, however. You may prefer to use
// the hashes of every extra file you precache.
const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout ?? crypto.randomUUID();

export default serwist.withNextConfig((nextConfig) => ({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // If you want to precache any other page that is not
  // already detected by Serwist, add them here. Otherwise,
  // delete `revision`.
  additionalPrecacheEntries: [{ url: "/precached", revision }],
  globIgnores: [
    `${nextConfig.distDir}/server/pages/**/*.json`,
    `${nextConfig.distDir}/server/app/ignored.html`,
  ],
}));
