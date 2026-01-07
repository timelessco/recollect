"use client";

import * as React from "react";
import { Button as BaseButton } from "@base-ui/react/button";
import { Progress } from "@base-ui/react/progress";

import { Spinner } from "./spinner";
import { cn } from "@/utils/tailwind-merge";

export type ButtonProps = BaseButton.Props & {
	/**
	 * Content to show when button is in pending state
	 */
	pendingSlot?: React.ReactElement;
	/**
	 * Whether the button is in a pending/loading state
	 */
	pending?: boolean;
};

export function Button(props: ButtonProps) {
	const {
		className,
		children,
		pending = false,
		pendingSlot,
		disabled,
		...rest
	} = props;

	return (
		<BaseButton
			{...rest}
			data-slot="button"
			disabled={disabled || pending}
			focusableWhenDisabled={pending}
			className={cn(buttonBaseClasses, className)}
		>
			{pending ? (pendingSlot ?? <ButtonDefaultPendingComp />) : children}
		</BaseButton>
	);
}

export const buttonBaseClasses = [
	// Base styles
	"relative inline-flex shrink-0 cursor-pointer appearance-none items-center justify-center",
	"align-middle whitespace-nowrap transition select-none",
	"[&_svg]:pointer-events-none [&_svg]:shrink-0",
	// Disabled state
	"data-disabled:cursor-not-allowed data-disabled:opacity-50",
	// Hover/Active
	"hover:not-data-disabled:-translate-y-px",
	"active:not-data-disabled:translate-y-0",
	// Focus ring
	"outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
];

type ButtonDefaultPendingCompProps = Omit<Progress.Root.Props, "value"> & {
	spinnerSlot?: React.ReactElement;
};

export function ButtonDefaultPendingComp(props: ButtonDefaultPendingCompProps) {
	const { children, spinnerSlot, className, ...rest } = props;

	return (
		<Progress.Root
			value={null}
			className={cn("contents", className)}
			aria-label="Loading..."
			{...rest}
		>
			{spinnerSlot ?? <Spinner className="mr-2 text-xs" />}
			{children ? children : <span>Loading...</span>}
		</Progress.Root>
	);
}
