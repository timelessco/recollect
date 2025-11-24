import { extendTailwindMerge } from "tailwind-merge";
import { tv as tvBase, type TV } from "tailwind-variants";

// Custom color shades used across all color families
const COLOR_SHADES = [
	"0",
	"50",
	"100",
	"200",
	"300",
	"400",
	"500",
	"550",
	"600",
	"700",
	"800",
	"900",
	"950",
	"1000",
];

// Custom shadow variants
const CUSTOM_SHADOWS = [
	"custom-1",
	"custom-2",
	"custom-3",
	"custom-4",
	"custom-5",
	"custom-6",
	"custom-7",
	"custom-8",
];

// Custom font sizes
const CUSTOM_TEXT_SIZES = ["13", "40", "tiny"];

// All custom color values
// These will automatically apply to all color-related utilities:
// text-*, bg-*, border-*, ring-*, decoration-*, divide-*, outline-*, fill-*, stroke-*, etc.
const CUSTOM_COLORS = [
	// Plain colors
	"plain",
	"plain-reverse",

	// All color families with their shades
	...COLOR_SHADES.map((shade) => `gray-${shade}`),
	...COLOR_SHADES.map((shade) => `gray-alpha-${shade}`),
	...COLOR_SHADES.map((shade) => `whites-${shade}`),
	...COLOR_SHADES.map((shade) => `blacks-${shade}`),
	...COLOR_SHADES.map((shade) => `red-${shade}`),
	...COLOR_SHADES.map((shade) => `red-alpha--${shade}`),
	...COLOR_SHADES.map((shade) => `blue-${shade}`),
	...COLOR_SHADES.map((shade) => `green-${shade}`),
	...COLOR_SHADES.map((shade) => `amber-${shade}`),
	...COLOR_SHADES.map((shade) => `orange-${shade}`),
	...COLOR_SHADES.map((shade) => `yellow-${shade}`),
	...COLOR_SHADES.map((shade) => `teal-${shade}`),
	...COLOR_SHADES.map((shade) => `cyan-${shade}`),
	...COLOR_SHADES.map((shade) => `purple-${shade}`),
	...COLOR_SHADES.map((shade) => `pink-${shade}`),
	...COLOR_SHADES.map((shade) => `violet-${shade}`),

	// Custom special colors
	"custom-gradient-1",
	"custom-red-100",
	"custom-red-700",
	"modal-bg",
];

// Comprehensive tailwind-merge configuration
const twMergeConfig = {
	theme: {
		// Colors automatically apply to all color-related utilities
		// (text-*, bg-*, border-*, ring-*, decoration-*, divide-*, outline-*, etc.)
		colors: CUSTOM_COLORS,
	},
	classGroups: {
		// Only define classGroups for theme scales NOT supported by tailwind-merge

		// Custom shadows (no theme.shadow scale exists)
		shadow: [{ shadow: CUSTOM_SHADOWS }],

		// Custom font sizes (theme.fontSize exists but we're adding custom values)
		"font-size": [{ text: CUSTOM_TEXT_SIZES }],

		// Custom font weights (theme.fontWeight exists but we're adding custom values)
		"font-weight": [{ font: ["450"] }],
	},
};

// Export extended tailwind-merge with custom config
export const tcx = extendTailwindMerge({
	// @ts-expect-error - TypeScript doesn't recognize theme.colors extension but it works at runtime per tailwind-merge docs
	extend: twMergeConfig,
});

// Export tailwind-variants with custom merge config
export const tv: TV = (options, config) =>
	tvBase(options, {
		...config,
		twMerge: config?.twMerge ?? true,
		twMergeConfig: {
			...config?.twMergeConfig,
			theme: {
				...config?.twMergeConfig?.theme,
				...twMergeConfig.theme,
			},
			classGroups: {
				...config?.twMergeConfig?.classGroups,
				...twMergeConfig.classGroups,
			},
		},
	});
