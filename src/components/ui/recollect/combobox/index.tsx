import * as React from "react";

import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { matchSorter } from "match-sorter";

import type { ComboboxContextValue } from "./context";
import type { z } from "zod";

import { TickIcon } from "@/icons/tickIcon";
import { cn } from "@/utils/tailwind-merge";

import { ComboboxContext, useComboboxContext } from "./context";

const CREATE_NEW_MARKER = Symbol("create-new");

interface CreateNewItem {
  __createNew: typeof CREATE_NEW_MARKER;
  label: string;
}

const isCreateNewItem = (item: unknown): item is CreateNewItem =>
  typeof item === "object" &&
  item !== null &&
  "__createNew" in item &&
  item.__createNew === CREATE_NEW_MARKER;

interface RootProps<T> {
  children: React.ReactNode;
  createSchema?: z.ZodType<string>;
  getItemId: (item: T) => number | string;
  getItemLabel: (item: T) => string;
  items: T[];
  onAdd: (item: T) => void;
  onCreate?: (inputValue: string) => void;
  onRemove: (item: T) => void;
  selectedItems: T[];
}

const Root = <T,>({
  children,
  createSchema,
  getItemId,
  getItemLabel,
  items,
  onAdd,
  onCreate,
  onRemove,
  selectedItems,
}: RootProps<T>) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [inputValue, setInputValue] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);

  const filteredItems = React.useMemo(() => {
    if (!inputValue.trim()) {
      return items;
    }

    return matchSorter(items, inputValue, {
      keys: [(item) => getItemLabel(item)],
    });
  }, [items, inputValue, getItemLabel]);

  const handleValueChange = (newValue: (CreateNewItem | T)[]) => {
    const createItem = newValue.find((item) => isCreateNewItem(item));
    if (createItem) {
      handleCreate();
      return;
    }

    const validNewItems = newValue.filter((item): item is T => !isCreateNewItem(item));

    const newIds = new Set(validNewItems.map(getItemId));
    const currentIds = new Set(selectedItems.map(getItemId));

    for (const item of validNewItems) {
      if (!currentIds.has(getItemId(item))) {
        onAdd(item);
      }
    }

    for (const item of selectedItems) {
      if (!newIds.has(getItemId(item))) {
        onRemove(item);
      }
    }
  };

  const showCreateOption =
    Boolean(onCreate) &&
    Boolean(inputValue.trim()) &&
    (!createSchema || createSchema.safeParse(inputValue.trim()).success) &&
    ![...items, ...selectedItems].some(
      (item) => getItemLabel(item).toLowerCase() === inputValue.trim().toLowerCase(),
    );

  const handleCreate = () => {
    if (onCreate && inputValue.trim()) {
      onCreate(inputValue.trim());
      setInputValue("");
    }
  };

  const contextValue: ComboboxContextValue<T> = React.useMemo(
    () => ({
      containerRef,
      createSchema,
      getItemId,
      getItemLabel,
      inputValue,
      isOpen,
      items,
      onAdd,
      onCreate,
      onRemove,
      selectedItems,
      setInputValue,
    }),
    [
      items,
      selectedItems,
      getItemId,
      getItemLabel,
      onAdd,
      onRemove,
      inputValue,
      setInputValue,
      onCreate,
      createSchema,
      isOpen,
    ],
  );

  // Include selected items in the list so Base UI's "ensure selected value remains
  // valid" effect never drops them when the dropdown list is filtered by search.
  const deduped = [
    ...filteredItems,
    ...selectedItems.filter(
      (selected) => !filteredItems.some((item) => getItemId(item) === getItemId(selected)),
    ),
  ];

  const itemsWithCreate: (CreateNewItem | T)[] = showCreateOption
    ? [...deduped, { __createNew: CREATE_NEW_MARKER, label: inputValue.trim() }]
    : deduped;

  /* oxlint-disable no-unsafe-type-assertion */
  return (
    <ComboboxContext value={contextValue as ComboboxContextValue<unknown>}>
      {/* oxlint-enable no-unsafe-type-assertion */}
      <ComboboxPrimitive.Root
        autoHighlight
        items={itemsWithCreate}
        multiple
        onInputValueChange={(value) => {
          setInputValue(value ?? "");
        }}
        onOpenChange={(open) => {
          setIsOpen(open);
        }}
        onValueChange={handleValueChange}
        value={selectedItems}
      >
        {children}
      </ComboboxPrimitive.Root>
    </ComboboxContext>
  );
};

function Chips({ children, className, ...props }: ComboboxPrimitive.Chips.Props) {
  const { containerRef } = useComboboxContext();

  return (
    <ComboboxPrimitive.Chips
      className={cn(
        "relative flex min-h-[30px] w-full flex-wrap items-center gap-1 rounded-lg bg-gray-alpha-100 px-[3px] py-[3px] focus-within:ring-2 focus-within:ring-gray-200",
        className,
      )}
      ref={containerRef}
      {...props}
    >
      {children}
    </ComboboxPrimitive.Chips>
  );
}

const { Value } = ComboboxPrimitive;

