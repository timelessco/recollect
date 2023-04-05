const prettierPluginPackagejson = require("prettier-plugin-packagejson");
const prettierPluginSortImports = require("@ianvs/prettier-plugin-sort-imports");
// Tailwind plugin should be last
const prettierPluginTailwindcss = require("prettier-plugin-tailwindcss");

module.exports = {
	// Plugins
	plugins: [
		prettierPluginPackagejson,
		prettierPluginTailwindcss,
		prettierPluginSortImports,
	],

	pluginSearchDirs: false,
	// @ianvs/prettier-plugin-sort-imports
	importOrder: [
		// Packages.
		// Things that start with a letter (or digit or underscore), or `@` followed by a letter.
		"^react$",
		"^react-dom$",
		"^next$",
		"^next/+",
		"^@?\\w",
		"",
		// Absolute imports and other imports such as Vue-style `@/foo`.
		// Anything that does not start with a dot.
		"^../",
		"",
		"^./",
		"",

		// Relative imports.
		// Anything that starts with two dots.

		// Style imports.
		"^.+\\.s?css$",
	],
	importOrderSortSpecifiers: true,
	importOrderCaseInsensitive: true,
	importOrderMergeDuplicateImports: true,
	importOrderCombineTypeAndValueImports: true,
	importOrderBuiltinModulesToTop: true,
	importOrderParserPlugins: ["typescript", "jsx", "decorators-legacy"],

	// max 80 characters per line
	// default
	// printWidth: 80,

	// use 2 spaces for indentation
	// default
	// tabWidth: 2,

	// use spaces instead of indentations
	// https://github.com/prettier/prettier/issues/7475
	useTabs: true,

	// semicolon at the end of the line
	// default
	// semi: true,

	// use single quotes
	// default
	// singleQuote: false,

	// object's key is quoted only when necessary
	// default
	// quoteProps: "as-needed",

	// use double quotes instead of single quotes in jsx
	// default
	// jsxSingleQuote: false,

	// no comma at the end
	trailingComma: "all",

	// spaces are required at the beginning and end of the braces
	// default
	// bracketSpacing: true,

	// brackets are not required for arrow function parameter, when there is only one parameter
	// default
	// arrowParens: "always",

	// format the entire contents of the file
	// default
	// rangeStart: 0,
	// default
	// rangeEnd: Infinity,

	// no need to write the beginning @prettier of the file
	// default
	// requirePragma: false,

	// No need to automatically insert @prettier at the beginning of the file
	// default
	// insertPragma: false,

	// use default break criteria
	proseWrap: "always",

	// decide whether to break the html according to the display style
	// default
	// htmlWhitespaceSensitivity: "css",

	// vue files script and style tags indentation
	// default
	// vueIndentScriptAndStyle: false,

	// lf for newline
	// default
	// endOfLine: "lf",

	// formats quoted code embedded
	// default
	// embeddedLanguageFormatting: "auto",

	// Enforce single attribute per line in HTML, Vue and JSX.
	// default
	// singleAttributePerLine: false,

	overrides: [
		{
			files: ".*rc",
			options: { parser: "json" },
		},
	],
};
