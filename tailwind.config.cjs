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
					0: "var(--color-gray-0)",
					50: "var(--color-gray-50)",
					100: "var(--color-gray-100)",
					200: "var(--color-gray-200)",
					300: "var(--color-gray-300)",
					400: "var(--color-gray-400)",
					500: "var(--color-gray-500)",
					550: "var(--color-gray-550)",
					600: "var(--color-gray-600)",
					700: "var(--color-gray-700)",
					800: "var(--color-gray-800)",
					900: "var(--color-gray-900)",
					950: "var(--color-gray-950)",
					1_000: "var(--color-gray-1000)",
				},

				"gray-alpha": {
					50: "var(--color-gray-alpha-50)",
					100: "var(--color-gray-alpha-100)",
					200: "var(--color-gray-alpha-200)",
					300: "var(--color-gray-alpha-300)",
					400: "var(--color-gray-alpha-400)",
					500: "var(--color-gray-alpha-500)",
					550: "var(--color-gray-alpha-550)",
					600: "var(--color-gray-alpha-600)",
					700: "var(--color-gray-alpha-700)",
					800: "var(--color-gray-alpha-800)",
					900: "var(--color-gray-alpha-900)",
					950: "var(--color-gray-alpha-950)",
					1_000: "var(--color-gray-alpha-1000)",
				},
				whites: {
					50: "var(--color-whites-50)",
					100: "var(--color-whites-100)",
					200: "var(--color-whites-200)",
					300: "var(--color-whites-300)",
					400: "var(--color-whites-400)",
					500: "var(--color-whites-500)",
					550: "var(--color-whites-550)",
					600: "var(--color-whites-600)",
					700: "var(--color-whites-700)",
					800: "var(--color-whites-800)",
					900: "var(--color-whites-900)",
					950: "var(--color-whites-950)",
					1_000: "var(--color-whites-1000)",
				},
				blacks: {
					50: "var(--color-blacks-50)",
					100: "var(--color-blacks-100)",
					200: "var(--color-blacks-200)",
					300: "var(--color-blacks-300)",
					400: "var(--color-blacks-400)",
					500: "var(--color-blacks-500)",
					550: "var(--color-blacks-550)",
					600: "var(--color-blacks-600)",
					700: "var(--color-blacks-700)",
					800: "var(--color-blacks-800)",
					900: "var(--color-blacks-900)",
					950: "var(--color-blacks-950)",
					1_000: "var(--color-blacks-1000)",
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
