import { extendTailwindMerge } from "tailwind-merge";

export const cx = (...classNames: any[]) =>
	classNames.filter(Boolean).join(" ");

export const tcx = extendTailwindMerge({
	extend: {
		theme: {
			text: ["13"],
		},
	},
});
