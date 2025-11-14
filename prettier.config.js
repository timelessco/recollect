// Base plugins for all files (excluding sort-imports)
const basePlugins = [
	"prettier-plugin-packagejson",
	"prettier-plugin-curly",
	"prettier-plugin-sh",
	"prettier-plugin-tailwindcss",
];

// All plugins including sort-imports for JS/TS files
const allPlugins = [
	"prettier-plugin-packagejson",
	"prettier-plugin-curly",
	"prettier-plugin-sh",
	"@ianvs/prettier-plugin-sort-imports",
	"prettier-plugin-tailwindcss",
];

/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
const config = {
	overrides: [
		{ files: ".nvmrc", options: { parser: "yaml" } },
		{ files: ".npmrc", options: { parser: "yaml" } },
		{
			files: ["*.jsonc"],
			options: {
				trailingComma: "none",
			},
		},
		// Apply all plugins (including sort-imports) to JS/TS files
		{
			files: ["*.js", "*.jsx", "*.ts", "*.tsx", "*.mjs", "*.cjs"],
			options: {
				// importOrder: [
				// 	"",
				// 	"<BUILTIN_MODULES>",
				// 	"",
				// 	"",
				// 	"^(react/(.*)$)|^(react$)",
				// 	"^(next/(.*)$)|^(next$)",
				// 	"<THIRD_PARTY_MODULES>",
				// 	"",
				// 	"^types$",
				// 	"^@/lib/(.*)$",
				// 	"^@/ui/(.*)$",
				// 	"^@/components/(.*)$",
				// 	"^@/hooks/(.*)$",
				// 	"^@/stores/(.*)$",
				// 	"^@/icons/(.*)$",
				// 	"^@/utils/(.*)$",
				// 	"^@/styles/(.*)$",
				// 	"^@/app/(.*)$",
				// 	"^@(/.*)$",
				// 	"",
				// 	"^[../]",
				// 	"",
				// 	"^[./]",
				// 	"",
				// 	String.raw`^.+\.s?css$`,
				// ],
				importOrder: [
					"^react$",
					"^react-dom$",
					"^next$",
					"^next/+",
					"^@?\\w",
					"",
					"^../",
					"",
					"^./",
					"",
					"^.+\\.s?css$",
				],
				importOrderParserPlugins: [
					"typescript",
					"jsx",
					"decorators-legacy",
					"importAssertions",
				],
				plugins: allPlugins,
			},
		},
		// Apply only base plugins to markdown files (excluding sort-imports)
		{
			files: ["*.md", "*.mdx"],
			options: {
				plugins: basePlugins,
			},
		},
	],
	// Default plugins for all files
	plugins: basePlugins,
	tailwindFunctions: ["tcx"],
	// tailwindStylesheet: "./src/styles/globals.css",
	useTabs: true,
};

export default config;
