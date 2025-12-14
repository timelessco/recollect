"use client";

import {
	useOptimistic,
	useRef,
	useState,
	useTransition,
	type Key,
} from "react";
import {
	Autocomplete,
	Input,
	ListBox,
	SearchField,
	useFilter,
	type Selection,
} from "react-aria-components";

import { CategoryListBoxItem, CategoryTagList } from "./components";
import { type CategoriesData } from "@/types/apiTypes";
import { UNCATEGORIZED_CATEGORY_ID } from "@/utils/constants";

type CategoryMultiSelectProps = {
	allCategories: CategoriesData[];
	onAddCategory: (categoryId: number) => void;
	onRemoveCategory: (categoryId: number) => void;
	placeholder?: string;
	selectedCategoryIds: number[];
};

export const CategoryMultiSelect = ({
	allCategories,
	onAddCategory,
	onRemoveCategory,
	placeholder = "Search categories...",
	selectedCategoryIds,
}: CategoryMultiSelectProps) => {
	const filter = useFilter({ sensitivity: "base" });
	const [isOpen, setIsOpen] = useState(false);
	const [inputValue, setInputValue] = useState("");
	const isEscapePressedRef = useRef(false);
	const [, startTransition] = useTransition();

	const visibleSelectedIds = selectedCategoryIds.filter(
		(id) => id !== UNCATEGORIZED_CATEGORY_ID,
	);

	// Optimistic state for instant UI feedback
	const [optimisticSelectedIds, addOptimisticIds] = useOptimistic(
		visibleSelectedIds,
		(_, newIds: number[]) => newIds,
	);

	// Filter out hidden category from available options
	const visibleCategories = allCategories.filter(
		(cat) => cat.id !== UNCATEGORIZED_CATEGORY_ID,
	);

	// Convert number IDs to string keys for RAC
	const selectedKeys = new Set(optimisticSelectedIds.map(String));

	// Get selected categories data
	const selectedCategories = optimisticSelectedIds
		.map((id) => visibleCategories.find((cat) => cat.id === id))
		.filter((cat): cat is CategoriesData => cat !== undefined);

	const handleSelectionChange = (newSelection: Selection) => {
		if (newSelection === "all") {
			return;
		}

		const newIds = new Set([...newSelection].map(Number));
		const currentIds = new Set(optimisticSelectedIds);

		// Only ignore empty selection changes from Escape key, not intentional unchecking
		if (
			newIds.size === 0 &&
			currentIds.size > 0 &&
			isEscapePressedRef.current
		) {
			return;
		}

		// Determine what was added vs removed
		for (const id of newIds) {
			if (!currentIds.has(id)) {
				// Added - optimistic update then call mutation
				startTransition(() => {
					addOptimisticIds([...optimisticSelectedIds, id]);
					onAddCategory(id);
				});
			}
		}

		for (const id of currentIds) {
			if (!newIds.has(id)) {
				// Removed - optimistic update then call mutation
				startTransition(() => {
					addOptimisticIds(optimisticSelectedIds.filter((x) => x !== id));
					onRemoveCategory(id);
				});
			}
		}
	};

	const handleTagRemove = (keys: Set<Key>) => {
		for (const key of keys) {
			const id = Number(key);
			startTransition(() => {
				addOptimisticIds(optimisticSelectedIds.filter((x) => x !== id));
				onRemoveCategory(id);
			});
		}
	};

	// Handle keyboard events on input
	const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		// Escape closes the ListBox (prevent default to avoid clearing selection)
		if (event.key === "Escape") {
			isEscapePressedRef.current = true;
			event.stopPropagation();
			setIsOpen(false);
			queueMicrotask(() => {
				isEscapePressedRef.current = false;
			});
			return;
		}

		// Backspace/Delete on empty input removes last visible tag
		if (
			(event.key === "Backspace" || event.key === "Delete") &&
			inputValue === "" &&
			optimisticSelectedIds.length > 0
		) {
			const lastId = optimisticSelectedIds[optimisticSelectedIds.length - 1];
			handleTagRemove(new Set([String(lastId)]));
		}
	};

	const filterFn = (textValue: string, inputValue: string) =>
		filter.contains(textValue, inputValue);

	return (
		<div
			aria-label="Select categories"
			className="relative flex min-h-[30px] w-full flex-wrap items-center gap-1 rounded-lg bg-gray-100 px-[10px] py-[3px]"
			onFocus={(event) => event.stopPropagation()}
			role="group"
		>
			<CategoryTagList
				onRemove={handleTagRemove}
				selectedCategories={selectedCategories}
			/>

			<Autocomplete filter={filterFn}>
				<SearchField
					aria-label="Search categories"
					className="flex min-w-[80px] flex-1 items-center"
					onChange={(value) => {
						setInputValue(value);
						setIsOpen(true);
					}}
					onFocus={() => setIsOpen(true)}
					value={inputValue}
				>
					<Input
						className="w-full bg-transparent text-sm outline-none placeholder:text-gray-500 [&::-webkit-search-cancel-button]:hidden"
						onKeyDown={handleInputKeyDown}
						placeholder={placeholder}
					/>
				</SearchField>

				{isOpen && (
					<ListBox
						aria-label="Categories"
						className="absolute top-full left-0 z-10 mt-1 max-h-[220px] w-full overflow-auto rounded-xl bg-gray-0 p-1 shadow-custom-7 outline-none"
						items={visibleCategories}
						onSelectionChange={handleSelectionChange}
						renderEmptyState={() => (
							<div className="px-2 py-[5px] text-13 text-gray-500">
								No categories found
							</div>
						)}
						selectedKeys={selectedKeys}
						selectionMode="multiple"
					>
						{(category) => <CategoryListBoxItem category={category} />}
					</ListBox>
				)}
			</Autocomplete>
		</div>
	);
};
