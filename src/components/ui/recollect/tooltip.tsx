import { type ReactNode } from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";

interface TooltipProps {
	children: ReactNode;
	content: ReactNode;
}

export function Tooltip(props: TooltipProps) {
	const { children, content } = props;

	return (
		<TooltipPrimitive.Provider>
			<TooltipPrimitive.Root>
				<TooltipPrimitive.Trigger className="cursor-pointer">
					{children}
				</TooltipPrimitive.Trigger>
				<TooltipPrimitive.Portal>
					<TooltipPrimitive.Positioner className="z-50" sideOffset={8}>
						<TooltipPrimitive.Popup className="rounded-xl bg-gray-900 px-2 py-1 text-13 font-450 text-gray-0 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0">
							{content}
						</TooltipPrimitive.Popup>
					</TooltipPrimitive.Positioner>
				</TooltipPrimitive.Portal>
			</TooltipPrimitive.Root>
		</TooltipPrimitive.Provider>
	);
}
