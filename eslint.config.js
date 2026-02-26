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
import * as packageJson from "eslint-plugin-package-json";
import reactRefresh from "eslint-plugin-react-refresh";
import * as yml from "eslint-plugin-yml";
import { defineConfig, globalIgnores } from "eslint/config";

const gitignorePath = fileURLToPath(new URL(".gitignore", import.meta.url));

export default defineConfig(
	includeIgnoreFile(gitignorePath, "Imported .gitignore patterns"),
	globalIgnores([
		"pnpm-lock.yaml",
		"public/",
		".next/",
		".claude/",
		"next-env.d.ts",
		"scripts/release-it/",
		"supabase/functions/",
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
	{
		rules: {
			// Eslint
			"no-console": "off",
			"arrow-body-style": ["error", "as-needed"],
			"func-style": "off",

			// Unicorn
			"unicorn/prevent-abbreviations": "off",

			// Canonical
			"canonical/destructuring-property-newline": "off",
			"canonical/filename-match-exported": "off",
			"canonical/filename-match-regex": "off",
			"canonical/id-match": "off",
			"canonical/import-specifier-newline": "off",
			"canonical/sort-keys": "off",
			"canonical/export-specifier-newline": "off",

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
			"@typescript-eslint/consistent-type-definitions": "off",
			"@typescript-eslint/promise-function-async": "off",
			"@typescript-eslint/no-shadow": "off",

			// React
			"react/prefer-read-only-props": "off",
			"react/forbid-component-props": "off",
			"react/function-component-definition": "off",

			// TODO: Remove this rule later
			"no-negated-condition": "off",
			"no-warning-comments": "off",
			complexity: "off",
			"simple-import-sort/imports": "off",
			"unicorn/no-array-reduce": "off",
			"unicorn/numeric-separators-style": "off",
			"zod/require-strict": "off",
			"zod/require-schema-suffix": "off",
			"zod/consistent-object-schema-type": "off",
			"@typescript-eslint/prefer-nullish-coalescing": "off",
			"@typescript-eslint/no-useless-default-assignment": "off",
			"canonical/sort-react-dependencies": "off",
			"react-refresh/only-export-components": "off",
			"react-hooks/preserve-manual-memoization": "off",
			// TODO: fix this in priority
			"react/prop-types": "off",
			"react-hooks/set-state-in-effect": "off",
		},
	},

	packageJson.configs.recommended,
	{
		extends: [jsonc.configs["flat/recommended-with-json"]],
		files: ["**/*.{json}"],
	},
	{
		extends: [jsonc.configs["flat/recommended-with-jsonc"]],
		files: ["**/*.{jsonc}"],
	},
	jsonc.configs["flat/prettier"],
	...yml.configs.recommended,
	{
		rules: {
			"yml/file-extension": ["error", { extension: "yml" }],
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

	// Build-time only: prevent runtime code from importing the OpenAPI registry module
	// which mutates Zod's prototype and pulls in devDependencies.
	{
		files: ["src/**/*.ts", "src/**/*.tsx"],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group: ["@/lib/openapi/*", "@/lib/openapi"],
							message:
								"src/lib/openapi/ is build-time only. Import schemas from route schema.ts files instead.",
						},
					],
				},
			],
		},
	},
	{
		files: ["src/lib/openapi/**/*.ts"],
		rules: {
			"no-restricted-imports": "off",
		},
	},
);
