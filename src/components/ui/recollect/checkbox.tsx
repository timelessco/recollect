"use client";

import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";

import { CheckIcon } from "@/icons/check-icon";
import { cn } from "@/utils/tailwind-merge";

export type CheckboxProps = BaseCheckbox.Root.Props;

export function Checkbox(props: CheckboxProps) {
	const { className, children, ...rest } = props;

	return (
		<BaseCheckbox.Root
			{...rest}
			className={cn(
				"shrink-0 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1",
				className,
			)}
		>
			{children ?? <CheckboxDefaultIndicator />}
		</BaseCheckbox.Root>
	);
}

type CheckboxDefaultIndicatorProps = BaseCheckbox.Indicator.Props;

export function CheckboxDefaultIndicator(props: CheckboxDefaultIndicatorProps) {
	const { children, className, ...rest } = props;

	return (
		<BaseCheckbox.Indicator
			keepMounted
			className={cn("contents", className)}
			{...rest}
		>
			{children ?? <CheckIcon />}
		</BaseCheckbox.Indicator>
	);
}
