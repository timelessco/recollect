import { useState, type Key } from "react";
import { Popover } from "@base-ui/react/popover";
import isEmpty from "lodash/isEmpty";

import { useAddCategoryToBookmarksOptimisticMutation } from "@/async/mutationHooks/category/use-add-category-to-bookmarks-optimistic-mutation";
import { useRemoveCategoryFromBookmarkOptimisticMutation } from "@/async/mutationHooks/category/use-remove-category-from-bookmark-optimistic-mutation";
import useFetchCategories from "@/async/queryHooks/category/useFetchCategories";
import { CollectionIcon } from "@/components/collectionIcon";
import { Button } from "@/components/ui/recollect/button";
import { ScrollArea } from "@/components/ui/recollect/scroll-area";
import MoveIcon from "@/icons/moveIcon";
import { TickIcon } from "@/icons/tickIcon";
import { dropdownMenuClassName } from "@/utils/commonClassNames";

interface AddToCollectionPopoverProps {
	onSuccess: () => void;
	selectedKeys: Set<Key>;
}

export function AddToCollectionPopover({
	onSuccess,
	selectedKeys,
}: AddToCollectionPopoverProps) {
	const [addedCategoryIds, setAddedCategoryIds] = useState<Set<number>>(
		new Set(),
	);

	const handleOpenChange = (open: boolean) => {
		if (open) {
			return;
		}

		if (addedCategoryIds.size > 0) {
			onSuccess();
		}

		setAddedCategoryIds(new Set());
	};

	return (
		<Popover.Root onOpenChange={handleOpenChange}>
			<Popover.Trigger className="flex items-center rounded-lg bg-gray-200 px-2 py-[5px] text-13 leading-4 font-450 text-gray-900">
				<span className="mr-[6px] text-gray-1000" aria-hidden="true">
					<MoveIcon />
				</span>
				<p>Add to</p>
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Positioner align="end" className="z-10" sideOffset={1}>
					<Popover.Popup
						className={`${dropdownMenuClassName} leading-[20px] outline-hidden`}
					>
						<AddToCollectionMenu
							addedCategoryIds={addedCategoryIds}
							onToggle={setAddedCategoryIds}
							selectedKeys={selectedKeys}
						/>
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
}

interface AddToCollectionMenuProps {
	addedCategoryIds: Set<number>;
	onToggle: React.Dispatch<React.SetStateAction<Set<number>>>;
	selectedKeys: Set<Key>;
}

function AddToCollectionMenu({
	addedCategoryIds,
	onToggle,
	selectedKeys,
}: AddToCollectionMenuProps) {
	const { allCategories } = useFetchCategories();
	const { addCategoryToBookmarksOptimisticMutation } =
		useAddCategoryToBookmarksOptimisticMutation();
	const { removeCategoryFromBookmarkOptimisticMutation } =
		useRemoveCategoryFromBookmarkOptimisticMutation();

	if (isEmpty(allCategories?.data)) {
		return null;
	}

	const categories = allCategories?.data ?? [];

	const handleToggle = (categoryId: number) => {
		const selectedIds = Array.from(selectedKeys).map(Number);
		const isAdded = addedCategoryIds.has(categoryId);

		if (isAdded) {
			for (const bookmarkId of selectedIds) {
				removeCategoryFromBookmarkOptimisticMutation.mutate({
					bookmark_id: bookmarkId,
					category_id: categoryId,
				});
			}
		} else {
			addCategoryToBookmarksOptimisticMutation.mutate({
				bookmark_ids: selectedIds,
				category_id: categoryId,
			});
		}

		onToggle((previous) => {
			const next = new Set(previous);

			if (isAdded) {
				next.delete(categoryId);
			} else {
				next.add(categoryId);
			}

			return next;
		});
	};

	return (
		<ScrollArea scrollbarGutter scrollFade scrollHeight={220} hideScrollbar>
			{categories.map((item, index) => {
				const isSelected = addedCategoryIds.has(item.id);

				return (
					<Button
						autoFocus={index === 0}
						className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-[5.5px] text-left text-13 leading-[15px] font-450 tracking-[0.01em] text-gray-900 transition-colors select-none hover:bg-gray-200 [&:focus:not(:hover)]:bg-transparent [&:focus:not(:hover)]:ring-2 [&:focus:not(:hover)]:ring-gray-200 [&:focus:not(:hover)]:ring-inset"
						key={item.id}
						onClick={() => handleToggle(item.id)}
						type="button"
					>
						<CollectionIcon
							bookmarkCategoryData={item}
							iconSize="10"
							size="16"
						/>
						<span className="flex-1 truncate">{item.category_name}</span>
						<span
							className={`ml-auto flex size-4 shrink-0 items-center justify-center transition-opacity ${isSelected ? "opacity-100" : "opacity-0"}`}
						>
							<TickIcon className="text-gray-800" />
						</span>
					</Button>
				);
			})}
		</ScrollArea>
	);
}
