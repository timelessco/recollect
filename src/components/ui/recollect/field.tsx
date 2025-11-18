"use client";

import {
	FieldError as AriaFieldError,
	Label as AriaLabel,
	Text,
	type FieldErrorProps,
	type LabelProps,
	type TextProps,
} from "react-aria-components";

import {
	composeTailwindRenderProps,
	focusRing,
} from "@/utils/react-aria-utils";
import { tcx, tv } from "@/utils/tailwind-merge";

export function Label(props: LabelProps) {
	return (
		<AriaLabel
			{...props}
			className={tcx(
				"w-fit cursor-default text-sm font-medium text-gray-800",
				props.className,
			)}
		/>
	);
}

export function Description(props: TextProps) {
	return (
		<Text
			{...props}
			slot="description"
			className={tcx("text-xs text-gray-600", props.className)}
		/>
	);
}

export function FieldError(props: FieldErrorProps) {
	return (
		<AriaFieldError
			{...props}
			className={composeTailwindRenderProps(
				props.className,
				"text-xs text-red-600",
			)}
		/>
	);
}

export const inputStyles = tv({
	extend: focusRing,
	base: [
		"bg-gray-alpha-100",
		"rounded-lg px-[10px] py-[7px]",
		"text-sm leading-4 text-gray-900",
		"placeholder:text-gray-600",
		"transition",
	],
	variants: {
		isInvalid: {
			true: "bg-red-50 outline-red-600",
		},
		isDisabled: {
			true: "cursor-not-allowed opacity-50",
		},
	},
});
