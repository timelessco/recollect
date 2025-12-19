"use client";

import { type z } from "zod";

import { createSafeContext } from "@/hooks/create-safe-context";

export type EditPopoverMultiSelectContextValue<T> = {
	items: T[];
	selectedItems: T[];
	getItemId: (item: T) => string | number;
	getItemLabel: (item: T) => string;
	onAdd: (item: T) => void;
	onRemove: (item: T) => void;
	inputValue: string;
	setInputValue: (value: string) => void;
	containerRef: React.RefObject<HTMLDivElement | null>;
	onCreate?: (inputValue: string) => void;
	createSchema?: z.ZodType<string>;
};

// Internal context - type parameter is erased at runtime
// We use a type assertion approach rather than trying to make the context generic
// This is safe because:
// 1. The Root component ensures type safety when creating the context value
// 2. Consumers use typed hooks to get properly typed values back
type AnyContextValue = EditPopoverMultiSelectContextValue<unknown>;

const [
	EditPopoverMultiSelectContext,
	useEditPopoverMultiSelectContextInternal,
] = createSafeContext<AnyContextValue>({
	name: "EditPopoverMultiSelectContext",
	hookName: "useEditPopoverMultiSelectContext",
	providerName: "EditPopoverMultiSelect",
	errorMessage:
		"EditPopoverMultiSelect components must be used within EditPopoverMultiSelect",
});

export { EditPopoverMultiSelectContext };

// Untyped hook for internal components that work with any type
export const useEditPopoverMultiSelectContext = () =>
	useEditPopoverMultiSelectContextInternal();

// Typed hook factory that preserves generics at call sites
export function useTypedEditPopoverContext<T>() {
	return useEditPopoverMultiSelectContextInternal() as unknown as EditPopoverMultiSelectContextValue<T>;
}
