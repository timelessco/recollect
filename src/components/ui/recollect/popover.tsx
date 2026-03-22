"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";

import { cn } from "@/utils/tailwind-merge";

function Root({ ...props }: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root {...props} />;
}

function Trigger({ className, ...props }: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger className={cn(className)} {...props} />;
}

function Portal(props: PopoverPrimitive.Portal.Props) {
  return <PopoverPrimitive.Portal {...props} />;
}

function Positioner({ className, sideOffset = 1, ...props }: PopoverPrimitive.Positioner.Props) {
  return (
    <PopoverPrimitive.Positioner
      className={cn("z-51", className)}
      sideOffset={sideOffset}
      {...props}
    />
  );
}

function Popup({ className, ...props }: PopoverPrimitive.Popup.Props) {
  return (
    <PopoverPrimitive.Popup
      className={cn(
        "origin-center rounded-xl bg-gray-50 p-1 shadow-custom-3 outline-hidden transition-[transform,scale,opacity] data-ending-style:scale-95 data-ending-style:opacity-0 data-open:origin-(--transform-origin) data-starting-style:scale-95 data-starting-style:opacity-0 data-[side=bottom]:data-starting-style:-translate-y-1 data-[side=left]:data-starting-style:translate-x-1 data-[side=right]:data-starting-style:-translate-x-1 data-[side=top]:data-starting-style:translate-y-1",
        className,
      )}
      {...props}
    />
  );
}

const { Backdrop } = PopoverPrimitive;

export const Popover = {
  Backdrop,
  Popup,
  Portal,
  Positioner,
  Root,
  Trigger,
};
