/** @type {import('npm-check-updates').RunOptions} */
module.exports = {
	reject: [
		// VSCode formatter regression — https://github.com/prettier/prettier-vscode/issues/3796
		"prettier-plugin-sh",

		// Blocked until eslint-config-canonical and its transitive plugins ship ESLint 10 support
		"eslint",
		"@eslint/js",

		// v10.x has whatBump bug — https://github.com/release-it/conventional-changelog/issues/107
		"@release-it/conventional-changelog",
	],
};
