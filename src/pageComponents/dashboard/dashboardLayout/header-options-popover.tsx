/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import { useCallback, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import isNull from "lodash/isNull";

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
import {
	dropdownMenuClassName,
	dropdownMenuItemClassName,
} from "../../../utils/commonClassNames";
import { DISCOVER_URL, TRASH_URL } from "../../../utils/constants";
import ShareContent from "../share/shareContent";

import { ClearTrashContent } from "@/components/clearTrashContent";
import { cn } from "@/utils/tailwind-merge";

export function HeaderOptionsPopover() {
	const [currentTab, setCurrentTab] = useState<string | null>(null);

	const updateCurrentTab = useCallback(
		(value: string) => {
			setCurrentTab(value === "delete-collection" ? null : value);
		},
		[setCurrentTab],
	);

	const popupClassName = cn(
		dropdownMenuClassName,
		"leading-[20px] outline-hidden",
		currentTab === "share" ? "w-auto" : "w-[180px]",
	);

	return (
		<Popover.Root
			onOpenChange={(nextOpen) => {
				if (!nextOpen) {
					setCurrentTab(null);
				}
			}}
		>
			<Popover.Trigger
				className="bg-transparent p-[7px] text-gray-600 hover:text-plain-reverse"
				render={<button type="button" />}
			>
				<OptionsIcon />
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Positioner align="end" className="z-10" sideOffset={1}>
					<Popover.Popup className={popupClassName}>
						{isNull(currentTab) ? (
							<HeaderMenuItems onSelectTab={updateCurrentTab} />
						) : (
							<HeaderTabContent currentTab={currentTab} />
						)}
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
}

type HeaderMenuItemsProps = {
	onSelectTab: (value: string) => void;
};

function HeaderMenuItems({ onSelectTab }: HeaderMenuItemsProps) {
	const currentPath = useGetCurrentUrlPath();
	const { category_id: categoryId } = useGetCurrentCategoryId();

	const optionsData = [
		{
			show: true,
			value: "view",
			render: <BookmarksViewDropdown renderOnlyButton />,
		},
		{
			show: currentPath !== DISCOVER_URL && currentPath !== TRASH_URL,
			value: "sort",
			render: <BookmarksSortDropdown renderOnlyButton />,
		},
		{
			show: currentPath === TRASH_URL,
			value: "trash",
			render: (
				<div
					className={`flex items-center ${dropdownMenuItemClassName} text-red-600 hover:text-red-600 focus:text-red-600`}
				>
					<TrashIconRed />
					<p className="ml-[6px]">Clear Trash</p>
				</div>
			),
		},
		{
			show: typeof categoryId === "number",
			value: "share",
			render: (
				<div className={`flex ${dropdownMenuItemClassName}`}>
					<figure className="h-4 w-4 text-gray-1000">
						<ShareIcon />
					</figure>
					<span className="ml-[7px]">Share</span>
				</div>
			),
		},
		{
			show: typeof categoryId === "number",
			value: "rename",
			render: <RenameOption />,
		},
		{
			show: typeof categoryId === "number",
			value: "delete-collection",
			render: <DeleteCollectionOption />,
		},
	];

	return (
		<>
			{optionsData
				?.filter((optionItem) => optionItem?.show === true)
				?.map((item) => (
					<div key={item?.value} onClick={() => onSelectTab(item?.value)}>
						{item?.render}
					</div>
				))}
		</>
	);
}

function RenameOption() {
	const setTriggerHeadingEdit = useMiscellaneousStore(
		(state) => state.setTriggerHeadingEdit,
	);

	const handleRenameClick = useCallback(() => {
		setTriggerHeadingEdit(true);
		setTimeout(() => setTriggerHeadingEdit(false), 0);
	}, [setTriggerHeadingEdit]);

	return (
		<div
			className={`flex items-center ${dropdownMenuItemClassName}`}
			onClick={handleRenameClick}
		>
			<RenameIcon />
			<p className="ml-[6px]">Rename</p>
		</div>
	);
}

function DeleteCollectionOption() {
	const { category_id: categoryId } = useGetCurrentCategoryId();
	const { onDeleteCollection } = useDeleteCollection();

	return (
		<div
			className={`flex items-center ${dropdownMenuItemClassName} text-red-600 hover:text-red-600 focus:text-red-600`}
			onClick={async () => await onDeleteCollection(true, categoryId as number)}
		>
			<TrashIconRed />
			<p className="ml-[6px]">Delete collection</p>
		</div>
	);
}

type HeaderTabContentProps = {
	currentTab: string;
};

function HeaderTabContent({ currentTab }: HeaderTabContentProps) {
	if (currentTab === "trash") {
		return <ClearTrashTabContent />;
	}

	if (currentTab === "view") {
		return <BookmarksViewDropdown isDropdown={false} />;
	}

	if (currentTab === "sort") {
		return <BookmarksSortDropdown isDropdown={false} />;
	}

	if (currentTab === "share") {
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
