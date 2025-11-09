import { fileURLToPath } from "node:url";
import { includeIgnoreFile } from "@eslint/compat";
import next from "@next/eslint-plugin-next";
import reactQuery from "@tanstack/eslint-plugin-query";
import * as typescriptParser from "@typescript-eslint/parser";
import {
	browser,
	canonical,
	jsdoc,
	moduleRules,
	node,
	react,
	regexp,
	typescript,
	zod,
} from "eslint-config-canonical";
import * as jsxA11y from "eslint-config-canonical/jsx-a11y";
import * as reactHooks from "eslint-config-canonical/react-hooks";
import * as typescriptTypeChecking from "eslint-config-canonical/typescript-type-checking";
import prettier from "eslint-config-prettier/flat";
import jsonc from "eslint-plugin-jsonc";
import packageJson from "eslint-plugin-package-json";
import reactRefresh from "eslint-plugin-react-refresh";
import tailwind from "eslint-plugin-tailwindcss";
import yml from "eslint-plugin-yml";
import { defineConfig, globalIgnores } from "eslint/config";

const gitignorePath = fileURLToPath(new URL(".gitignore", import.meta.url));

export default defineConfig(
	includeIgnoreFile(gitignorePath, "Imported .gitignore patterns"),
	globalIgnores([
		"pnpm-lock.yaml",
		"public/",
		".next/",
		"next-env.d.ts",
		"release-it/",
	]),
	{
		linterOptions: {
			reportUnusedDisableDirectives: "error",
		},
	},
	jsdoc.recommended,
	regexp.recommended,
	canonical.recommended,
	{
		rules: {
			// TODO: Remove this rule later
			"perfectionist/sort-objects": "off",
			"perfectionist/sort-imports": "off",
			"perfectionist/sort-modules": "off",
			"perfectionist/sort-named-imports": "off",
			"perfectionist/sort-union-types": "off",
			"perfectionist/sort-object-types": "off",
			"perfectionist/sort-interfaces": "off",
			"perfectionist/sort-array-includes": "off",
			"perfectionist/sort-switch-case": "off",
			"perfectionist/sort-jsx-props": "off",
		},
		settings: {
			perfectionist: { partitionByComment: true, type: "natural" },
		},
	},
	node.recommended,
	moduleRules.recommended,
	browser.recommended,
	typescript.recommended,
	{
		files: ["**/*.{ts,tsx}"],
		extends: [typescriptTypeChecking.recommended],
		languageOptions: {
			parser: typescriptParser,
			parserOptions: { projectService: true },
		},
	},
	jsxA11y.recommended,
	react.recommended,
	reactHooks.recommended,
	reactRefresh.configs.recommended,
	next.configs["core-web-vitals"],
	reactQuery.configs["flat/recommended"],
	zod.recommended,
	// TODO: Add lodash recommended later
	// lodash.recommended,
	...tailwind.configs["flat/recommended"],
	{
		rules: {
			// Eslint
			"no-console": "off",
			"arrow-body-style": ["error", "as-needed"],

			// Unicorn
			"unicorn/prevent-abbreviations": "off",

			// Canonical
			"canonical/destructuring-property-newline": "off",
			"canonical/filename-match-exported": "off",
			"canonical/filename-match-regex": "off",
			"canonical/id-match": "off",
			"canonical/import-specifier-newline": "off",
			"canonical/sort-keys": "off",

			// Import
			"import/no-extraneous-dependencies": "off",
			"import/no-named-as-default": "off",
			"import/no-unassigned-import": [
				"error",
				{
					allow: ["**/*.css"],
				},
			],

			// Node
			"n/no-process-env": "off",

			// Typescript rules
			"@typescript-eslint/naming-convention": "off",
			"@typescript-eslint/no-use-before-define": "off",

			// React
			"react/prefer-read-only-props": "off",
			"react/forbid-component-props": "off",

			// TODO: Remove this rule later
			"no-negated-condition": "off",
			"no-warning-comments": "off",
			complexity: "off",
			"simple-import-sort/imports": "off",
			"unicorn/no-array-reduce": "off",
			"unicorn/numeric-separators-style": "off",
			"zod/require-strict": "off",
			"@typescript-eslint/prefer-nullish-coalescing": "off",
			"canonical/sort-react-dependencies": "off",
			"react-refresh/only-export-components": "off",
			"react-hooks/preserve-manual-memoization": "off",
			// ! TODO: fix this in priority
			"react/prop-types": "off",
			"react-hooks/set-state-in-effect": "off",
		},
	},
	// eslint-disable-next-line import/no-named-as-default-member
	packageJson.configs.recommended,
	{
		files: ["**/*.{json,jsonc}", ".vscode/**"],
		extends: [
			jsonc.configs["flat/recommended-with-json"],
			jsonc.configs["flat/recommended-with-jsonc"],
			jsonc.configs["flat/prettier"],
		],
		rules: {
			"jsonc/no-comments": "off",
		},
	},
	{
		extends: [yml.configs["flat/standard"], yml.configs["flat/prettier"]],
		files: ["**/*.{yml,yaml}"],
		rules: {
			"yml/file-extension": ["off"],
			"yml/sort-keys": [
				"error",
				{ order: { type: "asc" }, pathPattern: "^.*$" },
			],
			"yml/sort-sequence-values": [
				"error",
				{ order: { type: "asc" }, pathPattern: "^.*$" },
			],
		},
	},
	prettier,
);

