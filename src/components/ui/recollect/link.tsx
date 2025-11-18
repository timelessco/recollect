"use client";

import { usePathname } from "next/navigation";
import {
	Link as AriaLink,
	composeRenderProps,
	type LinkProps as AriaLinkProps,
} from "react-aria-components";

import { buttonBase } from "./button";
import { tv } from "@/utils/tailwind-merge";

const link = tv({
	base: "rounded-xs underline transition",
	variants: {
		isDisabled: {
			true: "cursor-default no-underline",
		},
	},
});

export interface NextLinkProps extends AriaCurrentLinkProps {
	asButton?: boolean;
}

export function Link(props: NextLinkProps) {
	const { className, asButton = false, ...rest } = props;
	const linkStyles = asButton ? buttonBase : link;

	return (
		<AriaCurrentLink
			{...rest}
			className={composeRenderProps(className, (className, renderProps) =>
				linkStyles({ ...renderProps, className }),
			)}
		/>
	);
}

type AriaCurrentLinkProps = AriaLinkProps;

function AriaCurrentLink(props: AriaCurrentLinkProps) {
	const { href, ...rest } = props;

	const pathname = usePathname();
	const isCurrentRoute = pathname === href;

	return (
		<AriaLink
			aria-current={isCurrentRoute ? "page" : undefined}
			href={href}
			{...rest}
		/>
	);
}
