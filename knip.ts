import { type KnipConfig } from "knip";

const config: KnipConfig = {
	project: ["src/**/*.{ts,tsx}!"],
	entry: [
		"src/pages/**/*.{js,jsx,ts,tsx}!",
		"next.config.js",
		"tailwind.config.cjs",
		"env/**/*",
		"release-it/**/*",
	],
	// sharp - used by next/image
	// autoprefixer - used by postcss for tailwind workflow
	// tilg - used for debugging react components
	ignoreDependencies: ["sharp", "autoprefixer", "tilg"],
};

export default config;
