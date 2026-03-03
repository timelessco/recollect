"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";

import { TickIcon } from "@/icons/tickIcon";
import { cn } from "@/utils/tailwind-merge";

function Root({ children, ...props }: SelectPrimitive.Root.Props<string>) {
	return <SelectPrimitive.Root {...props}>{children}</SelectPrimitive.Root>;
}

function Trigger({
	className,
	children,
	...props
}: SelectPrimitive.Trigger.Props) {
	return (
		<SelectPrimitive.Trigger
			data-slot="select-trigger"
			className={cn(
				"flex items-center rounded-lg text-13 font-medium outline-hidden",
				className,
			)}
			{...props}
		>
			{children}
		</SelectPrimitive.Trigger>
	);
}

const Value = SelectPrimitive.Value;

const Icon = SelectPrimitive.Icon;

function Portal({ children, ...props }: SelectPrimitive.Portal.Props) {
	return <SelectPrimitive.Portal {...props}>{children}</SelectPrimitive.Portal>;
}

function Positioner({
	className,
	children,
	sideOffset = 4,
	...props
}: SelectPrimitive.Positioner.Props) {
	return (
		<SelectPrimitive.Positioner
			className={cn("z-50 select-none", className)}
			sideOffset={sideOffset}
			{...props}
		>
			{children}
		</SelectPrimitive.Positioner>
	);
}

function Popup({ className, children, ...props }: SelectPrimitive.Popup.Props) {
	return (
		<SelectPrimitive.Popup
			data-slot="select-popup"
			className={cn(
				"origin-(--transform-origin) rounded-xl bg-gray-50 p-1 shadow-custom-3 ring-1 ring-black/5 outline-hidden transition-[transform,scale,opacity] data-starting-style:scale-98 data-starting-style:opacity-0",
				className,
			)}
			{...props}
		>
			{children}
		</SelectPrimitive.Popup>
	);
}

const ScrollUpArrow = SelectPrimitive.ScrollUpArrow;

const ScrollDownArrow = SelectPrimitive.ScrollDownArrow;

function List({ className, children, ...props }: SelectPrimitive.List.Props) {
	return (
		<SelectPrimitive.List
			data-slot="select-list"
			className={cn("py-0", className)}
			{...props}
		>
			{children}
		</SelectPrimitive.List>
	);
}

function Item({ className, children, ...props }: SelectPrimitive.Item.Props) {
	return (
		<SelectPrimitive.Item
			className={cn(
				"flex cursor-pointer items-center rounded-lg px-2 py-[5px] text-13 leading-[115%] font-450 tracking-[0.01em] text-gray-800 select-none data-highlighted:bg-gray-200 data-highlighted:text-gray-900",
				className,
			)}
			{...props}
		>
			{children}
		</SelectPrimitive.Item>
	);
}

const ItemText = SelectPrimitive.ItemText;

function ItemIndicator({
	className,
	children,
	...props
}: SelectPrimitive.ItemIndicator.Props) {
	return (
		<SelectPrimitive.ItemIndicator
			keepMounted
			data-slot="select-item-indicator"
			className={cn(
				"ml-auto flex shrink-0 items-center justify-center pl-2 opacity-0 data-selected:opacity-100",
				className,
			)}
			{...props}
		>
			{children ?? <TickIcon className="text-gray-800" />}
		</SelectPrimitive.ItemIndicator>
	);
}

export const Select = {
	Root,
	Trigger,
	Value,
	Icon,
	Portal,
	Positioner,
	Popup,
	ScrollUpArrow,
	ScrollDownArrow,
	List,
	Item,
	ItemText,
	ItemIndicator,
};