function Chip<T>({ className, item, ...props }: ComboboxPrimitive.Chip.Props & { item?: T }) {
  const { getItemLabel, onRemove } = useComboboxContext<T>();

  const handleClick = (event: React.MouseEvent) => {
    if (item) {
      event.stopPropagation();
      onRemove(item);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    if (event.key === " ") {
      event.preventDefault();
    }

    event.stopPropagation();
    if (item) {
      onRemove(item);
    }
  };

  return (
    <ComboboxPrimitive.Chip
      {...props}
      aria-label={item ? `Remove ${getItemLabel(item)}` : undefined}
      className={cn(
        "flex cursor-pointer items-center gap-1.5 rounded-[6px] bg-gray-100 px-2 py-[4.5px] text-xs leading-[15px] font-450 tracking-[0.01em] text-gray-800 transition-colors outline-none hover:bg-gray-200 focus-visible:ring-2 focus-visible:ring-gray-200",
        className,
      )}
      data-slot="combobox-chip"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      // Base UI ComboboxChip renders a <div> — can't change to <button> without type mismatch
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
      role="button"
      tabIndex={0}
    />
  );
}

function ChipContent<T>({
  children,
  className,
  item,
  ...props
}: React.ComponentProps<"span"> & {
  item: T;
}) {
  const { getItemLabel } = useComboboxContext<T>();

  return (
    <span
      className={cn("max-w-[100px] truncate leading-[115%] tracking-[0.13px]", className)}
      {...props}
    >
      {children ?? getItemLabel(item)}
    </span>
  );
}

function Input({
  className,
  onKeyDown,
  placeholder = "Search...",
  ...props
}: ComboboxPrimitive.Input.Props) {
  const { isOpen } = useComboboxContext();

  const handleKeyDown: ComboboxPrimitive.Input.Props["onKeyDown"] = (event) => {
    // Prevent clear-on-escape when popup is closed
    // This allows the event to bubble up to close parent popover instead
    if (event.key === "Escape" && !isOpen) {
      event.preventBaseUIHandler();
    }

    onKeyDown?.(event);
  };

  return (
    <ComboboxPrimitive.Input
      className={cn(
        "min-w-[80px] flex-1 bg-transparent px-2.5 text-13 leading-[115%] tracking-[0.13px] outline-none placeholder:font-medium placeholder:text-gray-alpha-600",
        className,
      )}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      {...props}
    />
  );
}

function Portal({ children, ...props }: ComboboxPrimitive.Portal.Props) {
  return (
    <ComboboxPrimitive.Portal data-slot="combobox-portal" {...props}>
      {children}
    </ComboboxPrimitive.Portal>
  );
}

type PositionerProps = Omit<ComboboxPrimitive.Positioner.Props, "anchor"> & {
  anchor?: ComboboxPrimitive.Positioner.Props["anchor"];
};

function Positioner({ anchor, children, className, sideOffset = 4, ...props }: PositionerProps) {
  const { containerRef } = useComboboxContext();

  return (
    <ComboboxPrimitive.Positioner
      anchor={anchor ?? containerRef}
      className={cn("z-52 select-none", className)}
      data-slot="combobox-positioner"
      sideOffset={sideOffset}
      {...props}
    >
      {children}
    </ComboboxPrimitive.Positioner>
  );
}

function Popup({ children, className, ...props }: ComboboxPrimitive.Popup.Props) {
  return (
    <ComboboxPrimitive.Popup
      className={cn(
        "w-(--anchor-width) origin-center rounded-xl bg-gray-0 shadow-custom-7 transition-[transform,scale,opacity,shadow] data-ending-style:scale-95 data-ending-style:opacity-0 data-open:origin-(--transform-origin) data-starting-style:scale-95 data-starting-style:opacity-0 data-[side=bottom]:data-starting-style:-translate-y-1 data-[side=top]:data-starting-style:translate-y-1",
        className,
      )}
      data-slot="combobox-popup"
      {...props}
    >
      {children}
    </ComboboxPrimitive.Popup>
  );
}

function Empty({ children, className, ...props }: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty {...props}>
      <div
        className={cn("px-2 py-[5px] text-13 text-gray-500", className)}
        data-slot="combobox-empty"
      >
        {children}
      </div>
    </ComboboxPrimitive.Empty>
  );
}

function List({ children, ...props }: ComboboxPrimitive.List.Props) {
  const wrappedRenderItem = (item: unknown, index: number) => {
    if (isCreateNewItem(item)) {
      return (
        <Item key="__create-new__" value={item}>
          Create new &quot;{item.label}&quot;
        </Item>
      );
    }

    return typeof children === "function" ? children(item, index) : null;
  };

  return (
    <ComboboxPrimitive.List className="p-1 empty:hidden" data-slot="combobox-list" {...props}>
      {wrappedRenderItem}
    </ComboboxPrimitive.List>
  );
}

function Item({ children, className, ...props }: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      className={cn(
        "group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-[5.5px] text-13 leading-[15px] font-450 tracking-[0.01em] text-gray-900 transition-colors select-none data-highlighted:bg-gray-200",
        className,
      )}
      data-slot="combobox-item"
      {...props}
    >
      {children}
    </ComboboxPrimitive.Item>
  );
}

function ItemIndicator({ children, className, ...props }: ComboboxPrimitive.ItemIndicator.Props) {
  return (
    <ComboboxPrimitive.ItemIndicator
      className={cn(
        "ml-auto flex size-4 shrink-0 items-center justify-center text-plain opacity-0 data-selected:text-plain data-selected:opacity-100",
        className,
      )}
      data-slot="combobox-item-indicator"
      keepMounted
      {...props}
    >
      {children ?? <TickIcon className="text-gray-800" />}
    </ComboboxPrimitive.ItemIndicator>
  );
}

export const Combobox = {
  Chip,
  ChipContent,
  Chips,
  Empty,
  Input,
  Item,
  ItemIndicator,
  List,
  Popup,
  Portal,
  Positioner,
  Root,
  Value,
};
