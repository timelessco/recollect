const defaultTheme = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: "class",
	future: {
		relativeContentPathsByDefault: true,
		hoverOnlyWhenSupported: true,
	},
	content: ["./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		screens: {
			"2xl": { max: "1535px" },
			// => @media (max-width: 1535px) { ... }

			xl: { max: "1279px" },
			// => @media (max-width: 1279px) { ... }

			lg: { max: "1023px" },
			// => @media (max-width: 1023px) { ... }

			md: { max: "767px" },
			// => @media (max-width: 767px) { ... }

			sm: { max: "639px" },
			// => @media (max-width: 639px) { ... }
		},
		extend: {
			fontFamily: {
				sans: ["Inter V", ...defaultTheme.fontFamily.sans],
			},
			colors: {
				"custom-gradient": {
					1: "linear-gradient(180deg, #2E2E2E 0%, #242424 100%)",
				},
				"custom-red": {
					100: "#FFF0F0",
					700: "#B52A2A",
				},
				gray: {
					50: "var(--color-gray-50)",
					100: "var(--color-gray-100)",
					200: "var(--color-gray-200)",
					400: "var(--color-gray-400)",
					550: "var(--color-gray-550)",
					600: "var(--color-gray-600)",
					700: "var(--color-gray-700)",
					800: "var(--color-gray-800)",
					900: "var(--color-gray-900)",
				},
				"text-gray": {
					1: "var(--color-text-gray-1)",
					2: "var(--color-text-gray-2)",
					3: "var(--color-text-gray-3)",
					4: "var(--color-text-gray-4)",
					5: "var(--color-text-gray-5)",
					6: "var(--color-text-gray-6)",
					7: "var(--color-text-gray-7)",
					8: "var(--color-text-gray-8)",
				},
				"surface-white": "var(--color-surface-white)",
				"surface-gray": {
					1: "var(--color-surface-gray-1)",
					2: "var(--color-surface-gray-2)",
					3: "var(--color-surface-gray-3)",
					4: "var(--color-surface-gray-4)",
					5: "var(--color-surface-gray-5)",
					6: "var(--color-surface-gray-6)",
					7: "var(--color-surface-gray-7)",
					menu: "var(--color-surface-menu)",
					cards: "var(--color-surface-cards)",
					modal: "var(--color-surface-modal)",
					selected: "var(--color-surface-selected)",
					alpha: {
						white: "var(--color-surface-alpha-white)",
						gray: {
							1: "var(--color-surface-alpha-gray-1)",
							2: "var(--color-surface-alpha-gray-2)",
							3: "var(--color-surface-alpha-gray-3)",
							4: "var(--color-surface-alpha-gray-4)",
							5: "var(--color-surface-alpha-gray-5)",
							6: "var(--color-surface-alpha-gray-6)",
							7: "var(--color-surface-alpha-gray-7)",
						},
						"menu-bar": "var(--color-surface-alpha-menu-bar)",
						cards: "var(--color-surface-alpha-cards)",
						modal: "var(--color-surface-alpha-modal)",
						overlay: "var(--color-surface-alpha-overlay)",
					},
				},
				"modal-bg": "#00000045",
				"plain-reverse-color": "var(--plain-reverse-color)",
				"plain-color": "var(--plain-color)",
			},

			dropShadow: {
				"custom-1": "0px 0px 2.5px rgba(0, 0, 0, 0.11)",
			},
			boxShadow: {
				"custom-1":
					"0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -4px rgba(0, 0, 0, 0.1)",
				"custom-2":
					"0px 0px 1px rgba(0, 0, 0, 0.4), 0px 1px 2px rgba(0, 0, 0, 0.15)",
				"custom-3":
					"0px 0px 1px rgba(0, 0, 0, 0.19), 0px 1px 2px rgba(0, 0, 0, 0.07), 0px 6px 15px -5px rgba(0, 0, 0, 0.11)",
				"custom-4":
					"0px 64px 74px rgba(0, 0, 0, 0.08), 0px 17.9672px 35.1912px rgba(0, 0, 0, 0.0427215), 0px 8.53023px 25.3083px rgba(0, 0, 0, 0.0302528), 0px 4.48693px 17.6765px rgba(0, 0, 0, 0.0221708), 0px 2.0298px 9.41891px rgba(0, 0, 0, 0.0146447)",
				"custom-5": "inset 0px 0px 1px rgba(0, 0, 0, 0.11)",
				"custom-6":
					"0px -3px 60px 11px rgba(0, 0, 0, 0.11), 0px 0px 3px rgba(0, 0, 0, 0.19)",
				"custom-7":
					"0px 6px 15px -5px #0000001C, 0px 1px 2px 0px #00000012, 0px 0px 1px 0px #00000030",
				"custom-8": "0px 0px 1px 0px rgba(0, 0, 0, .12) inset",
			},
			fontSize: {
				40: "40px",
				13: "13px",
			},
			fontWeight: {
				450: "450",
			},
		},
	},
	plugins: [],
};
