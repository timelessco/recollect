import * as React from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { matchSorter } from "match-sorter";
import { type z } from "zod";

import {
	ComboboxContext,
	useComboboxContext,
	type ComboboxContextValue,
} from "./context";
import { LightboxCloseIcon } from "@/icons/lightbox-close-icon";
import { TickIcon } from "@/icons/tickIcon";
import { cn } from "@/utils/tailwind-merge";

const CREATE_NEW_MARKER = Symbol("create-new");

type CreateNewItem = {
	__createNew: typeof CREATE_NEW_MARKER;
	label: string;
};

const isCreateNewItem = (item: unknown): item is CreateNewItem =>
	typeof item === "object" &&
	item !== null &&
	"__createNew" in item &&
	(item as CreateNewItem).__createNew === CREATE_NEW_MARKER;

type RootProps<T> = {
	children: React.ReactNode;
	items: T[];
	selectedItems: T[];
	onAdd: (item: T) => void;
	onRemove: (item: T) => void;
	getItemId: (item: T) => string | number;
	getItemLabel: (item: T) => string;
	onCreate?: (inputValue: string) => void;
	createSchema?: z.ZodType<string>;
};

const Root = <T,>({
	children,
	items,
	selectedItems,
	onAdd,
	onRemove,
	getItemId,
	getItemLabel,
	onCreate,
	createSchema,
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

	const handleValueChange = (newValue: Array<T | CreateNewItem>) => {
		const createItem = newValue.find((item) => isCreateNewItem(item));
		if (createItem) {
			handleCreate();
			return;
		}

		const validNewItems = newValue.filter(
			(item): item is T => !isCreateNewItem(item),
		);

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
			(item) =>
				getItemLabel(item).toLowerCase() === inputValue.trim().toLowerCase(),
		);

	const handleCreate = () => {
		if (onCreate && inputValue.trim()) {
			onCreate(inputValue.trim());
			setInputValue("");
		}
	};

	const contextValue: ComboboxContextValue<T> = React.useMemo(
		() => ({
			items,
			selectedItems,
			getItemId,
			getItemLabel,
			onAdd,
			onRemove,
			inputValue,
			setInputValue,
			containerRef,
			onCreate,
			createSchema,
			isOpen,
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

	const itemsWithCreate: Array<T | CreateNewItem> = showCreateOption
		? [
				...filteredItems,
				{ __createNew: CREATE_NEW_MARKER, label: inputValue.trim() },
			]
		: filteredItems;

	return (
		<ComboboxContext value={contextValue as ComboboxContextValue<unknown>}>
			<ComboboxPrimitive.Root
				items={itemsWithCreate}
				multiple
				autoHighlight
				value={selectedItems}
				onValueChange={handleValueChange}
				onInputValueChange={(value) => setInputValue(value ?? "")}
				onOpenChange={(open) => setIsOpen(open)}
			>
				{children}
			</ComboboxPrimitive.Root>
		</ComboboxContext>
	);
};

function Chips({
	className,
	children,
	...props
}: ComboboxPrimitive.Chips.Props) {
	const { containerRef } = useComboboxContext();

	return (
		<ComboboxPrimitive.Chips
			ref={containerRef}
			className={cn(
				"relative flex min-h-[30px] w-full flex-wrap items-center gap-1 rounded-lg bg-gray-100 px-[10px] py-[3px] focus-within:ring-2 focus-within:ring-blue-500",
				className,
			)}
			{...props}
		>
			{children}
		</ComboboxPrimitive.Chips>
	);
}

const Value = ComboboxPrimitive.Value;

function Chip({ className, ...props }: ComboboxPrimitive.Chip.Props) {
	return (
		<ComboboxPrimitive.Chip
			data-slot="combobox-chip"
			className={cn(
				"flex cursor-pointer items-center gap-1 rounded-md bg-gray-800 px-2 py-[2px] text-xs leading-[15px] font-450 tracking-[0.01em] text-white outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
				className,
			)}
			{...props}
		/>
	);
}

function ChipContent<T>({
	className,
	children,
	item,
	...props
}: React.ComponentProps<"span"> & {
	item: T;
}) {
	const { getItemLabel } = useComboboxContext<T>();

	return (
		<span className={cn("max-w-[100px] truncate", className)} {...props}>
			{children ?? getItemLabel(item)}
		</span>
	);
}

function ChipRemove({
	className,
	children,
	...props
}: ComboboxPrimitive.ChipRemove.Props) {
	return (
		<ComboboxPrimitive.ChipRemove
			className={cn(
				"flex items-center justify-center rounded p-0.5 transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-blue-500",
				className,
			)}
			aria-label="Remove"
			{...props}
		>
			{children ?? <LightboxCloseIcon className="size-2.5" />}
		</ComboboxPrimitive.ChipRemove>
	);
}

function Input({
	className,
	placeholder = "Search...",
	onKeyDown,
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
			placeholder={placeholder}
			className={cn(
				"min-w-[80px] flex-1 bg-transparent text-sm outline-none placeholder:text-gray-500",
				className,
			)}
			onKeyDown={handleKeyDown}
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

function Positioner({
	className,
	children,
	sideOffset = 4,
	anchor,
	...props
}: PositionerProps) {
	const { containerRef } = useComboboxContext();

	return (
		<ComboboxPrimitive.Positioner
			className={cn("z-50 select-none", className)}
			sideOffset={sideOffset}
			anchor={anchor ?? containerRef}
			data-slot="combobox-positioner"
			{...props}
		>
			{children}
		</ComboboxPrimitive.Positioner>
	);
}

function Popup({ children, ...props }: ComboboxPrimitive.Popup.Props) {
	return (
		<ComboboxPrimitive.Popup
			data-slot="combobox-popup"
			className="w-(--anchor-width) origin-(--transform-origin) rounded-xl bg-gray-0 shadow-custom-7 transition-[scale,opacity,shadow] data-starting-style:scale-98 data-starting-style:opacity-0"
			{...props}
		>
			{children}
		</ComboboxPrimitive.Popup>
	);
}

function Empty({
	className,
	children,
	...props
}: ComboboxPrimitive.Empty.Props) {
	return (
		<ComboboxPrimitive.Empty {...props}>
			<div
				data-slot="combobox-empty"
				className={cn("px-2 py-[5px] text-13 text-gray-500", className)}
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
		<ComboboxPrimitive.List
			data-slot="combobox-list"
			className="p-1"
			{...props}
		>
			{wrappedRenderItem}
		</ComboboxPrimitive.List>
	);
}

function Item({ className, children, ...props }: ComboboxPrimitive.Item.Props) {
	return (
		<ComboboxPrimitive.Item
			data-slot="combobox-item"
			className={cn(
				"group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-[5px] text-13 leading-[15px] font-450 tracking-[0.01em] text-gray-900 transition-colors select-none data-highlighted:bg-gray-200",
				className,
			)}
			{...props}
		>
			{children}
		</ComboboxPrimitive.Item>
	);
}

function ItemIndicator({
	className,
	children,
	...props
}: ComboboxPrimitive.ItemIndicator.Props) {
	return (
		<ComboboxPrimitive.ItemIndicator
			keepMounted
			data-slot="combobox-item-indicator"
			className={cn(
				"ml-auto flex size-4 shrink-0 items-center justify-center text-plain opacity-0 data-selected:text-plain data-selected:opacity-100",
				className,
			)}
			{...props}
		>
			{children ?? <TickIcon className="text-gray-800" />}
		</ComboboxPrimitive.ItemIndicator>
	);
}

export const Combobox = {
	Root,
	Chips,
	Chip,
	ChipContent,
	ChipRemove,
	Value,
	Input,
	Portal,
	Positioner,
	Popup,
	Empty,
	List,
	Item,
	ItemIndicator,
};
