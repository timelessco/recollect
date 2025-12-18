import * as React from "react";
import { Combobox } from "@base-ui/react/combobox";
import { type z } from "zod";

import {
	EditPopoverMultiSelectContext,
	useEditPopoverMultiSelectContext,
	type EditPopoverMultiSelectContextValue,
} from "./context";
import { CheckIcon } from "@/icons/check-icon";
import { LightboxCloseIcon } from "@/icons/lightbox-close-icon";
import { cn } from "@/utils/tailwind-merge";

const CREATE_NEW_MARKER = Symbol("create-new");

type CreateNewItem = {
	__createNew: typeof CREATE_NEW_MARKER;
	label: string;
};

// Type guard for CreateNewItem
const isCreateNewItem = (item: unknown): item is CreateNewItem =>
	typeof item === "object" &&
	item !== null &&
	"__createNew" in item &&
	(item as CreateNewItem).__createNew === CREATE_NEW_MARKER;

// =============================================================================
// ROOT
// =============================================================================

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

	const handleValueChange = (newValue: Array<T | CreateNewItem>) => {
		// Check if create marker was selected
		const createItem = newValue.find((item) => isCreateNewItem(item));
		if (createItem) {
			handleCreate();
			return;
		}

		// Filter out any CreateNewItem instances (type guard ensures only T items remain)
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

	const contextValue: EditPopoverMultiSelectContextValue<T> = React.useMemo(
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
		],
	);

	// Add create item to items array when conditions are met
	// This ensures the create option participates in keyboard navigation
	const itemsWithCreate: Array<T | CreateNewItem> = showCreateOption
		? [...items, { __createNew: CREATE_NEW_MARKER, label: inputValue.trim() }]
		: items;

	return (
		<EditPopoverMultiSelectContext
			value={
				contextValue as unknown as EditPopoverMultiSelectContextValue<unknown>
			}
		>
			<Combobox.Root
				items={itemsWithCreate}
				multiple
				value={selectedItems}
				onValueChange={handleValueChange}
				onInputValueChange={(value) => setInputValue(value ?? "")}
			>
				{children}
			</Combobox.Root>
		</EditPopoverMultiSelectContext>
	);
};

// =============================================================================
// CHIPS CONTAINER
// =============================================================================

function Chips({ className, children, ...props }: Combobox.Chips.Props) {
	const { containerRef } = useEditPopoverMultiSelectContext();

	return (
		<Combobox.Chips
			ref={containerRef}
			className={cn(
				"relative flex min-h-[30px] w-full flex-wrap items-center gap-1 rounded-lg bg-gray-100 px-[10px] py-[3px] focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-1",
				className,
			)}
			{...props}
		>
			<Combobox.Value>{children}</Combobox.Value>
		</Combobox.Chips>
	);
}

// =============================================================================
// CHIP (renders for each selected item)
// =============================================================================

function Chip() {
	const { selectedItems, getItemId, getItemLabel } =
		useEditPopoverMultiSelectContext();

	return (
		<>
			{selectedItems.map((item) => (
				<Combobox.Chip
					key={getItemId(item)}
					className="flex cursor-pointer items-center gap-1 rounded-md bg-gray-800 px-2 py-[2px] text-xs leading-[15px] font-450 tracking-[0.01em] text-white focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
					aria-label={getItemLabel(item)}
				>
					<span className="max-w-[100px] truncate">{getItemLabel(item)}</span>
					<ChipRemove />
				</Combobox.Chip>
			))}
		</>
	);
}

// =============================================================================
// CHIP REMOVE BUTTON
// =============================================================================

function ChipRemove({ className, ...props }: Combobox.ChipRemove.Props) {
	return (
		<Combobox.ChipRemove
			className={cn(
				"rounded-full p-0.5 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1",
				className,
			)}
			aria-label="Remove"
			{...props}
		>
			<LightboxCloseIcon className="size-2.5" />
		</Combobox.ChipRemove>
	);
}

