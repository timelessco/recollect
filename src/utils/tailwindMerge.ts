import { extendTailwindMerge } from "tailwind-merge";

export const cx = (...classNames: any[]) =>
	classNames.filter(Boolean).join(" ");

export const tcm = extendTailwindMerge({
	classGroups: {
		"drop-shadow": [
			{
				"drop-shadow": ["custom-1"],
			},
		],
	},
});
