import type { KnipConfig } from "knip";

const config: KnipConfig = {
  entry: ["src/pages/**/*.{js,jsx,ts,tsx}!"],
  exclude: ["types", "duplicates", "exports", "files"],
  ignoreBinaries: [
    // release-it after:bump hook argument, not a real binary
    "oxfmt",
  ],
  ignoreDependencies: [
    // eslint@10 kept as transitive dep for jsPlugins using @typescript-eslint/utils
    "eslint",
    "oxfmt",
    "oxlint-tsgolint",
    "@tanstack/eslint-plugin-query",
    "eslint-plugin-perfectionist",
    "eslint-plugin-regexp",
    "eslint-plugin-react-dom",
    "eslint-plugin-react-naming-convention",
    "eslint-plugin-react-rsc",
    "eslint-plugin-react-web-api",
    "eslint-plugin-react-x",
  ],
  project: ["src/**/*.{ts,tsx}!"],
};

export default config;
