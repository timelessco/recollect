import { isNullable } from "@/utils/assertion-utils";
import { cn } from "@/utils/tailwind-merge";

export interface IconProps extends React.ComponentProps<"svg"> {
	/**
	 * If it has a label, the icon will be given a role of "img" for accessibility
	 * If it does not have a label, the icon will be hidden from screen readers
	 */
	ariaLabel?: string;
}

// For accessibility - https://www.smashingmagazine.com/2021/05/accessible-svg-patterns-comparison/
// Default: aria hidden props are used as the majority of icons are decorative
export function Icon(props: IconProps) {
	const { "aria-label": ariaLabel, children, className, name, ...rest } = props;
	const ariaLabelProps: AriaHiddenProps | AriaLabelProps = isNullable(ariaLabel)
		? {
				"aria-hidden": "true",
				focusable: "false",
			}
		: {
				role: "img",
			};

	return (
		<svg
			className={cn(
				"inline-block size-[1em] shrink-0 align-middle leading-[1em]",
				className,
			)}
			xmlns="http://www.w3.org/2000/svg"
			{...ariaLabelProps}
			{...rest}
		>
			{isNullable(ariaLabel) ? null : <title>{ariaLabel}</title>}

			{name ? <use href={`/svg/sprite.svg#${name}`} /> : children}
		</svg>
	);
}

interface AriaLabelProps {
	role: React.ComponentProps<"svg">["role"];
}

interface AriaHiddenProps {
	"aria-hidden": React.ComponentProps<"svg">["aria-hidden"];
	focusable: React.ComponentProps<"svg">["focusable"];
}