// =============================================================================
// INPUT
// =============================================================================

function Input({
	className,
	placeholder = "Search...",
	...props
}: Combobox.Input.Props) {
	return (
		<Combobox.Input
			placeholder={placeholder}
			className={cn(
				"min-w-[80px] flex-1 bg-transparent text-sm outline-none placeholder:text-gray-500",
				className,
			)}
			{...props}
		/>
	);
}

// =============================================================================
// POPUP (Portal + Positioner + Popup)
// =============================================================================

type PopupProps = Combobox.Popup.Props & {
	sideOffset?: number;
};

function Popup({ className, children, sideOffset = 4, ...props }: PopupProps) {
	const { containerRef } = useEditPopoverMultiSelectContext();

	return (
		<Combobox.Portal>
			<Combobox.Positioner
				className="z-50"
				sideOffset={sideOffset}
				anchor={containerRef}
			>
				<Combobox.Popup
					className={cn(
						"max-h-[220px] w-(--anchor-width) overflow-y-auto rounded-xl bg-gray-0 p-1 shadow-custom-7",
						className,
					)}
					{...props}
				>
					{children}
				</Combobox.Popup>
			</Combobox.Positioner>
		</Combobox.Portal>
	);
}

// =============================================================================
// EMPTY STATE
// =============================================================================

function Empty({ className, children, ...props }: Combobox.Empty.Props) {
	return (
		<Combobox.Empty {...props}>
			<div className={cn("px-2 py-[5px] text-13 text-gray-500", className)}>
				{children}
			</div>
		</Combobox.Empty>
	);
}

// =============================================================================
// LIST (wrapper for render function)
// =============================================================================

type ListProps<T> = Combobox.List.Props & {
	renderItem: (item: T) => React.ReactNode;
};

function List<T>({ renderItem: renderItemProp, ...props }: ListProps<T>) {
	// Wrap renderItem to handle create option internally
	const wrappedRenderItem = (item: unknown) => {
		if (isCreateNewItem(item)) {
			return (
				<Combobox.Item
					key="__create-new__"
					value={item}
					className="group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-[5px] text-13 leading-[15px] font-450 tracking-[0.01em] text-gray-900 select-none data-highlighted:bg-gray-200"
				>
					Create new &quot;{item.label}&quot;
				</Combobox.Item>
			);
		}

		return renderItemProp(item as T);
	};

	return <Combobox.List {...props}>{wrappedRenderItem}</Combobox.List>;
}

// =============================================================================
// ITEM (styled item with indicator)
// =============================================================================

function Item({ className, children, ...props }: Combobox.Item.Props) {
	return (
		<Combobox.Item
			className={cn(
				"group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-[5px] text-13 leading-[15px] font-450 tracking-[0.01em] text-gray-900 select-none data-highlighted:bg-gray-200",
				className,
			)}
			{...props}
		>
			<ItemIndicator />
			{children}
		</Combobox.Item>
	);
}

// =============================================================================
// ITEM INDICATOR (checkmark)
// =============================================================================

function ItemIndicator({ className, ...props }: Combobox.ItemIndicator.Props) {
	return (
		<Combobox.ItemIndicator
			keepMounted
			className={cn(
				"flex size-4 items-center justify-center rounded-[5px] bg-plain-reverse text-plain-reverse data-selected:text-plain",
				className,
			)}
			{...props}
		>
			<CheckIcon className="size-2.5" />
		</Combobox.ItemIndicator>
	);
}

export const EditPopoverMultiSelect = {
	Root,
	Chips,
	Chip,
	ChipRemove,
	Input,
	Popup,
	Empty,
	List,
	Item,
	ItemIndicator,
};

// Re-export context hooks and types for custom implementations
export {
	type EditPopoverMultiSelectContextValue,
	useEditPopoverMultiSelectContext,
	useTypedEditPopoverContext,
} from "./context";
