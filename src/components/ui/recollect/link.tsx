"use client";

import NextLink, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

import { isNullable } from "@/utils/assertion-utils";
import { cn } from "@/utils/tailwind-merge";

export type LinkProps = AriaCurrentLinkProps & {
	hasImageChildren?: boolean;
};

export function Link(props: LinkProps) {
	const { className, children, hasImageChildren, ...rest } = props;

	return (
		<AriaCurrentLink
			data-slot="aria-current-link"
			className={cn(
				"rounded-xs underline transition data-disabled:cursor-default data-disabled:no-underline",
				!hasImageChildren &&
					"outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
				hasImageChildren && "group",
				className,
			)}
			{...rest}
		>
			{children}
			<ImageFocusRing hasImageChildren={hasImageChildren} />
		</AriaCurrentLink>
	);
}

type AriaCurrentLinkProps = React.ComponentProps<typeof NextLink>;

function AriaCurrentLink(props: AriaCurrentLinkProps) {
	const { href, ...rest } = props;

	const pathname = usePathname();
	const isCurrentRoute = pathname === href;

	return (
		<NextLink
			aria-current={isCurrentRoute ? "page" : undefined}
			href={href}
			{...rest}
		/>
	);
}

interface ImageFocusRingProps {
	hasImageChildren?: boolean;
}

function ImageFocusRing(props: ImageFocusRingProps) {
	const { hasImageChildren } = props;

	if (isNullable(hasImageChildren)) {
		return null;
	}

	return (
		<div
			className="group-focus-visible:ring-ring/50 absolute inset-0 size-full transition ring-inset group-focus-visible:ring"
			data-slot="image-focus-ring"
		/>
	);
}

export function LinkHint() {
	const { pending } = useLinkStatus();

	return (
		<span
			aria-hidden
			className={`link-hint ${pending ? "is-pending" : ""}`}
			data-slot="link-hint"
		/>
	);
}
