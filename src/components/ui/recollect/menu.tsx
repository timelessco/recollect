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

function Positioner({ className, sideOffset = 1, ...props }: MenuPrimitive.Positioner.Props) {
  return (
    <MenuPrimitive.Positioner
      className={cn("z-51", className)}
      sideOffset={sideOffset}
      {...props}
    />
  );
}

function Popup({ className, ...props }: MenuPrimitive.Popup.Props) {
  return (
    <MenuPrimitive.Popup
      className={cn(
        "w-48 origin-center rounded-xl bg-gray-50 p-1 shadow-custom-3 outline-hidden transition-[transform,scale,opacity] data-ending-style:scale-95 data-ending-style:opacity-0 data-open:origin-(--transform-origin) data-starting-style:scale-95 data-starting-style:opacity-0 data-[side=bottom]:data-starting-style:-translate-y-1 data-[side=left]:data-starting-style:translate-x-1 data-[side=right]:data-starting-style:-translate-x-1 data-[side=top]:data-starting-style:translate-y-1",
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

function CheckboxItem({ className, ...props }: MenuPrimitive.CheckboxItem.Props) {
  return (
    <MenuPrimitive.CheckboxItem
      className={cn(
        "flex cursor-pointer items-center rounded-lg px-2 py-[5px] text-13 leading-[115%] font-450 tracking-[0.01em] text-gray-800 outline-hidden data-highlighted:bg-gray-200 data-highlighted:text-gray-900",
        className,
      )}
      {...props}
    />
  );
}

const { CheckboxItemIndicator } = MenuPrimitive;

const { Separator } = MenuPrimitive;

export const Menu = {
  CheckboxItem,
  CheckboxItemIndicator,
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
