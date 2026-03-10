import { useRef, useState, type RefObject } from "react";
import { Popover } from "@base-ui/react/popover";

import ShareContent from "../share/shareContent";

import { type CollectionItemTypes } from "./singleListItemComponent";
import { useUpdateCategoryOptimisticMutation } from "@/async/mutationHooks/category/use-update-category-optimistic-mutation";
import { DestructiveConfirmContent } from "@/components/destructive-confirm-content";
import { Menu } from "@/components/ui/recollect/menu";
import { useDeleteCollection } from "@/hooks/useDeleteCollection";
import OptionsIcon from "@/icons/optionsIcon";

type CollectionOptionsPopoverProps = {
	item: CollectionItemTypes;
};

type ViewState = "closed" | "delete" | "menu" | "share";

export function CollectionOptionsPopover({
	item,
}: CollectionOptionsPopoverProps) {
	const [view, setView] = useState<ViewState>("closed");
	const triggerRef = useRef<HTMLButtonElement>(null);

	const handleMenuOpenChange = (nextOpen: boolean) => {
		if (nextOpen) {
			setView("menu");
			return;
		}

		// Only close if still on "menu" — onClick may have already transitioned to "share"/"delete"
		setView((current) => (current === "menu" ? "closed" : current));
	};

	const dismiss = () => {
		setView((current) => (current === "menu" ? current : "closed"));
	};

	const isOpen = view !== "closed";

	return (
		<>
			<Menu.Root open={view === "menu"} onOpenChange={handleMenuOpenChange}>
				<Menu.Trigger
					ref={triggerRef}
					aria-label="Collection options"
					className={
						isOpen
							? "flex text-gray-500 outline-hidden focus-visible:ring-1 focus-visible:ring-gray-200"
							: "hidden text-gray-500 outline-hidden group-hover:flex focus-visible:ring-1 focus-visible:ring-gray-200"
					}
				>
					<OptionsIcon />
				</Menu.Trigger>
				<Menu.Portal>
					<Menu.Positioner align="start">
						<Menu.Popup className="leading-[20px]">
							<FavoriteMenuItem
								categoryId={item.id}
								isFavorite={item.isFavorite}
							/>
							<Menu.Item
								onClick={(event) => {
									event.stopPropagation();
									setView("share");
								}}
							>
								Share
							</Menu.Item>
							<Menu.Item
								onClick={(event) => {
									event.stopPropagation();
									setView("delete");
								}}
							>
								Delete
							</Menu.Item>
						</Menu.Popup>
					</Menu.Positioner>
				</Menu.Portal>
			</Menu.Root>

			<SharePopover
				anchor={triggerRef}
				categoryId={item.id}
				open={view === "share"}
				onDismiss={dismiss}
			/>

			<DeleteCollectionPopover
				anchor={triggerRef}
				categoryId={item.id}
				isCurrent={item.current}
				open={view === "delete"}
				onDismiss={dismiss}
			/>

			{item.count !== undefined && item.current && (
				<div className="flex w-full justify-end">
					<p
						className={`block text-right text-[11px] leading-[115%] font-450 tracking-[0.03em] text-gray-600 group-hover:hidden ${isOpen ? "hidden" : ""}`}
					>
						{item.count}
					</p>
				</div>
			)}
		</>
	);
}

interface FavoriteMenuItemProps {
	categoryId: number;
	isFavorite?: boolean;
}

function FavoriteMenuItem({ categoryId, isFavorite }: FavoriteMenuItemProps) {
	const { updateCategoryOptimisticMutation } =
		useUpdateCategoryOptimisticMutation();

	return (
		<Menu.Item
			onClick={(event) => {
				event.stopPropagation();
				updateCategoryOptimisticMutation.mutate({
					category_id: categoryId,
					updateData: { is_favorite: !isFavorite },
				});
			}}
		>
			{isFavorite ? "Unfavorite" : "Favorite"}
		</Menu.Item>
	);
}

interface SharePopoverProps {
	anchor: RefObject<HTMLButtonElement | null>;
	categoryId: number;
	onDismiss: () => void;
	open: boolean;
}

function SharePopover({
	anchor,
	categoryId,
	open,
	onDismiss,
}: SharePopoverProps) {
	return (
		<Popover.Root
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) {
					onDismiss();
				}
			}}
		>
			<Popover.Portal>
				<Popover.Positioner
					anchor={anchor}
					align="start"
					className="z-51"
					sideOffset={1}
				>
					<Popover.Popup className="rounded-xl bg-gray-50 p-1 leading-[20px] shadow-custom-3 outline-hidden">
						<div className="w-75 rounded-lg bg-gray-50">
							<ShareContent categoryId={categoryId} />
						</div>
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
}

interface DeleteCollectionPopoverProps {
	anchor: RefObject<HTMLButtonElement | null>;
	categoryId: number;
	isCurrent: boolean;
	onDismiss: () => void;
	open: boolean;
}

function DeleteCollectionPopover({
	anchor,
	categoryId,
	isCurrent,
	open,
	onDismiss,
}: DeleteCollectionPopoverProps) {
	const { onDeleteCollection } = useDeleteCollection();

	return (
		<Popover.Root
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) {
					onDismiss();
				}
			}}
		>
			<Popover.Portal>
				<Popover.Positioner
					anchor={anchor}
					align="start"
					className="z-51"
					sideOffset={1}
				>
					<Popover.Popup className="w-[180px] rounded-xl bg-gray-50 p-1 leading-[20px] shadow-custom-3 outline-hidden">
						<DestructiveConfirmContent
							onConfirm={() => {
								void onDeleteCollection(isCurrent, categoryId);
							}}
							label="Delete Collection"
						/>
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
}
