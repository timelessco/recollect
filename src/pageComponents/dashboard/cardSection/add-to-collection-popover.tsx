import { type Key } from "react";
import { Popover } from "@base-ui/react/popover";
import isEmpty from "lodash/isEmpty";

import { useAddCategoryToBookmarksOptimisticMutation } from "@/async/mutationHooks/category/use-add-category-to-bookmarks-optimistic-mutation";
import useFetchCategories from "@/async/queryHooks/category/useFetchCategories";
import MoveIcon from "@/icons/moveIcon";
import {
	dropdownMenuClassName,
	dropdownMenuItemClassName,
} from "@/utils/commonClassNames";

interface AddToCollectionPopoverProps {
	onSuccess: () => void;
	selectedKeys: Set<Key>;
}

export function AddToCollectionPopover({
	onSuccess,
	selectedKeys,
}: AddToCollectionPopoverProps) {
	return (
		<Popover.Root>
			<Popover.Trigger
				className="flex items-center rounded-lg bg-gray-200 px-2 py-[5px] text-13 leading-4 font-450 text-gray-900"
				render={<button type="button" />}
			>
				<figure className="mr-[6px] text-gray-1000">
					<MoveIcon />
				</figure>
				<p>Add to</p>
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Positioner align="end" className="z-10" sideOffset={1}>
					<Popover.Popup
						className={`${dropdownMenuClassName} leading-[20px] outline-hidden`}
					>
						<AddToCollectionMenu
							onSuccess={onSuccess}
							selectedKeys={selectedKeys}
						/>
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
}

interface AddToCollectionMenuProps {
	onSuccess: () => void;
	selectedKeys: Set<Key>;
}

function AddToCollectionMenu({
	onSuccess,
	selectedKeys,
}: AddToCollectionMenuProps) {
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
				<button
					className={`w-full truncate text-left ${dropdownMenuItemClassName}`}
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
					type="button"
				>
					{item.label}
				</button>
			))}
		</>
	);
}
