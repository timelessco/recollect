import { extendTailwindMerge } from "tailwind-merge";

export const cx = (...classNames: any[]) =>
	classNames.filter(Boolean).join(" ");

export const tcm = extendTailwindMerge({
	classGroups: {
		"drop-shadow-sm": [
			{
				"drop-shadow-sm": ["custom-1"],
			},
		],
	},
});
