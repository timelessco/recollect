"use client";

import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";

import { cn } from "@/utils/tailwind-merge";

type ScrollAreaProps = ScrollAreaPrimitive.Root.Props & {
	scrollFade?: boolean;
	scrollbarGutter?: boolean;
	hideScrollbar?: boolean;
};

function ScrollArea({
	className,
	children,
	scrollFade = false,
	scrollbarGutter = false,
	hideScrollbar = false,
	scrollHeight,
	...props
}: ScrollAreaPrimitive.Root.Props & {
	scrollFade?: boolean;
	scrollbarGutter?: boolean;
	hideScrollbar?: boolean;
	scrollHeight?: number;
}) {
	return (
		<ScrollAreaPrimitive.Root
			className={cn("size-full min-h-0", className)}
			{...props}
		>
			<ScrollAreaPrimitive.Viewport
				className={cn(
					"h-full overscroll-contain rounded-[inherit] transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
					scrollFade &&
						"mask-t-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-y-start)))] mask-r-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-x-end)))] mask-b-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-y-end)))] mask-l-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-x-start)))] [--fade-size:2rem]",
					scrollbarGutter && "data-has-overflow-x:pb-2.5",
				)}
				style={{ maxHeight: scrollHeight }}
				data-slot="scroll-area-viewport"
			>
				{children}
			</ScrollAreaPrimitive.Viewport>
			{!hideScrollbar && (
				<>
					<ScrollBar orientation="vertical" />
					<ScrollBar orientation="horizontal" />
					<ScrollAreaPrimitive.Corner data-slot="scroll-area-corner" />
				</>
			)}
		</ScrollAreaPrimitive.Root>
	);
}

function ScrollBar({
	className,
	orientation = "vertical",
	...props
}: ScrollAreaPrimitive.Scrollbar.Props) {
	return (
		<ScrollAreaPrimitive.Scrollbar
			className={cn(
				"m-1 flex opacity-0 transition-opacity delay-300 data-hovering:opacity-100 data-hovering:delay-0 data-hovering:duration-100 data-scrolling:opacity-100 data-scrolling:delay-0 data-scrolling:duration-100 data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:flex-col data-[orientation=vertical]:w-1.5",
				className,
			)}
			data-slot="scroll-area-scrollbar"
			orientation={orientation}
			{...props}
		>
			<ScrollAreaPrimitive.Thumb
				className="relative flex-1 rounded-full bg-gray-alpha-400"
				data-slot="scroll-area-thumb"
			/>
		</ScrollAreaPrimitive.Scrollbar>
	);
}

export { ScrollArea, type ScrollAreaProps, ScrollBar };
