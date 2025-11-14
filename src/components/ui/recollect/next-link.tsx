"use client";

import { usePathname } from "next/navigation";
import { Link, type LinkProps } from "react-aria-components";

import { buttonBaseClassNames } from "./button";
import { tcx } from "@/utils/tailwind-merge";

type AriaCurrentLinkProps = LinkProps;

function AriaCurrentLink(props: AriaCurrentLinkProps) {
	const { href, ...rest } = props;

	const pathname = usePathname();
	const isCurrentRoute = pathname === href;

	return (
		<Link
			aria-current={isCurrentRoute ? "page" : undefined}
			href={href}
			{...rest}
		/>
	);
}

export interface NextLinkProps extends AriaCurrentLinkProps {
	className?: string;
	asButton?: boolean;
}

export function NextLink(props: NextLinkProps) {
	const { children, className, asButton = false, ...rest } = props;

	return (
		<AriaCurrentLink
			className={tcx(
				asButton
					? buttonBaseClassNames
					: "outline-hidden transition-all data-focus-visible:ring",
				className,
			)}
			{...rest}
		>
			{children}
		</AriaCurrentLink>
	);
}
