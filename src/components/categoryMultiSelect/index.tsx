import {
	forwardRef,
	useDeferredValue,
	useId,
	useMemo,
	useState,
	type ComponentPropsWithoutRef,
} from "react";
import * as Ariakit from "@ariakit/react";
import classNames from "classnames";
import { matchSorter } from "match-sorter";

import { type CategoriesData } from "../../types/apiTypes";
import { UNCATEGORIZED_CATEGORY_ID } from "../../utils/constants";
import { CollectionIcon } from "../collectionIcon";

type CategoryMultiSelectProps = {
	allCategories: CategoriesData[];
	disabled?: boolean;
	onChange: (categoryIds: number[]) => void;
	placeholder?: string;
	selectedCategoryIds: number[];
};

type CategoryComboboxProps = Omit<
	ComponentPropsWithoutRef<"input">,
	"onChange"
> & {
	children: React.ReactNode;
	onChange?: (value: string) => void;
	onToggleCategory: (categoryId: number) => void;
	selectedIds: number[];
	value?: string;
};

const CategoryCombobox = forwardRef<HTMLInputElement, CategoryComboboxProps>(
	(props, ref) => {
		const {
			children,
			onChange,
			onToggleCategory,
			selectedIds,
			value,
			...comboboxProps
		} = props;

		const combobox = Ariakit.useComboboxStore({
			resetValueOnHide: true,
			setValue: onChange,
			value,
		});

		const select = Ariakit.useSelectStore({
			combobox,
			setValue: (newValues) => {
				// Find the category that was toggled (added or removed)
				const newValue = newValues[newValues.length - 1];
				if (newValue) {
					const categoryId = Number(newValue);
					onToggleCategory(categoryId);
				}
			},
			value: selectedIds.map(String),
		});

		const defaultInputId = useId();
		const inputId = comboboxProps.id ?? defaultInputId;

		return (
			<>
				<Ariakit.Combobox
					className="ml-1 w-full bg-inherit text-sm leading-4 font-normal text-gray-600 outline-hidden"
					id={inputId}
					ref={ref}
					store={combobox}
					{...comboboxProps}
				/>
				<Ariakit.ComboboxPopover
					className="z-10 hide-scrollbar max-h-[220px] max-w-[300px] overflow-y-auto rounded-xl bg-gray-0 p-1 shadow-custom-7"
					gutter={8}
					render={<Ariakit.SelectList store={select} />}
					sameWidth
					store={combobox}
				>
					{children}
				</Ariakit.ComboboxPopover>
			</>
		);
	},
);

type CategoryItemProps = ComponentPropsWithoutRef<"div"> & {
	category: CategoriesData;
	isSelected: boolean;
};

const menuItemClassName =
	"rounded-lg px-2 py-[5px] cursor-pointer text-13 font-450 leading-[15px] tracking-[0.01em] text-gray-900 data-active-item:bg-gray-200";

const CategoryItem = forwardRef<HTMLDivElement, CategoryItemProps>(
	({ category, isSelected, ...props }, ref) => (
		<Ariakit.SelectItem
			className={menuItemClassName}
			ref={ref}
			render={<Ariakit.ComboboxItem />}
			value={String(category.id)}
			{...props}
		>
			<div className="flex w-full items-center gap-2">
				<input
					checked={isSelected}
					className="size-4 accent-gray-800"
					readOnly
					type="checkbox"
				/>
				<CollectionIcon
					bookmarkCategoryData={category}
					iconSize="10"
					size="16"
				/>
				<span className="truncate">{category.category_name}</span>
			</div>
		</Ariakit.SelectItem>
	),
);

type CategoryTagProps = {
	category: CategoriesData;
	onRemove: () => void;
};

const CategoryTag = ({ category, onRemove }: CategoryTagProps) => (
	<div
		className="mx-[2px] my-0.5 mr-1 flex cursor-pointer items-center gap-1 truncate rounded-md bg-gray-800 px-2 py-[2px] text-xs leading-[15px] font-450 tracking-[0.01em] text-white"
		onClick={onRemove}
		onKeyDown={(event) => {
			if (event.key === "Enter" || event.key === " ") {
				onRemove();
			}
		}}
		role="button"
		tabIndex={0}
	>
		<CollectionIcon bookmarkCategoryData={category} iconSize="8" size="12" />
		<span className="truncate">{category.category_name}</span>
	</div>
);

export const CategoryMultiSelect = ({
	allCategories,
	disabled = false,
	onChange,
	placeholder = "Search categories...",
	selectedCategoryIds,
}: CategoryMultiSelectProps) => {
	const [searchValue, setSearchValue] = useState("");
	const deferredSearchValue = useDeferredValue(searchValue);

	// Filter categories based on search
	const filteredCategories = useMemo(
		() =>
			matchSorter(allCategories, deferredSearchValue, {
				keys: ["category_name"],
			}),
		[allCategories, deferredSearchValue],
	);

	// Get selected category objects
	const selectedCategories = useMemo(
		() => allCategories.filter((cat) => selectedCategoryIds.includes(cat.id)),
		[allCategories, selectedCategoryIds],
	);

	// Handle category toggle with uncategorized mutual exclusivity
	const handleToggleCategory = (categoryId: number) => {
		const isCurrentlySelected = selectedCategoryIds.includes(categoryId);

		if (isCurrentlySelected) {
			// Prevent removing if it's the only selected category
			if (selectedCategoryIds.length === 1) {
				return;
			}

			// Remove the category
			onChange(selectedCategoryIds.filter((id) => id !== categoryId));
		} else if (categoryId === UNCATEGORIZED_CATEGORY_ID) {
			// Selecting Uncategorized clears all others
			onChange([UNCATEGORIZED_CATEGORY_ID]);
		} else {
			// Selecting any other category removes Uncategorized
			const withoutUncategorized = selectedCategoryIds.filter(
				(id) => id !== UNCATEGORIZED_CATEGORY_ID,
			);
			onChange([...withoutUncategorized, categoryId]);
		}
	};

	// Handle removing a tag
	const handleRemoveTag = (categoryId: number) => {
		// Prevent removing if it's the only selected category
		if (selectedCategoryIds.length === 1) {
			return;
		}

		onChange(selectedCategoryIds.filter((id) => id !== categoryId));
	};

	const mainWrapperClassName = classNames(
		"py-[3px] px-[10px] rounded-lg w-full bg-gray-100 flex items-center flex-wrap min-h-[30px]",
		{ "opacity-50 pointer-events-none": disabled },
	);

	return (
		<div className={mainWrapperClassName}>
			{selectedCategories.map((category) => (
				<CategoryTag
					category={category}
					key={category.id}
					onRemove={() => handleRemoveTag(category.id)}
				/>
			))}
			<div className="min-w-[120px] flex-1">
				<CategoryCombobox
					disabled={disabled}
					onChange={setSearchValue}
					onToggleCategory={handleToggleCategory}
					placeholder={placeholder}
					selectedIds={selectedCategoryIds}
					value={searchValue}
				>
					{filteredCategories.map((category) => (
						<CategoryItem
							category={category}
							isSelected={selectedCategoryIds.includes(category.id)}
							key={category.id}
						/>
					))}
					{filteredCategories.length === 0 && (
						<div className={menuItemClassName}>No categories found</div>
					)}
				</CategoryCombobox>
			</div>
		</div>
	);
};
