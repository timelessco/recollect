import { type Key } from "react";
import isEmpty from "lodash/isEmpty";

import { useAddCategoryToBookmarksOptimisticMutation } from "@/async/mutationHooks/category/use-add-category-to-bookmarks-optimistic-mutation";
import useFetchCategories from "@/async/queryHooks/category/useFetchCategories";
import { Menu } from "@/components/ui/recollect/menu";
import MoveIcon from "@/icons/moveIcon";

interface AddToCollectionPopoverProps {
	onSuccess: () => void;
	selectedKeys: Set<Key>;
}

export function AddToCollectionPopover({
	onSuccess,
	selectedKeys,
}: AddToCollectionPopoverProps) {
	return (
		<Menu.Root>
			<Menu.Trigger className="flex items-center rounded-lg bg-gray-200 px-2 py-[5px] text-13 leading-4 font-450 text-gray-900">
				<span className="mr-[6px] text-gray-1000" aria-hidden="true">
					<MoveIcon />
				</span>
				<p>Add to</p>
			</Menu.Trigger>
			<Menu.Portal>
				<Menu.Positioner align="end">
					<Menu.Popup className="leading-[20px]">
						<AddToCollectionMenuItems
							onSuccess={onSuccess}
							selectedKeys={selectedKeys}
						/>
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
}

interface AddToCollectionMenuItemsProps {
	onSuccess: () => void;
	selectedKeys: Set<Key>;
}

function AddToCollectionMenuItems({
	onSuccess,
	selectedKeys,
}: AddToCollectionMenuItemsProps) {
	const { allCategories } = useFetchCategories();
	const { addCategoryToBookmarksOptimisticMutation } =
		useAddCategoryToBookmarksOptimisticMutation();

	if (isEmpty(allCategories?.data)) {
		return null;
	}

	const categories = (allCategories?.data ?? []).map((item) => ({
		label: item.category_name,
		value: item.id,
	}));

	return (
		<>
			{categories.map((item) => (
				<Menu.Item
					className="w-full truncate text-left"
					key={item.value}
					onClick={() => {
						const selectedIds = Array.from(selectedKeys).map(Number);
						addCategoryToBookmarksOptimisticMutation.mutate(
							{
								bookmark_ids: selectedIds,
								category_id: item.value,
							},
							{ onSuccess },
						);
					}}
				>
					{item.label}
				</Menu.Item>
			))}
		</>
	);
}
