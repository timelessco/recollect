"use client";

import {
	composeRenderProps,
	Button as RACButton,
	type ButtonProps as RACButtonProps,
} from "react-aria-components";

import { Spinner } from "./spinner";
import { focusRing } from "@/utils/react-aria-utils";
import { tv } from "@/utils/tailwind-merge";

export const buttonBase = tv({
	extend: focusRing,
	base: "relative inline-flex shrink-0 cursor-pointer appearance-none items-center justify-center align-middle whitespace-nowrap transition select-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
	variants: {
		isDisabled: {
			true: "cursor-not-allowed opacity-50",
		},
		isHovered: {
			true: "-translate-y-px",
		},
		isPressed: {
			true: "translate-y-0",
		},
	},
});

export const button = tv({
	extend: buttonBase,
	base: [
		"bg-gray-950 text-gray-0",
		"gap-2 p-2",
		"rounded-lg shadow-custom-2",
		"text-13 leading-[15px] font-medium",
	],
	variants: {
		isHovered: {
			true: "bg-gray-700",
		},
	},
});

export interface ButtonProps extends RACButtonProps {
	pendingSlot?: React.ReactNode;
	pendingTextSlot?: React.ReactNode;
	pendingSpinnerSlot?: React.ReactNode;
}

export function Button(props: ButtonProps) {
	const {
		className,
		children,
		pendingTextSlot,
		pendingSpinnerSlot,
		pendingSlot,
		...rest
	} = props;

	return (
		<RACButton
			{...rest}
			className={composeRenderProps(className, (className, renderProps) =>
				button({ ...renderProps, className }),
			)}
		>
			{composeRenderProps(children, (children, { isPending }) => {
				if (isPending) {
					return pendingSlot ? (
						<>{pendingSlot}</>
					) : (
						<>
							{pendingSpinnerSlot ?? <Spinner className="text-xs" />}

							{pendingTextSlot ?? <span>Loading...</span>}
						</>
					);
				}

				return <>{children}</>;
			})}
		</RACButton>
	);
}
