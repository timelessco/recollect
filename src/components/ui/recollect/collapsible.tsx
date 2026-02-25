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
			className={cn("aria-disclosure-button w-full cursor-pointer", className)}
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
			className={cn(className)}
			{...rest}
		/>
	);
}

export const Collapsible = {
	Root,
	Trigger,
	Panel,
};
