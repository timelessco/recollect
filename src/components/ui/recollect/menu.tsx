"use client";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";

import { cn } from "@/utils/tailwind-merge";

function Root({ ...props }: MenuPrimitive.Root.Props) {
	return <MenuPrimitive.Root {...props} />;
}

function Trigger({ className, ...props }: MenuPrimitive.Trigger.Props) {
	return <MenuPrimitive.Trigger className={cn(className)} {...props} />;
}

function Portal(props: MenuPrimitive.Portal.Props) {
	return <MenuPrimitive.Portal {...props} />;
}

function Positioner({
	className,
	sideOffset = 1,
	...props
}: MenuPrimitive.Positioner.Props) {
	return (
		<MenuPrimitive.Positioner
			className={cn("z-10", className)}
			sideOffset={sideOffset}
			{...props}
		/>
	);
}

function Popup({ className, ...props }: MenuPrimitive.Popup.Props) {
	return (
		<MenuPrimitive.Popup
			className={cn(
				"w-48 origin-(--transform-origin) rounded-xl bg-gray-50 p-1 shadow-custom-3 outline-hidden transition-[transform,scale,opacity] data-starting-style:scale-98 data-starting-style:opacity-0",
				className,
			)}
			{...props}
		/>
	);
}

function Item({ className, ...props }: MenuPrimitive.Item.Props) {
	return (
		<MenuPrimitive.Item
			className={cn(
				"flex cursor-pointer items-center rounded-lg px-2 py-[5px] text-13 leading-[115%] font-450 tracking-[0.01em] text-gray-800 outline-hidden data-highlighted:bg-gray-200 data-highlighted:text-gray-900",
				className,
			)}
			{...props}
		/>
	);
}

function Group({ ...props }: MenuPrimitive.Group.Props) {
	return <MenuPrimitive.Group {...props} />;
}

function GroupLabel({ className, ...props }: MenuPrimitive.GroupLabel.Props) {
	return <MenuPrimitive.GroupLabel className={cn(className)} {...props} />;
}

const Separator = MenuPrimitive.Separator;

export const Menu = {
	Group,
	GroupLabel,
	Item,
	Popup,
	Portal,
	Positioner,
	Root,
	Separator,
	Trigger,
};
