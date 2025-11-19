/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import { useCallback, useEffect, useRef, useState } from "react";
import { useWindowSize } from "@react-hookz/web";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import classNames from "classnames";
import find from "lodash/find";
import Drawer from "react-modern-drawer";
import {
	Panel,
	PanelGroup,
	PanelResizeHandle,
	type ImperativePanelHandle,
} from "react-resizable-panels";

import Button from "../../../components/atoms/button";
import BookmarksSortDropdown from "../../../components/customDropdowns.tsx/bookmarksSortDropdown";
import BookmarksViewDropdown from "../../../components/customDropdowns.tsx/bookmarksViewDropdown";
import ShareDropdown from "../../../components/customDropdowns.tsx/shareDropdown";
import useGetCurrentUrlPath from "../../../hooks/useGetCurrentUrlPath";
import useIsMobileView from "../../../hooks/useIsMobileView";
import {
	type BookmarksCountTypes,
	type CategoriesData,
} from "../../../types/apiTypes";
import {
	type BookmarksSortByTypes,
	type BookmarksViewTypes,
	type BookmarkViewCategories,
} from "../../../types/componentStoreTypes";
import { type CategoryIdUrlTypes } from "../../../types/componentTypes";
import { optionsMenuListArray } from "../../../utils/commonData";
import {
	BOOKMARKS_COUNT_KEY,
	CATEGORIES_KEY,
	TRASH_URL,
} from "../../../utils/constants";
import SidePane from "../sidePane";

import { DashboardContent } from "./dashboardContent";

import "react-modern-drawer/dist/index.css";

import { isNull } from "lodash";

import {
	AriaDropdown,
	AriaDropdownMenu,
} from "../../../components/ariaDropdown";
import { type AddBookmarkDropdownTypes } from "../../../components/customDropdowns.tsx/addBookmarkDropdown";
import { Spinner } from "../../../components/spinner";
import RenameIcon from "../../../icons/actionIcons/renameIcon";
import TrashIconRed from "../../../icons/actionIcons/trashIconRed";
import OptionsIcon from "../../../icons/optionsIcon";
import {
	dropdownMenuClassName,
	dropdownMenuItemClassName,
} from "../../../utils/commonClassNames";
import ShareContent from "../share/shareContent";

const MAX_SIZE_PIXEL = 350;
const MIN_SIZE_PIXEL = 244;

type DashboardLayoutProps = {
	categoryId: CategoryIdUrlTypes;
	onAddBookmark: AddBookmarkDropdownTypes["onAddBookmark"];
	onClearTrash: () => void;
	onDeleteCollectionClick: () => void;
	setBookmarksView: (
		value: BookmarksSortByTypes | BookmarksViewTypes | number[] | string[],
		type: BookmarkViewCategories,
	) => void;
	uploadFileFromAddDropdown: AddBookmarkDropdownTypes["uploadFile"];
	userId: string;
	isClearingTrash?: boolean;
	children: React.ReactNode;
};

