"use client";

import type { z } from "zod";

import { createSafeContext } from "@/hooks/create-safe-context";

export interface ComboboxContextValue<T> {
  containerRef: React.RefObject<HTMLDivElement | null>;
  createSchema?: z.ZodType<string>;
  getItemId: (item: T) => number | string;
  getItemLabel: (item: T) => string;
  inputValue: string;
  isOpen: boolean;
  items: T[];
  onAdd: (item: T) => void;
  onCreate?: (inputValue: string) => void;
  onRemove: (item: T) => void;
  selectedItems: T[];
  setInputValue: (value: string) => void;
}

const [ComboboxContext, useComboboxContextInternal] = createSafeContext<
  ComboboxContextValue<unknown>
>({
  errorMessage: "Combobox components must be used within Combobox.Root",
  hookName: "useComboboxContext",
  name: "ComboboxContext",
  providerName: "Combobox",
});

export { ComboboxContext };

export function useComboboxContext<T = unknown>() {
  // oxlint-disable-next-line no-unsafe-type-assertion
  return useComboboxContextInternal() as ComboboxContextValue<T>;
}
