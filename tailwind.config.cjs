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
				"main-bg": {
					1: "var(--color-main-bg-1)",
				},
				"hover-selected-color": {
					1: "var(--color-hover-selected-color-1)",
				},
				"main-text": {
					1: "var(--color-main-text-1)",
					2: "var(--color-main-text-2)",
					3: "var(--color-main-text-3)",
					4: "var(--color-main-text-4)",
					5: "var(--color-main-text-5)",
				},
				"custom-gray": {
					1: "#383838",
					2: "rgba(0, 0, 0, 0.04)",
					4: "rgba(0, 0, 0, 0.13)",
					6: "rgba(236, 236, 236, 0.86)",
					7: "#E8E8E8",
					8: "#f3f3f3",
					10: "#858585",
					11: "rgba(0, 0, 0, 0.047)",
					12: "rgba(0, 0, 0, 0.071)",
					13: "rgba(0, 0, 0, 0.141)",
					// test color for dark button hover
					14: "#2A2B2E",
					15: "rgba(0, 0, 0, 0.03)",
					16: "#E3E3E3",
				},
				"custom-gradient": {
					1: "linear-gradient(180deg, #2E2E2E 0%, #242424 100%)",
				},
				"custom-red": {
					100: "#FFF0F0",
					700: "#B52A2A",
				},
				"modal-bg": "#00000045",
				overlay: {
					black: {
						"A/3": "#0000000C",
					},
				},
				grayDark: {
					grayDark: {
						600: "#707070",
					},
				},
				gray: {
					light: {
						4: "#EDEDED",
						12: "#171717",
						1: "#9C9C9C",
						10: "#858585",
					},
					gray: {
						100: "#f3f3f3",
					},
				},
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
