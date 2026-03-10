import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import useClearBookmarksInTrashMutation from "../../../async/mutationHooks/bookmarks/useClearBookmarksInTrashMutation";
import { BookmarksSortDropdown } from "../../../components/customDropdowns.tsx/bookmarksSortDropdown";
import { BookmarksViewDropdown } from "../../../components/customDropdowns.tsx/bookmarksViewDropdown";
import { useDeleteCollection } from "../../../hooks/useDeleteCollection";
import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetCurrentUrlPath from "../../../hooks/useGetCurrentUrlPath";
import RenameIcon from "../../../icons/actionIcons/renameIcon";
import TrashIconRed from "../../../icons/actionIcons/trashIconRed";
import OptionsIcon from "../../../icons/optionsIcon";
import ShareIcon from "../../../icons/shareIcon";
import { useMiscellaneousStore } from "../../../store/componentStore";
import { mutationApiCall } from "../../../utils/apiHelpers";
import { DISCOVER_URL, TRASH_URL } from "../../../utils/constants";
import ShareContent from "../share/shareContent";

import { ClearTrashContent } from "@/components/clearTrashContent";
import { AnimatedSize } from "@/components/ui/recollect/animated-size";
import { Menu } from "@/components/ui/recollect/menu";

type ViewState = "closed" | "menu" | "share" | "sort" | "trash" | "view";

export function HeaderOptionsPopover() {
	const [view, setView] = useState<ViewState>("closed");
	const shouldReduceMotion = useReducedMotion();
	const isItemClickRef = useRef(false);

	const popoverOpen = view !== "closed";
	const fade = shouldReduceMotion ? { duration: 0 } : { duration: 0.15 };

	const handleMenuOpenChange = (nextOpen: boolean) => {
		if (nextOpen) {
			setView("menu");
			return;
		}

		if (isItemClickRef.current) {
			isItemClickRef.current = false;
			return;
		}

		setView("closed");
	};

	return (
		<Menu.Root open={popoverOpen} onOpenChange={handleMenuOpenChange}>
			<Menu.Trigger
				aria-label="Page options"
				className="rounded-lg bg-transparent p-[7px] text-gray-600 hover:bg-gray-100 hover:text-plain-reverse"
			>
				<OptionsIcon />
			</Menu.Trigger>
			<Menu.Portal>
				<Menu.Positioner align="end">
					<Menu.Popup className="w-auto overflow-clip p-0 leading-[20px]">
						<AnimatedSize>
							<AnimatePresence mode="popLayout" initial={false}>
								{view === "menu" && (
									<motion.div
										key="menu"
										className="w-[180px] p-1"
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
										transition={fade}
									>
										<HeaderMenuItems
											isItemClickRef={isItemClickRef}
											onSelectView={setView}
										/>
									</motion.div>
								)}
								{view === "view" && (
									<motion.div
										key="view"
										className="w-[180px] p-1"
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
										transition={fade}
									>
										<BookmarksViewDropdown isDropdown={false} />
									</motion.div>
								)}
								{view === "sort" && (
									<motion.div
										key="sort"
										className="w-[180px] p-1"
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
										transition={fade}
									>
										<BookmarksSortDropdown isDropdown={false} />
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
										<div className="w-[300px]">
											<ShareContent />
										</div>
									</motion.div>
								)}
								{view === "trash" && (
									<motion.div
										key="trash"
										className="w-[180px] p-1"
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
										transition={fade}
									>
										<ClearTrashTabContent />
									</motion.div>
								)}
							</AnimatePresence>
						</AnimatedSize>
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
}

interface HeaderMenuItemsProps {
	isItemClickRef: React.RefObject<boolean>;
	onSelectView: (view: ViewState) => void;
}

function HeaderMenuItems({
	isItemClickRef,
	onSelectView,
}: HeaderMenuItemsProps) {
	const currentPath = useGetCurrentUrlPath();
	const { category_id: categoryId } = useGetCurrentCategoryId();

	const isCategory = typeof categoryId === "number";
	const showSort = currentPath !== DISCOVER_URL && currentPath !== TRASH_URL;
	const showTrash = currentPath === TRASH_URL;

	const selectView = (nextView: ViewState) => {
		isItemClickRef.current = true;
		onSelectView(nextView);
	};

	return (
		<>
			<Menu.Item
				className="rounded-lg p-0 data-highlighted:bg-gray-200"
				onClick={() => selectView("view")}
			>
				<BookmarksViewDropdown renderOnlyButton />
			</Menu.Item>
			{showSort && (
				<Menu.Item
					className="rounded-lg p-0 data-highlighted:bg-gray-200"
					onClick={() => selectView("sort")}
				>
					<BookmarksSortDropdown renderOnlyButton />
				</Menu.Item>
			)}
			{showTrash && (
				<Menu.Item
					className="text-red-600 data-highlighted:text-red-600"
					onClick={() => selectView("trash")}
				>
					<TrashIconRed />
					<span className="ml-[6px]">Clear Trash</span>
				</Menu.Item>
			)}
			{isCategory && (
				<>
					<Menu.Item onClick={() => selectView("share")}>
						<ShareIcon />
						<span className="ml-[6px]">Share</span>
					</Menu.Item>
					<RenameMenuItem />
					<DeleteCollectionMenuItem />
				</>
			)}
		</>
	);
}

function RenameMenuItem() {
	const setTriggerHeadingEdit = useMiscellaneousStore(
		(state) => state.setTriggerHeadingEdit,
	);

	return (
		<Menu.Item
			onClick={() => {
				setTriggerHeadingEdit(true);
				setTimeout(() => setTriggerHeadingEdit(false), 0);
			}}
		>
			<RenameIcon />
			<span className="ml-[6px]">Rename</span>
		</Menu.Item>
	);
}

function DeleteCollectionMenuItem() {
	const { category_id: categoryId } = useGetCurrentCategoryId();
	const { onDeleteCollection } = useDeleteCollection();

	return (
		<Menu.Item
			className="text-red-600 data-highlighted:text-red-600"
			onClick={() => {
				void onDeleteCollection(true, categoryId as number);
			}}
		>
			<TrashIconRed />
			<span className="ml-[6px]">Delete collection</span>
		</Menu.Item>
	);
}

function ClearTrashTabContent() {
	const { clearBookmarksInTrashMutation, isPending: isClearingTrash } =
		useClearBookmarksInTrashMutation();

	return (
		<ClearTrashContent
			isClearingTrash={isClearingTrash}
			onClearTrash={() => {
				void mutationApiCall(clearBookmarksInTrashMutation.mutateAsync());
			}}
		/>
	);
}
