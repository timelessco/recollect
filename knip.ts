import { type KnipConfig } from "knip";

const config: KnipConfig = {
	project: ["src/**/*.{ts,tsx}!"],
	entry: ["src/pages/**/*.{js,jsx,ts,tsx}!"],
	ignoreBinaries: [
		// release-it after:bump hook argument, not a real binary
		"prettier",
	],
	exclude: ["types", "duplicates", "exports", "files"],
};

export default config;
