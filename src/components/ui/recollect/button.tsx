"use client";

import {
	Button as ReactAriaButton,
	type ButtonProps as ReactAriaButtonProps,
} from "react-aria-components";
import { twJoin } from "tailwind-merge";

import { Spinner } from "./spinner";
import { tcx } from "@/utils/tailwind-merge";

export const buttonBaseClassNames = twJoin(
	"inline-flex shrink-0 cursor-pointer appearance-none items-center justify-center align-middle whitespace-nowrap transition-all outline-none select-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0",
	"bg-gray-950 text-gray-0 hover:bg-gray-700 disabled:opacity-50",
	"gap-2 p-2",
	"rounded-lg shadow-custom-2 data-focus-visible:ring",
	"text-13 leading-[15px] font-medium",
	"translate-y-0 hover:-translate-y-px data-pressed:translate-y-0",
);

interface ButtonProps extends ReactAriaButtonProps {
	className?: string;
}

export function Button(props: ButtonProps) {
	const { className, ...rest } = props;

	return (
		<ReactAriaButton
			className={tcx(buttonBaseClassNames, className)}
			{...rest}
		/>
	);
}

interface LoadingButtonProps extends ButtonProps {
	isLoading: boolean;
	loadingText: string;
}

export function LoadingButton(props: LoadingButtonProps) {
	const { children, isLoading, loadingText, ...rest } = props;

	if (isLoading) {
		return (
			<Button {...rest} isDisabled>
				<Spinner className="text-xs" />

				{loadingText}
			</Button>
		);
	}

	return <Button {...rest}>{children}</Button>;
}
