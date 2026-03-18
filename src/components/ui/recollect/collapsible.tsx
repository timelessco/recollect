import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";

import { cn } from "@/utils/tailwind-merge";

function Root(props: CollapsiblePrimitive.Root.Props) {
	const { className, ...rest } = props;

	return (
		<CollapsiblePrimitive.Root
			defaultOpen
			className={cn("contents", className)}
			{...rest}
		/>
	);
}

function Trigger(props: CollapsiblePrimitive.Trigger.Props) {
	const { className, ...rest } = props;

	return (
		<CollapsiblePrimitive.Trigger
			className={cn(
				"aria-disclosure-button w-full cursor-pointer outline-hidden focus-visible:ring-1 focus-visible:ring-gray-200",
				className,
			)}
			type="button"
			{...rest}
		/>
	);
}

function Panel(props: CollapsiblePrimitive.Panel.Props) {
	const { className, ...rest } = props;

	return (
		<CollapsiblePrimitive.Panel
			keepMounted
			className={cn(
				"h-(--collapsible-panel-height) overflow-hidden transition-[height,opacity] duration-200 ease-in-out data-ending-style:h-0 data-ending-style:opacity-0 data-starting-style:h-0 data-starting-style:opacity-0 motion-reduce:transition-none",
				className,
			)}
			{...rest}
		/>
	);
}

export const Collapsible = {
	Root,
	Trigger,
	Panel,
};
