/** @type {import('stylelint').Config} */
export default {
	allowEmptyInput: true,
	extends: ["stylelint-config-standard", "stylelint-config-clean-order"],
	reportInvalidScopeDisables: true,
	reportNeedlessDisables: true,

	// Add your own rules here
	rules: {
		/**
		 * selector class pattern must match [BEM CSS](https://en.bem.info/methodology/css) - [Regex](https://regexr.com/3apms)
		 */
		// "selector-class-pattern": [
		// 	"^[a-z]([-]?[a-z0-9]+)*(__[a-z0-9]([-]?[a-z0-9]+)*)?(--[a-z0-9]([-]?[a-z0-9]+)*)?$",
		// 	{
		// 		/**
		// 		 * This option will resolve nested selectors with & interpolation. - https://stylelint.io/user-guide/rules/selector-class-pattern/#resolvenestedselectors-true--false-default-false
		// 		 */
		// 		resolveNestedSelectors: true,
		// 		/* Custom message */
		// 		message: (selectorValue) =>
		// 			`Expected class selector "${selectorValue}" to match BEM CSS pattern https://en.bem.info/methodology/css. Selector validation tool: https://regexr.com/3apms`,
		// 	},
		// ],
		// "selector-id-pattern": [
		// 	"^[a-z]([a-z0-9-])(__([a-z0-9]+-?)+)?(--([a-z0-9]+-?)+){0,2}$|^__[a-z]([a-z0-9-]+)$",
		// 	{
		// 		/* Custom message */
		// 		message: (selectorValue) =>
		// 			`Expected id selector "${selectorValue}" to match BEM CSS pattern https://en.bem.info/methodology/css. Selector validation tool: https://regexr.com/3apms`,
		// 	},
		// ],
		"selector-class-pattern": null,

		// For Tailwind CSS
		"import-notation": "string",

		// Add your own rules here
		// tailwindcss
		"at-rule-no-unknown": [
			true,
			{
				ignoreAtRules: [
					"tailwind",
					"config",
					"plugin",
					"layer",
					"theme",
					"source",
					"utility",
					"variant",
					"custom-variant",
					"apply",
					"reference",
				],
			},
		],
	},
};
