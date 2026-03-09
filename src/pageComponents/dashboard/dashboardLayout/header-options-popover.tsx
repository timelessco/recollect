import { useCallback, useState } from "react";
import { Popover } from "@base-ui/react/popover";

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
import { Menu } from "@/components/ui/recollect/menu";
import { cn } from "@/utils/tailwind-merge";

type HeaderView = "share" | "sort" | "trash" | "view";

export function HeaderOptionsPopover() {
	const [menuOpen, setMenuOpen] = useState(false);
	const [currentView, setCurrentView] = useState<HeaderView | null>(null);

	const openSubView = useCallback((view: HeaderView) => {
		setMenuOpen(false);
		setCurrentView(view);
	}, []);

	const closeAll = useCallback(() => {
		setMenuOpen(false);
		setCurrentView(null);
	}, []);

	const popupClassName = cn(
		"rounded-xl bg-gray-50 shadow-custom-3 outline-hidden",
		currentView === "share" ? "w-auto" : "w-[180px]",
	);

	return (
		<>
			<Menu.Root
				modal={false}
				open={menuOpen}
				onOpenChange={(nextOpen) => {
					setMenuOpen(nextOpen);
					if (!nextOpen) {
						setCurrentView(null);
					}
				}}
			>
				<Menu.Trigger className="rounded-lg bg-transparent p-[7px] text-gray-600 hover:bg-gray-100 hover:text-plain-reverse">
					<OptionsIcon />
				</Menu.Trigger>
				<Menu.Portal>
					<Menu.Positioner align="end">
						<Menu.Popup className="w-[180px] leading-[20px]">
							<HeaderMenuItems
								onCloseMenu={closeAll}
								onOpenSubView={openSubView}
							/>
						</Menu.Popup>
					</Menu.Positioner>
				</Menu.Portal>
			</Menu.Root>

			<Popover.Root
				open={currentView !== null}
				onOpenChange={(nextOpen) => {
					if (!nextOpen) {
						setCurrentView(null);
					}
				}}
			>
				<Popover.Portal>
					<Popover.Positioner align="end" className="z-10" sideOffset={1}>
						<Popover.Popup className={popupClassName}>
							{currentView !== null && (
								<HeaderSubViewContent currentView={currentView} />
							)}
						</Popover.Popup>
					</Popover.Positioner>
				</Popover.Portal>
			</Popover.Root>
		</>
	);
}

interface HeaderMenuItemsProps {
	onCloseMenu: () => void;
	onOpenSubView: (view: HeaderView) => void;
}

function HeaderMenuItems({ onCloseMenu, onOpenSubView }: HeaderMenuItemsProps) {
	const currentPath = useGetCurrentUrlPath();
	const { category_id: categoryId } = useGetCurrentCategoryId();
	const setTriggerHeadingEdit = useMiscellaneousStore(
		(state) => state.setTriggerHeadingEdit,
	);
	const { onDeleteCollection } = useDeleteCollection();

	const showSort = currentPath !== DISCOVER_URL && currentPath !== TRASH_URL;
	const showTrash = currentPath === TRASH_URL;
	const showCollectionActions = typeof categoryId === "number";

	return (
		<>
			<Menu.Item closeOnClick={false} onClick={() => onOpenSubView("view")}>
				<BookmarksViewDropdown renderOnlyButton />
			</Menu.Item>
			{showSort && (
				<Menu.Item closeOnClick={false} onClick={() => onOpenSubView("sort")}>
					<BookmarksSortDropdown renderOnlyButton />
				</Menu.Item>
			)}
			{showTrash && (
				<Menu.Item
					className="text-red-600 data-highlighted:text-red-600"
					closeOnClick={false}
					onClick={() => onOpenSubView("trash")}
				>
					<TrashIconRed />
					<p className="ml-[6px]">Clear Trash</p>
				</Menu.Item>
			)}
			{showCollectionActions && (
				<>
					<Menu.Item
						closeOnClick={false}
						onClick={() => onOpenSubView("share")}
					>
						<figure className="h-4 w-4 text-gray-1000">
							<ShareIcon />
						</figure>
						<span className="ml-[7px]">Share</span>
					</Menu.Item>
					<Menu.Item
						onClick={() => {
							onCloseMenu();
							setTriggerHeadingEdit(true);
							setTimeout(() => setTriggerHeadingEdit(false), 0);
						}}
					>
						<RenameIcon />
						<p className="ml-[6px]">Rename</p>
					</Menu.Item>
					<Menu.Item
						className="text-red-600 data-highlighted:text-red-600"
						onClick={async () => {
							onCloseMenu();
							await onDeleteCollection(true, categoryId as number);
						}}
					>
						<TrashIconRed />
						<p className="ml-[6px]">Delete collection</p>
					</Menu.Item>
				</>
			)}
		</>
	);
}

type HeaderSubViewContentProps = {
	currentView: HeaderView;
};

function HeaderSubViewContent({ currentView }: HeaderSubViewContentProps) {
	if (currentView === "trash") {
		return <ClearTrashTabContent />;
	}

	if (currentView === "view") {
		return <BookmarksViewDropdown isDropdown={false} />;
	}

	if (currentView === "sort") {
		return <BookmarksSortDropdown isDropdown={false} />;
	}

	if (currentView === "share") {
		return (
			<div className="w-[300px]">
				<ShareContent />
			</div>
		);
	}

	return null;
}

function ClearTrashTabContent() {
	const { clearBookmarksInTrashMutation, isPending: isClearingTrash } =
		useClearBookmarksInTrashMutation();

	return (
		<ClearTrashContent
			onClearTrash={() => {
				void mutationApiCall(clearBookmarksInTrashMutation.mutateAsync());
			}}
			isClearingTrash={isClearingTrash}
		/>
	);
}
