import { useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import {
	Autocomplete,
	Button,
	Input,
	ListBox,
	Popover,
	SearchField,
	Select,
	useFilter,
	type Key,
} from "react-aria-components";

import useFetchCategories from "../../async/queryHooks/category/useFetchCategories";
import { AddToCollectionsButton } from "../../icons/addToCollectionsButton";
import { useMiscellaneousStore } from "../../store/componentStore";
import { type CategoriesData, type SingleListData } from "../../types/apiTypes";
import { UNCATEGORIZED_CATEGORY_ID } from "../../utils/constants";
import {
	CategoryListBoxItem,
	CategoryTagList,
} from "../categoryMultiSelect/components";

import { useAddCategoryToBookmarkMutation } from "@/async/mutationHooks/category/useAddCategoryToBookmarkMutation";
import { useRemoveCategoryFromBookmarkMutation } from "@/async/mutationHooks/category/useRemoveCategoryFromBookmarkMutation";

type AddToCollectionDropdownProps = {
	everythingData: SingleListData[];
	bookmarkId: number;
	shouldFetch?: boolean;
};

export const AddToCollectionDropdown = ({
	bookmarkId,
	everythingData,
	shouldFetch,
}: AddToCollectionDropdownProps) => {
	const [, startTransition] = useTransition();
	const filter = useFilter({ sensitivity: "base" });
	const triggerRef = useRef<HTMLDivElement | null>(null);

	const setIsCollectionChanged = useMiscellaneousStore(
		(state) => state.setIsCollectionChanged,
	);

	const { addCategoryToBookmarkMutation } = useAddCategoryToBookmarkMutation({
		skipInvalidation: true,
	});
	const { removeCategoryFromBookmarkMutation } =
		useRemoveCategoryFromBookmarkMutation({
			skipInvalidation: true,
			preserveInList: true,
		});

	// Get collections from fetch hook (handles caching internally via React Query)
	const { allCategories } = useFetchCategories(shouldFetch);
	const collections = allCategories?.data ?? [];

	// Get current bookmark's categories
	const currentBookmark = everythingData?.find(
		(bookmark) => bookmark?.id === bookmarkId,
	);

	// Get selected category IDs from addedCategories
	const selectedCategoryIds = useMemo(
		() =>
			currentBookmark?.addedCategories?.length
				? currentBookmark.addedCategories.map((cat) => cat.id)
				: [],
		[currentBookmark?.addedCategories],
	);

	// Filter out uncategorized from visible selections
	const visibleSelectedIds = selectedCategoryIds.filter(
		(id) => id !== UNCATEGORIZED_CATEGORY_ID,
	);

	// Optimistic state for instant UI feedback
	const [optimisticSelectedIds, addOptimisticIds] = useOptimistic(
		visibleSelectedIds,
		(_, newIds: number[]) => newIds,
	);

	// Filter out uncategorized from available options
	const visibleCategories = collections.filter(
		(cat) => cat.id !== UNCATEGORIZED_CATEGORY_ID,
	);

	// Convert number IDs to string keys for RAC Select
	const selectedValue = optimisticSelectedIds.map(String);

	// Get selected categories data
	const selectedCategories = optimisticSelectedIds
		.map((id) => visibleCategories.find((cat) => cat.id === id))
		.filter((cat): cat is CategoriesData => cat !== undefined);

	const handleValueChange = (newValue: Key[]) => {
		const newIds = new Set(newValue.map(Number));
		const currentIds = new Set(optimisticSelectedIds);

		// Added categories
		for (const id of newIds) {
			if (!currentIds.has(id)) {
				startTransition(() => {
					addOptimisticIds([...optimisticSelectedIds, id]);
					addCategoryToBookmarkMutation.mutate({
						bookmark_id: bookmarkId,
						category_id: id,
					});
				});
			}
		}

		// Removed categories
		for (const id of currentIds) {
			if (!newIds.has(id)) {
				startTransition(() => {
					addOptimisticIds(optimisticSelectedIds.filter((x) => x !== id));
					removeCategoryFromBookmarkMutation.mutate({
						bookmark_id: bookmarkId,
						category_id: id,
					});
				});
			}
		}

		setIsCollectionChanged(true);
	};

	const handleTagRemove = (keys: Set<Key>) => {
		for (const key of keys) {
			const id = Number(key);

			startTransition(() => {
				addOptimisticIds(optimisticSelectedIds.filter((x) => x !== id));
				removeCategoryFromBookmarkMutation.mutate({
					bookmark_id: bookmarkId,
					category_id: id,
				});
			});
		}

		setIsCollectionChanged(true);
	};

	const [isOpen, setIsOpen] = useState(false);

	const filterFn = (textValue: string, inputValue: string) =>
		filter.contains(textValue, inputValue);

	return (
		<div className="relative pt-6">
			{/* Tags + Select trigger - ref for stable popover positioning */}
			<div className="flex flex-wrap items-center gap-[6px]" ref={triggerRef}>
				{/* Selected collection tags */}
				{selectedCategories.length > 0 && (
					<CategoryTagList
						onRemove={handleTagRemove}
						selectedCategories={selectedCategories}
					/>
				)}

				<Select
					aria-label="Add to collection"
					onChange={handleValueChange}
					selectionMode="multiple"
					value={selectedValue}
				>
					{/* Trigger button */}
					<Button
						className="flex items-center gap-[6px] rounded-md border border-transparent py-[2px] text-left text-13 text-gray-500 hover:text-plain-reverse focus:outline-hidden"
						onPress={() => setIsOpen(true)}
					>
						<div className="h-[14px] w-[14px] text-gray-600">
							<AddToCollectionsButton />
						</div>

						<span>
							{selectedCategories.length > 0
								? "Edit collections"
								: "Add to collection"}
						</span>
					</Button>

					{/* Popover anchored to outer container for stable positioning */}
					<Popover
						className="z-50 -mt-2 flex max-h-[186px] w-[150px] flex-col rounded-xl bg-gray-50 shadow-md"
						isOpen={isOpen}
						onOpenChange={setIsOpen}
						triggerRef={triggerRef}
					>
						<Autocomplete filter={filterFn}>
							{/* Search input */}
							<div className="sticky top-0 z-10 bg-gray-50 p-1 pb-0">
								<SearchField aria-label="Search collections" className="w-full">
									<Input
										autoFocus
										className="w-full rounded-lg bg-gray-alpha-100 px-2 py-[5px] text-[14px] leading-[115%] font-normal tracking-normal text-gray-800 placeholder:text-gray-alpha-600 focus:outline-hidden [&::-webkit-search-cancel-button]:hidden"
										placeholder="Search"
									/>
								</SearchField>
							</div>

							{/* Checkable list */}
							<div className="hide-scrollbar overflow-y-auto p-1">
								<ListBox
									aria-label="Collections"
									className="outline-none"
									items={visibleCategories}
									renderEmptyState={() => (
										<div className="px-2 py-[5px] text-13 text-gray-500">
											No collections found
										</div>
									)}
								>
									{(category) => <CategoryListBoxItem category={category} />}
								</ListBox>
							</div>
						</Autocomplete>
					</Popover>
				</Select>
			</div>
		</div>
	);
};
