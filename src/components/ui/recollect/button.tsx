"use client";

import * as React from "react";

import { Button as BaseButton } from "@base-ui/react/button";
import { Progress } from "@base-ui/react/progress";

import { cn } from "@/utils/tailwind-merge";

import { Spinner } from "./spinner";

export type ButtonProps = BaseButton.Props & {
  /**
   * Whether the button is in a pending/loading state
   */
  pending?: boolean;
  /**
   * Content to show when button is in pending state
   */
  pendingSlot?: React.ReactElement;
};

export function Button(props: ButtonProps) {
  const { children, className, disabled, pending = false, pendingSlot, ...rest } = props;

  return (
    <BaseButton
      {...rest}
      className={cn(buttonBaseClasses, className)}
      data-slot="button"
      disabled={disabled ?? pending}
      focusableWhenDisabled={pending}
    >
      {pending ? (pendingSlot ?? <ButtonDefaultPendingComp />) : children}
    </BaseButton>
  );
}

export const buttonBaseClasses = [
  // Base styles
  "relative inline-flex shrink-0 cursor-pointer appearance-none items-center justify-center",
  "align-middle whitespace-nowrap transition select-none",
  "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  // Disabled state
  "data-disabled:cursor-not-allowed data-disabled:opacity-50",
  // Focus ring
  "outline-none focus-visible:ring-2 focus-visible:ring-gray-200",
];

type ButtonDefaultPendingCompProps = Omit<Progress.Root.Props, "value"> & {
  spinnerSlot?: React.ReactElement;
};

export function ButtonDefaultPendingComp(props: ButtonDefaultPendingCompProps) {
  const { children, className, spinnerSlot, ...rest } = props;

  return (
    <Progress.Root
      aria-label="Loading..."
      className={cn("contents", className)}
      value={null}
      {...rest}
    >
      {spinnerSlot ?? <Spinner className="mr-2 text-xs" />}
      {children ?? <span>Loading...</span>}
    </Progress.Root>
  );
}