const DashboardLayout = (props: DashboardLayoutProps) => {
	const {
		categoryId,
		children,
		userId,
		onClearTrash,
		setBookmarksView,
		onAddBookmark,
		uploadFileFromAddDropdown,
		onDeleteCollectionClick,
		isClearingTrash,
	} = props;

	const [showSearchBar, setShowSearchBar] = useState(true);
	const [triggerHeadingEdit, setTriggerHeadingEdit] = useState(false);
	const sidePanelRef = useRef<ImperativePanelHandle | null>(null);
	const [showSidePane, setShowSidePane] = useState(true);
	const { width: windowWidth } = useWindowSize();

	const { isDesktop } = useIsMobileView();

	useEffect(() => {
		if (isDesktop) {
			setShowSearchBar(true);
		} else {
			setShowSearchBar(false);
		}
	}, [isDesktop]);

	const queryClient = useQueryClient();

	const currentPath = useGetCurrentUrlPath();

	const categoryData = queryClient.getQueryData([CATEGORIES_KEY, userId]) as {
		data: CategoriesData[];
		error: PostgrestError;
	};

	const bookmarksCountData = queryClient.getQueryData([
		BOOKMARKS_COUNT_KEY,
		userId,
	]) as {
		data: BookmarksCountTypes;
		error: PostgrestError;
	};

	const optionsMenuList = optionsMenuListArray(currentPath, bookmarksCountData);

	const currentCategoryData = find(
		categoryData?.data,
		(item) => item?.category_slug === currentPath,
	);
	const headerName =
		currentCategoryData?.category_name ??
		find(optionsMenuList, (item) => item?.current === true)?.name;

	const [headerOptionsCurrentTab, setHeaderOptionsCurrentTab] = useState<
		string | null
	>(null);

	const updateHeaderOptionCurrentTab = useCallback(
		(value: string) => {
			setHeaderOptionsCurrentTab(value === "delete-collection" ? null : value);
		},
		[setHeaderOptionsCurrentTab],
	);

	const renderViewBasedHeaderOptions = () => {
		const optionsData = [
			{
				show: true,
				value: "view",
				render: (
					<BookmarksViewDropdown
						renderOnlyButton
						setBookmarksView={setBookmarksView}
					/>
				),
			},
			{
				show: true,
				value: "sort",
				render: (
					<BookmarksSortDropdown
						renderOnlyButton
						setBookmarksView={setBookmarksView}
					/>
				),
			},
			{
				show: currentPath === TRASH_URL,
				value: "trash",
				render: (
					<div
						className={`flex items-center text-red-700 hover:text-red-700 ${dropdownMenuItemClassName}`}
					>
						<TrashIconRed />
						<p className="ml-[6px]">Clear Trash</p>
					</div>
				),
			},
			{
				show: typeof categoryId === "number",
				value: "share",
				render: <ShareDropdown renderOnlyButton />,
			},
			{
				show: typeof categoryId === "number",
				value: "rename",
				render: (
					<div
						className={`flex items-center ${dropdownMenuItemClassName}`}
						onClick={() => {
							setTriggerHeadingEdit(true);
							setTimeout(() => setTriggerHeadingEdit(false), 0);
						}}
					>
						<RenameIcon />
						<p className="ml-[6px]">Rename</p>
					</div>
				),
			},
			{
				show: typeof categoryId === "number",
				value: "delete-collection",
				render: (
					// using AriaDropdownMenu as we want the dropdown to close on click
					<AriaDropdownMenu
						className={`flex items-center text-red-700 hover:text-red-700 ${dropdownMenuItemClassName}`}
						onClick={onDeleteCollectionClick}
					>
						<TrashIconRed />
						<p className="ml-[6px]">Delete collection</p>
					</AriaDropdownMenu>
				),
			},
		];

		const optionsList = optionsData
			?.filter((optionItem) => optionItem?.show === true)
			?.map((item) => (
				<div
					key={item?.value}
					onClick={() => updateHeaderOptionCurrentTab(item?.value)}
				>
					{item?.render}
				</div>
			));

		let content = <div />;

		// eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
		switch (headerOptionsCurrentTab) {
			case "trash":
				content = (
					<div className="p-1">
						<p className="py-[6px] text-[12px] leading-[115%] tracking-[0.02em] text-gray-600">
							Sure you want to delete?
						</p>
						<Button
							className="flex w-full justify-center bg-gray-alpha-100 py-[5.5px] leading-[115%] tracking-[0.01em] text-[#D10303] hover:bg-gray-alpha-200"
							id="warning-button"
							onClick={onClearTrash}
						>
							{isClearingTrash ? (
								<Spinner className="h-[15px] w-[15px]" />
							) : (
								<>
									<TrashIconRed />
									<p className="ml-[6px]">Clear Trash</p>
								</>
							)}
						</Button>
					</div>
				);
				break;
			case "view":
				content = (
					<BookmarksViewDropdown
						isDropdown={false}
						setBookmarksView={setBookmarksView}
					/>
				);
				break;
			case "sort":
				content = (
					<BookmarksSortDropdown
						isDropdown={false}
						setBookmarksView={setBookmarksView}
					/>
				);
				break;
			case "share":
				content = (
					<div className="w-[300px]">
						<ShareContent />
					</div>
				);
				break;
			default:
				break;
		}

		const dropdownClassNames = classNames({
			"z-10": true,
			"w-full": headerOptionsCurrentTab === "share",
			"w-[180px]": headerOptionsCurrentTab !== "share",
			[dropdownMenuClassName]: true,
		});

		return (
			<AriaDropdown
				menuButton={
					<Button className="bg-transparent p-[7px] text-gray-600 hover:text-plain-reverse">
						<OptionsIcon />
					</Button>
				}
				menuClassName={dropdownClassNames}
				menuOpenToggle={(value) => {
					if (!value) {
						setHeaderOptionsCurrentTab(null);
					}
				}}
			>
				{isNull(headerOptionsCurrentTab) ? optionsList : content}
			</AriaDropdown>
		);
	};

	const minSizePercentage = (MIN_SIZE_PIXEL / windowWidth) * 100;
	const maxSizePercentage = (MAX_SIZE_PIXEL / windowWidth) * 100;

	const dashboardContentElement = (
		<DashboardContent
			categoryId={categoryId}
			currentCategoryData={currentCategoryData}
			currentPath={currentPath}
			headerName={headerName}
			headerOptions={renderViewBasedHeaderOptions()}
			isDesktop={isDesktop}
			onAddBookmark={onAddBookmark}
			onExpandSidePane={() => {
				if (isDesktop) {
					sidePanelRef.current?.expand(minSizePercentage);
				} else {
					setShowSidePane(true);
				}
			}}
			onShowSearchBar={setShowSearchBar}
			optionsMenuList={optionsMenuList}
			showSearchBar={showSearchBar}
			showSidePane={showSidePane}
			triggerHeadingEdit={triggerHeadingEdit}
			uploadFileFromAddDropdown={uploadFileFromAddDropdown}
			userId={userId}
		>
			{children}
		</DashboardContent>
	);

	if (isDesktop) {
		return (
			<div className="h-screen w-screen">
				<PanelGroup direction="horizontal" autoSaveId="conditional">
					<Panel
						ref={sidePanelRef}
						id="left"
						defaultSize={20}
						collapsedSize={0}
						minSize={minSizePercentage}
						maxSize={maxSizePercentage}
						collapsible
						order={1}
						onCollapse={() => setShowSidePane(false)}
						onExpand={() => setShowSidePane(true)}
					>
						<div
							className={classNames(
								"h-full min-w-[200px] origin-left transition-all duration-200 ease-out",
								{
									"translate-x-0 scale-100 opacity-100": showSidePane,
									"-translate-x-5 scale-95 opacity-0": !showSidePane,
								},
							)}
						>
							<SidePane />
						</div>
					</Panel>

					<PanelResizeHandle
						className={`group w-5 cursor-grab! justify-center data-[resize-handle-state='drag']:cursor-grabbing! ${showSidePane ? "flex" : "hidden"}`}
					>
						<div className="h-full w-px cursor-grab! bg-gray-alpha-50 transition-all group-hover:w-2 group-hover:bg-gray-100" />
					</PanelResizeHandle>

					<Panel id="right" order={2}>
						{dashboardContentElement}
					</Panel>
				</PanelGroup>
			</div>
		);
	}

	return (
		<div className="flex">
			<Drawer
				direction="left"
				onClose={() => setShowSidePane(false)}
				open={showSidePane}
			>
				<SidePane />
			</Drawer>

			{dashboardContentElement}
		</div>
	);
};

export default DashboardLayout;
