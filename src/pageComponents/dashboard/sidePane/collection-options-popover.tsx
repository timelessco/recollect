import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { DeleteCollectionModal } from "../modals/delete-collection-modal";
import ShareContent from "../share/shareContent";

import { type CollectionItemTypes } from "./singleListItemComponent";
import { useUpdateCategoryOptimisticMutation } from "@/async/mutationHooks/category/use-update-category-optimistic-mutation";
import { AnimatedSize } from "@/components/ui/recollect/animated-size";
import { Menu } from "@/components/ui/recollect/menu";
import OptionsIcon from "@/icons/optionsIcon";

type CollectionOptionsPopoverProps = {
	item: CollectionItemTypes;
};

type ViewState = "closed" | "delete" | "menu" | "share";

export function CollectionOptionsPopover({
	item,
}: CollectionOptionsPopoverProps) {
	const [view, setView] = useState<ViewState>("closed");
	const [exitingMenu, setExitingMenu] = useState(false);
	const shouldReduceMotion = useReducedMotion();
	const isItemClick = useRef(false);

	const popoverOpen = view === "menu" || view === "share";
	const showTrigger = view !== "closed" || exitingMenu;
	const fade = shouldReduceMotion ? { duration: 0 } : { duration: 0.15 };

	const handleMenuOpenChange = (nextOpen: boolean) => {
		if (nextOpen) {
			setExitingMenu(false);
			setView("menu");
			return;
		}

		// Skip close if a Menu.Item onClick already transitioned the view
		if (isItemClick.current) {
			isItemClick.current = false;
			return;
		}

		// Keep trigger visible during exit animation so floating-ui
		// retains a valid anchor. Cleared in onOpenChangeComplete.
		setExitingMenu(true);
		setView("closed");
	};

	return (
		<>
			<Menu.Root
				open={popoverOpen}
				onOpenChange={handleMenuOpenChange}
				onOpenChangeComplete={() => setExitingMenu(false)}
			>
				<Menu.Trigger
					aria-label="Collection options"
					className={
						showTrigger
							? "flex text-gray-500 outline-hidden focus-visible:ring-1 focus-visible:ring-gray-200"
							: "hidden text-gray-500 outline-hidden group-hover:flex focus-visible:ring-1 focus-visible:ring-gray-200"
					}
				>
					<OptionsIcon />
				</Menu.Trigger>
				<Menu.Portal>
					<Menu.Positioner align="start">
						<Menu.Popup className="w-auto overflow-clip p-0 leading-[20px]">
							<AnimatedSize>
								<AnimatePresence mode="popLayout" initial={false}>
									{view === "menu" && (
										<motion.div
											key="menu"
											className="w-48 p-1"
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											exit={{ opacity: 0 }}
											transition={fade}
										>
											<FavoriteMenuItem
												categoryId={item.id}
												isFavorite={item.isFavorite}
											/>
											<Menu.Item
												onClick={(event) => {
													event.stopPropagation();
													isItemClick.current = true;
													setView("share");
												}}
											>
												Share
											</Menu.Item>
											<Menu.Item
												onClick={(event) => {
													event.stopPropagation();
													isItemClick.current = true;
													setView("delete");
												}}
											>
												Delete
											</Menu.Item>
										</motion.div>
									)}
									{view === "share" && (
										<motion.div
											key="share"
											className="p-1"
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											exit={{ opacity: 0 }}
											transition={fade}
										>
											<div className="w-75 rounded-lg bg-gray-50">
												<ShareContent categoryId={item.id} />
											</div>
										</motion.div>
									)}
								</AnimatePresence>
							</AnimatedSize>
						</Menu.Popup>
					</Menu.Positioner>
				</Menu.Portal>
			</Menu.Root>

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
						className={`block text-right text-[11px] leading-[115%] font-450 tracking-[0.03em] text-gray-600 group-hover:hidden ${showTrigger ? "hidden" : ""}`}
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
