import { useState } from "react";
import { Popover } from "@base-ui/react/popover";

import { DeleteCollectionModal } from "../modals/delete-collection-modal";
import ShareContent from "../share/shareContent";

import { type CollectionItemTypes } from "./singleListItemComponent";
import { useUpdateCategoryOptimisticMutation } from "@/async/mutationHooks/category/use-update-category-optimistic-mutation";
import { useIsMobileView } from "@/hooks/useIsMobileView";
import OptionsIcon from "@/icons/optionsIcon";
import { dropdownMenuClassName } from "@/utils/commonClassNames";

type CollectionOptionsPopoverProps = {
	item: CollectionItemTypes;
};

export function CollectionOptionsPopover({
	item,
}: CollectionOptionsPopoverProps) {
	const [view, setView] = useState<"closed" | "menu" | "share">("closed");
	const { isDesktop } = useIsMobileView();
	const open = view !== "closed";

	return (
		<>
			<Popover.Root
				open={open}
				onOpenChange={(nextOpen) => {
					setView(nextOpen ? "menu" : "closed");
				}}
			>
				<Popover.Trigger
					className={
						open
							? "flex text-gray-500"
							: "hidden text-gray-500 group-hover:flex"
					}
				>
					<OptionsIcon />
				</Popover.Trigger>
				<Popover.Portal
					container={
						!isDesktop
							? (document.querySelector("#side-pane-dropdown-portal") as
									| HTMLElement
									| undefined)
							: undefined
					}
				>
					<Popover.Positioner align="start" className="z-10" sideOffset={1}>
						<Popover.Popup
							className={`${dropdownMenuClassName} ${view === "share" ? "w-auto" : ""} pointer-events-auto leading-[20px] outline-hidden`}
						>
							{view === "menu" ? (
								<CollectionMenuItems
									item={item}
									onClose={() => setView("closed")}
									onShare={() => setView("share")}
								/>
							) : (
								<div className="w-75 rounded-lg bg-gray-50">
									<ShareContent categoryId={item.id} />
								</div>
							)}
						</Popover.Popup>
					</Popover.Positioner>
				</Popover.Portal>
			</Popover.Root>
			{item.count !== undefined && item.current && (
				<div className="flex w-full justify-end">
					<p
						className={`block text-right text-[11px] leading-[115%] font-450 tracking-[0.03em] text-gray-600 group-hover:hidden ${open ? "hidden" : ""}`}
					>
						{item.count}
					</p>
				</div>
			)}
		</>
	);
}

type CollectionMenuItemsProps = {
	item: CollectionItemTypes;
	onClose: () => void;
	onShare: () => void;
};

function CollectionMenuItems({
	item,
	onClose,
	onShare,
}: CollectionMenuItemsProps) {
	const { updateCategoryOptimisticMutation } =
		useUpdateCategoryOptimisticMutation();

	const itemClassName =
		"w-full text-left text-gray-800 font-450 text-13 leading-[115%] tracking-[0.01em] px-2 py-[5px] cursor-pointer rounded-lg hover:bg-gray-200 hover:text-gray-900";

	return (
		<>
			<button
				className={itemClassName}
				onClick={(event) => {
					event.preventDefault();
					event.stopPropagation();
					updateCategoryOptimisticMutation.mutate({
						category_id: item.id,
						updateData: {
							is_favorite: !item.isFavorite,
						},
					});
					onClose();
				}}
				type="button"
			>
				{item.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
			</button>
			<button
				className={itemClassName}
				onClick={(event) => {
					event.preventDefault();
					event.stopPropagation();
					onShare();
				}}
				type="button"
			>
				Share
			</button>
			<DeleteCollectionModal
				categoryId={item.id}
				isCurrent={item.current}
				triggerClassName={itemClassName}
			>
				Delete
			</DeleteCollectionModal>
		</>
	);
}
