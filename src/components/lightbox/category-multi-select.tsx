import { useMemo } from "react";
import { Combobox } from "@base-ui/react/combobox";

import useFetchCategories from "../../async/queryHooks/category/useFetchCategories";
import { AddToCollectionsButton } from "../../icons/addToCollectionsButton";
import { useMiscellaneousStore } from "../../store/componentStore";
import { type CategoriesData } from "../../types/apiTypes";
import { UNCATEGORIZED_CATEGORY_ID } from "../../utils/constants";

import { useAddCategoryToBookmarkMutation } from "@/async/mutationHooks/category/useAddCategoryToBookmarkMutation";
import { useRemoveCategoryFromBookmarkMutation } from "@/async/mutationHooks/category/useRemoveCategoryFromBookmarkMutation";
import { CollectionIcon } from "@/components/collectionIcon";
import {
	EditPopoverMultiSelect,
	useTypedEditPopoverContext,
} from "@/components/edit-popover-multi-select";
import { useBookmarkCategories } from "@/hooks/useBookmarkCategories";
import { LightboxCloseIcon } from "@/icons/lightbox-close-icon";

const LightboxCategoryChips = () => {
	const { selectedItems, getItemId } =
		useTypedEditPopoverContext<CategoriesData>();

	return (
		<>
			{selectedItems.map((item) => (
				<Combobox.Chip
					key={getItemId(item)}
					className="flex cursor-pointer items-center gap-1 rounded-md bg-gray-800 px-2 py-[2px] text-xs leading-[15px] font-450 tracking-[0.01em] text-white outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
					aria-label={item.category_name}
				>
					<CollectionIcon bookmarkCategoryData={item} iconSize="8" size="12" />

					<span className="max-w-[100px] truncate">{item.category_name}</span>

					<Combobox.ChipRemove
						className="flex items-center justify-center rounded p-0.5 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
						aria-label="Remove"
					>
						<LightboxCloseIcon className="size-2.5" />
					</Combobox.ChipRemove>
				</Combobox.Chip>
			))}
		</>
	);
};

type AddToCollectionDropdownProps = {
	bookmarkId: number;
	shouldFetch?: boolean;
};

export const CategoryMultiSelect = ({
	bookmarkId,
	shouldFetch,
}: AddToCollectionDropdownProps) => {
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

	// Get collections from fetch hook
	const { allCategories } = useFetchCategories(shouldFetch);
	const collections = allCategories?.data ?? [];

	// Get selected category IDs from React Query cache
	const selectedCategoryIds = useBookmarkCategories(bookmarkId);

	// Filter out uncategorized from available options
	const visibleCategories = collections.filter(
		(cat) => cat.id !== UNCATEGORIZED_CATEGORY_ID,
	);

	const categoryMap = useMemo(
		() => new Map(visibleCategories.map((cat) => [cat.id, cat])),
		[visibleCategories],
	);

	const selectedCategories = useMemo(
		() =>
			selectedCategoryIds
				.map((id) => categoryMap.get(id))
				.filter((cat): cat is NonNullable<typeof cat> => cat !== undefined),
		[selectedCategoryIds, categoryMap],
	);

	const handleAdd = (category: CategoriesData) => {
		addCategoryToBookmarkMutation.mutate({
			bookmark_id: bookmarkId,
			category_id: category.id,
		});
		setIsCollectionChanged(true);
	};

	const handleRemove = (category: CategoriesData) => {
		removeCategoryFromBookmarkMutation.mutate({
			bookmark_id: bookmarkId,
			category_id: category.id,
		});
		setIsCollectionChanged(true);
	};

	return (
		<div className="relative pt-6">
			<div className="flex flex-wrap items-center gap-[6px]">
				<EditPopoverMultiSelect.Root
					items={visibleCategories}
					selectedItems={selectedCategories}
					getItemId={(cat) => cat.id}
					getItemLabel={(cat) => cat.category_name}
					onAdd={handleAdd}
					onRemove={handleRemove}
				>
					<EditPopoverMultiSelect.Chips className="min-h-0 gap-[6px] bg-transparent p-0 focus-within:ring-0 focus-within:ring-offset-0">
						<LightboxCategoryChips />

						<div className="flex items-center gap-1">
							<div className="h-[14px] w-[14px] text-gray-600">
								<AddToCollectionsButton />
							</div>

							<EditPopoverMultiSelect.Input
								placeholder={
									selectedCategories.length > 0
										? "Edit collections..."
										: "Add to collection..."
								}
								className="w-[130px] border-none bg-transparent py-[2px] text-13 text-gray-500 placeholder:text-gray-500 focus:outline-hidden"
							/>
						</div>
					</EditPopoverMultiSelect.Chips>

					<EditPopoverMultiSelect.Portal>
						<EditPopoverMultiSelect.Positioner className="z-10000">
							<EditPopoverMultiSelect.Popup>
								<EditPopoverMultiSelect.Empty>
									No collections found
								</EditPopoverMultiSelect.Empty>
								<EditPopoverMultiSelect.List
									renderItem={(item: CategoriesData) => (
										<EditPopoverMultiSelect.Item value={item}>
											<CollectionIcon
												bookmarkCategoryData={item}
												iconSize="10"
												size="16"
											/>
											<span className="truncate">{item.category_name}</span>
										</EditPopoverMultiSelect.Item>
									)}
								/>
							</EditPopoverMultiSelect.Popup>
						</EditPopoverMultiSelect.Positioner>
					</EditPopoverMultiSelect.Portal>
				</EditPopoverMultiSelect.Root>
			</div>
		</div>
	);
};
