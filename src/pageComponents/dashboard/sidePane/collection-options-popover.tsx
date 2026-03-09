import { useState } from "react";
import { Popover } from "@base-ui/react/popover";

import { DeleteCollectionModal } from "../modals/delete-collection-modal";
import ShareContent from "../share/shareContent";

import { type CollectionItemTypes } from "./singleListItemComponent";
import { useUpdateCategoryOptimisticMutation } from "@/async/mutationHooks/category/use-update-category-optimistic-mutation";
import { Menu } from "@/components/ui/recollect/menu";
import { useIsMobileView } from "@/hooks/useIsMobileView";
import OptionsIcon from "@/icons/optionsIcon";

type CollectionOptionsPopoverProps = {
	item: CollectionItemTypes;
};

export function CollectionOptionsPopover({
	item,
}: CollectionOptionsPopoverProps) {
	const [view, setView] = useState<"closed" | "delete" | "menu" | "share">(
		"closed",
	);
	const { isDesktop } = useIsMobileView();
	const menuOpen = view === "menu";
	const shareOpen = view === "share";

	const portalContainer = !isDesktop
		? (document.querySelector("#side-pane-dropdown-portal") as
				| HTMLElement
				| undefined)
		: undefined;

	const triggerClassName =
		view !== "closed"
			? "flex text-gray-500 outline-hidden focus-visible:ring-1 focus-visible:ring-gray-200"
			: "hidden text-gray-500 outline-hidden group-hover:flex focus-visible:ring-1 focus-visible:ring-gray-200";

	return (
		<>
			<Menu.Root
				modal={false}
				open={menuOpen}
				onOpenChange={(nextOpen) => {
					setView(nextOpen ? "menu" : "closed");
				}}
			>
				<Menu.Trigger className={triggerClassName}>
					<OptionsIcon />
				</Menu.Trigger>
				<Menu.Portal container={portalContainer}>
					<Menu.Positioner align="start">
						<Menu.Popup className="pointer-events-auto leading-[20px]">
							<CollectionMenuItems
								item={item}
								onClose={() => setView("closed")}
								onDelete={() => setView("delete")}
								onShare={() => setView("share")}
							/>
						</Menu.Popup>
					</Menu.Positioner>
				</Menu.Portal>
			</Menu.Root>

			<Popover.Root
				open={shareOpen}
				onOpenChange={(nextOpen) => {
					if (!nextOpen) {
						setView("closed");
					}
				}}
			>
				<Popover.Portal container={portalContainer}>
					<Popover.Positioner align="start" className="z-10" sideOffset={1}>
						<Popover.Popup className="pointer-events-auto rounded-xl bg-gray-50 shadow-custom-3 outline-hidden">
							<div className="w-75 rounded-lg bg-gray-50">
								<ShareContent categoryId={item.id} />
							</div>
						</Popover.Popup>
					</Popover.Positioner>
				</Popover.Portal>
			</Popover.Root>

			<DeleteCollectionModal
				categoryId={item.id}
				isCurrent={item.current}
				open={view === "delete"}
				onOpenChange={(nextOpen) => {
					if (!nextOpen) {
						setView("closed");
					}
				}}
			/>

			{item.count !== undefined && item.current && (
				<div className="flex w-full justify-end">
					<p
						className={`block text-right text-[11px] leading-[115%] font-450 tracking-[0.03em] text-gray-600 group-hover:hidden ${view !== "closed" ? "hidden" : ""}`}
					>
						{item.count}
					</p>
				</div>
			)}
		</>
	);
}

interface CollectionMenuItemsProps {
	item: CollectionItemTypes;
	onClose: () => void;
	onDelete: () => void;
	onShare: () => void;
}

function CollectionMenuItems({
	item,
	onClose,
	onDelete,
	onShare,
}: CollectionMenuItemsProps) {
	const { updateCategoryOptimisticMutation } =
		useUpdateCategoryOptimisticMutation();

	return (
		<>
			<Menu.Item
				onClick={(event) => {
					event.stopPropagation();
					updateCategoryOptimisticMutation.mutate({
						category_id: item.id,
						updateData: {
							is_favorite: !item.isFavorite,
						},
					});
					onClose();
				}}
			>
				{item.isFavorite ? "Unfavorite" : "Favorite"}
			</Menu.Item>
			<Menu.Item
				closeOnClick={false}
				onClick={(event) => {
					event.stopPropagation();
					onShare();
				}}
			>
				Share
			</Menu.Item>
			<Menu.Item
				onClick={(event) => {
					event.stopPropagation();
					onDelete();
				}}
			>
				Delete
			</Menu.Item>
		</>
	);
}
