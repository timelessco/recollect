import { type KnipConfig } from "knip";

const config: KnipConfig = {
	project: ["src/**/*.{ts,tsx}!"],
	entry: ["src/pages/**/*.{js,jsx,ts,tsx}!", "env/**/*", "release-it/**/*"],
	ignoreDependencies: [
		// Used by Ariakit React
		"@ariakit/react-core",
		// Used by other langchain @ packages
		"langchain",
	],
	ignoreBinaries: [
		// Used in code quality
		"turbo",
	],
	exclude: ["types", "duplicates", "exports", "files"],
};

export default config;