// /**
//  * @type {import('@typescript-eslint/experimental-utils').TSESLint.Linter.Config}
//  */
// module.exports = {
// 	ignorePatterns: ["!**/.*"],
// 	overrides: [
// 		{
// 			files: ["*.js", "*.cjs"],
// 			extends: [
// 				"canonical",
// 				"canonical/node",
// 				"canonical/regexp",
// 				"canonical/jsdoc",
// 				"canonical/zod",
// 				"prettier",
// 			],
// 			settings: {
// 				jsdoc: {
// 					mode: "typescript",
// 				},
// 			},
// 			rules: {
// 				...commonNodeIgnoredRules,
// 				"import/extensions": [
// 					"error",
// 					"always",
// 					{
// 						ignorePackages: true,
// 					},
// 				],
// 			},
// 			overrides: [
// 				{
// 					files: ["*.js"],
// 					extends: ["canonical/module"],
// 				},
// 			],
// 		},
// 		{
// 			files: ["./*.ts", "env/*.ts"],
// 			excludedFiles: ["next-env.d.ts", "sentry.client.config.ts"],
// 			extends: [
// 				"canonical",
// 				"canonical/node",
// 				"canonical/module",
// 				"canonical/typescript",
// 				"canonical/typescript-type-checking",
// 				"canonical/jsdoc",
// 				"canonical/regexp",
// 				"canonical/zod",
// 				"prettier",
// 			],
// 			parserOptions: {
// 				project: "./tsconfig.json",
// 			},
// 			settings: {
// 				jsdoc: {
// 					mode: "typescript",
// 				},
// 			},
// 			rules: {
// 				...commonNodeIgnoredRules,
// 				...commonTypescriptIgnoredRules,
// 			},
// 		},
// 		{
// 			files: ["src/**/*.{ts,tsx}"],
// 			extends: [
// 				"canonical",
// 				"canonical/browser",
// 				"canonical/module",
// 				"canonical/typescript",
// 				"canonical/typescript-type-checking",
// 				"canonical/zod",
// 				"canonical/regexp",
// 				"plugin:@next/next/core-web-vitals",
// 				"prettier",
// 			],
// 			parserOptions: {
// 				project: "./tsconfig.json",
// 			},
// 			rules: {
// 				...commonIgnoredRules,
// 				...commonTypescriptIgnoredRules,
// 			},
// 			overrides: [
// 				{
// 					files: ["*.ts"],
// 					extends: ["canonical/jsdoc"],
// 					settings: {
// 						jsdoc: {
// 							mode: "typescript",
// 						},
// 					},
// 				},
// 				{
// 					files: ["*.tsx", "use*.ts"],
// 					extends: [
// 						"canonical/react",
// 						"canonical/jsx-a11y",
// 						"plugin:tailwindcss/recommended",
// 					],
// 					parserOptions: {
// 						ecmaFeatures: {
// 							jsx: true,
// 						},
// 					},
// 					rules: {
// 						// To support dynamic import
// 						"promise/prefer-await-to-then": "off",
// 						"@typescript-eslint/promise-function-async": "off",
// 						// Other react rules
// 						"react/hook-use-state": "off",
// 						"react/jsx-indent": ["error", "tab"],
// 						"react/jsx-indent-props": ["error", "tab"],
// 						"react/forbid-component-props": "off",
// 						"react/prop-types": "off",
// 						"react/jsx-handler-names": "off",
// 						"react/jsx-curly-newline": "off",
// 						"react/prefer-read-only-props": "off",
// 					},
// 					settings: {
// 						tailwindcss: {
// 							config: "tailwind.config.cjs",
// 						},
// 					},
// 				},
// 			],
// 		},
// 	],
// };
