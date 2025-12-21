"use client";

import { type z } from "zod";

import { createSafeContext } from "@/hooks/create-safe-context";

export type ComboboxContextValue<T> = {
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
	isOpen: boolean;
};

const [ComboboxContext, useComboboxContextInternal] = createSafeContext<
	ComboboxContextValue<unknown>
>({
	name: "ComboboxContext",
	hookName: "useComboboxContext",
	providerName: "Combobox",
	errorMessage: "Combobox components must be used within Combobox.Root",
});

export { ComboboxContext };

export function useComboboxContext<T = unknown>() {
	return useComboboxContextInternal() as ComboboxContextValue<T>;
}
