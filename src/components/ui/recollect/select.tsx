"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";

import { TickIcon } from "@/icons/tickIcon";
import { cn } from "@/utils/tailwind-merge";

function Root({ children, ...props }: SelectPrimitive.Root.Props<string>) {
  return <SelectPrimitive.Root {...props}>{children}</SelectPrimitive.Root>;
}

function Trigger({ children, className, ...props }: SelectPrimitive.Trigger.Props) {
  return (
    <SelectPrimitive.Trigger
      className={cn("flex items-center rounded-lg text-13 font-medium outline-hidden", className)}
      {...props}
    >
      {children}
    </SelectPrimitive.Trigger>
  );
}

const { Value } = SelectPrimitive;

const { Icon } = SelectPrimitive;

function Portal({ children, ...props }: SelectPrimitive.Portal.Props) {
  return <SelectPrimitive.Portal {...props}>{children}</SelectPrimitive.Portal>;
}

function Positioner({
  children,
  className,
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

function Popup({ children, className, ...props }: SelectPrimitive.Popup.Props) {
  return (
    <SelectPrimitive.Popup
      className={cn(
        "origin-center rounded-xl bg-gray-50 p-1 shadow-custom-3 ring-1 ring-black/5 outline-hidden transition-[transform,scale,opacity] data-ending-style:scale-95 data-ending-style:opacity-0 data-open:origin-(--transform-origin) data-starting-style:scale-95 data-starting-style:opacity-0 data-[side=bottom]:data-starting-style:-translate-y-1 data-[side=top]:data-starting-style:translate-y-1",
        className,
      )}
      {...props}
    >
      {children}
    </SelectPrimitive.Popup>
  );
}

const { ScrollUpArrow } = SelectPrimitive;

const { ScrollDownArrow } = SelectPrimitive;

function List({ children, className, ...props }: SelectPrimitive.List.Props) {
  return (
    <SelectPrimitive.List className={cn("py-0", className)} {...props}>
      {children}
    </SelectPrimitive.List>
  );
}

function Item({ children, className, ...props }: SelectPrimitive.Item.Props) {
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

const { ItemText } = SelectPrimitive;

function ItemIndicator({ children, className, ...props }: SelectPrimitive.ItemIndicator.Props) {
  return (
    <SelectPrimitive.ItemIndicator
      className={cn(
        "ml-auto flex shrink-0 items-center justify-center pl-2 opacity-0 data-selected:opacity-100",
        className,
      )}
      keepMounted
      {...props}
    >
      {children ?? <TickIcon className="text-gray-800" />}
    </SelectPrimitive.ItemIndicator>
  );
}

export const Select = {
  Icon,
  Item,
  ItemIndicator,
  ItemText,
  List,
  Popup,
  Portal,
  Positioner,
  Root,
  ScrollDownArrow,
  ScrollUpArrow,
  Trigger,
  Value,
};
