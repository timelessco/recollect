import { type KnipConfig } from "knip";

const config: KnipConfig = {
	project: ["src/**/*.{ts,tsx}!"],
	entry: [
		"src/pages/**/*.{js,jsx,ts,tsx}!",
		"next.config.js",
		"tailwind.config.cjs",
		"env/**/*",
	],
};

export default config;
