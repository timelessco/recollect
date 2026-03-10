import { useRef, useState, type RefObject } from "react";
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

import { DestructiveConfirmContent } from "@/components/destructive-confirm-content";
import { Menu } from "@/components/ui/recollect/menu";

type ViewState =
	| "closed"
	| "delete-collection"
	| "menu"
	| "share"
	| "sort"
	| "trash"
	| "view";

export function HeaderOptionsPopover() {
	const [view, setView] = useState<ViewState>("closed");
	const triggerRef = useRef<HTMLButtonElement>(null);

	const handleMenuOpenChange = (nextOpen: boolean) => {
		if (nextOpen) {
			setView("menu");
			return;
		}

		setView((current) => (current === "menu" ? "closed" : current));
	};

	const dismiss = () => {
		setView((current) => (current === "menu" ? current : "closed"));
	};

	return (
		<>
			<Menu.Root open={view === "menu"} onOpenChange={handleMenuOpenChange}>
				<Menu.Trigger
					ref={triggerRef}
					aria-label="Page options"
					className="rounded-lg bg-transparent p-[7px] text-gray-600 hover:bg-gray-100 hover:text-plain-reverse"
				>
					<OptionsIcon />
				</Menu.Trigger>
				<Menu.Portal>
					<Menu.Positioner align="end">
						<Menu.Popup className="w-[180px] leading-[20px]">
							<HeaderMenuItems onSelectView={setView} />
						</Menu.Popup>
					</Menu.Positioner>
				</Menu.Portal>
			</Menu.Root>

			<HeaderSubPanel anchor={triggerRef} onDismiss={dismiss} view={view} />
		</>
	);
}

type SelectViewFn = (view: ViewState) => void;

function HeaderMenuItems({ onSelectView }: { onSelectView: SelectViewFn }) {
	const currentPath = useGetCurrentUrlPath();
	const { category_id: categoryId } = useGetCurrentCategoryId();

	const isCategory = typeof categoryId === "number";
	const showSort = currentPath !== DISCOVER_URL && currentPath !== TRASH_URL;
	const showTrash = currentPath === TRASH_URL;

	return (
		<>
			<Menu.Item
				className="rounded-lg p-0 data-highlighted:bg-gray-200"
				onClick={() => onSelectView("view")}
			>
				<BookmarksViewDropdown renderOnlyButton />
			</Menu.Item>
			{showSort && (
				<Menu.Item
					className="rounded-lg p-0 data-highlighted:bg-gray-200"
					onClick={() => onSelectView("sort")}
				>
					<BookmarksSortDropdown renderOnlyButton />
				</Menu.Item>
			)}
			{showTrash && (
				<Menu.Item
					className="text-red-600 data-highlighted:text-red-600"
					onClick={() => onSelectView("trash")}
				>
					<TrashIconRed />
					<span className="ml-[6px]">Clear Trash</span>
				</Menu.Item>
			)}
			{isCategory && (
				<>
					<Menu.Item onClick={() => onSelectView("share")}>
						<ShareIcon />
						<span className="ml-[6px]">Share</span>
					</Menu.Item>
					<RenameMenuItem />
					<Menu.Item
						className="text-red-600 data-highlighted:text-red-600"
						onClick={() => onSelectView("delete-collection")}
					>
						<TrashIconRed />
						<span className="ml-[6px]">Delete collection</span>
					</Menu.Item>
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

interface HeaderSubPanelProps {
	anchor: RefObject<HTMLButtonElement | null>;
	onDismiss: () => void;
	view: ViewState;
}

function HeaderSubPanel({ anchor, onDismiss, view }: HeaderSubPanelProps) {
	const isSubPanel =
		view === "share" ||
		view === "sort" ||
		view === "trash" ||
		view === "view" ||
		view === "delete-collection";

	return (
		<Popover.Root
			open={isSubPanel}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) {
					onDismiss();
				}
			}}
		>
			<Popover.Portal>
				<Popover.Positioner
					anchor={anchor}
					align="end"
					className="z-10"
					sideOffset={1}
				>
					<Popover.Popup
						className={`rounded-xl bg-gray-50 p-1 leading-[20px] shadow-custom-3 outline-hidden ${view === "share" ? "w-auto" : "w-[180px]"}`}
					>
						<HeaderSubPanelContent view={view} />
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
}

type HeaderSubPanelContentProps = {
	view: ViewState;
};

function HeaderSubPanelContent({ view }: HeaderSubPanelContentProps) {
	if (view === "trash") {
		return <ClearTrashTabContent />;
	}

	if (view === "view") {
		return <BookmarksViewDropdown isDropdown={false} />;
	}

	if (view === "sort") {
		return <BookmarksSortDropdown isDropdown={false} />;
	}

	if (view === "share") {
		return (
			<div className="w-[300px]">
				<ShareContent />
			</div>
		);
	}

	if (view === "delete-collection") {
		return <DeleteCollectionTabContent />;
	}

	return null;
}

function ClearTrashTabContent() {
	const { clearBookmarksInTrashMutation, isPending: isClearingTrash } =
		useClearBookmarksInTrashMutation();

	return (
		<DestructiveConfirmContent
			onConfirm={() => {
				void mutationApiCall(clearBookmarksInTrashMutation.mutateAsync());
			}}
			pending={isClearingTrash}
			label="Clear All Trash"
		/>
	);
}

function DeleteCollectionTabContent() {
	const { category_id: categoryId } = useGetCurrentCategoryId();
	const { onDeleteCollection } = useDeleteCollection();

	return (
		<DestructiveConfirmContent
			onConfirm={() => {
				void onDeleteCollection(true, categoryId as number);
			}}
			label="Delete Collection"
		/>
	);
}
