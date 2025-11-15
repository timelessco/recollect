import { composeRenderProps, type RenderProps } from "react-aria-components";
import { tv } from "tailwind-variants";

import { tcx } from "./tailwind-merge";

export const focusRing = tv({
	base: "outline outline-offset-2 outline-blue-600 dark:outline-blue-500 forced-colors:outline-[Highlight]",
	variants: {
		isFocusVisible: {
			false: "outline-0",
			true: "outline-2",
		},
	},
});

export function composeTailwindRenderProps<T>(
	className: string | ((v: T) => string) | undefined,
	tw: string,
): string | ((v: T) => string) {
	return composeRenderProps(className, (classList) => tcx(tw, classList));
}

export function renderSlot<T>(
	children: RenderProps<T>["children"],
	renderProps: T,
) {
	if (typeof children === "function") {
		return children({ ...renderProps, defaultChildren: null });
	}

	return children;
}
