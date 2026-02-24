"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";

import { cn } from "@/utils/tailwind-merge";

interface TooltipProps {
	children: React.ReactNode;
	className?: string;
	content: React.ReactNode;
	delay?: number;
}

export function Tooltip(props: TooltipProps) {
	const { children, className, content, delay } = props;

	return (
		<TooltipPrimitive.Provider delay={delay}>
			<TooltipPrimitive.Root>
				<TooltipPrimitive.Trigger className="cursor-pointer" render={<div />}>
					{children}
				</TooltipPrimitive.Trigger>
				<TooltipPrimitive.Portal>
					<TooltipPrimitive.Positioner className="z-50" sideOffset={8}>
						<TooltipPrimitive.Popup
							className={cn(
								"rounded-xl bg-gray-900 px-2 py-1 text-13 font-450 text-gray-0",
								"transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0",
								className,
							)}
						>
							{content}
						</TooltipPrimitive.Popup>
					</TooltipPrimitive.Positioner>
				</TooltipPrimitive.Portal>
			</TooltipPrimitive.Root>
		</TooltipPrimitive.Provider>
	);
}
