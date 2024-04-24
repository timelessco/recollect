import { useEffect, useState } from "react";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { Allotment } from "allotment";
import classNames from "classnames";
import find from "lodash/find";

import Button from "../../components/atoms/button";
import {
	type BookmarksCountTypes,
	type CategoriesData,
} from "../../types/apiTypes";
import {
	type CategoryIconsDropdownTypes,
	type CategoryIdUrlTypes,
	type ChildrenTypes,
} from "../../types/componentTypes";
import {
	BOOKMARKS_COUNT_KEY,
	CATEGORIES_KEY,
	menuListItemName,
	TRASH_URL,
} from "../../utils/constants";

import "allotment/dist/style.css";

import isEmpty from "lodash/isEmpty";
// import component 👇
import Drawer from "react-modern-drawer";

import Input from "../../components/atoms/input";
import BookmarksSortDropdown from "../../components/customDropdowns.tsx/bookmarksSortDropdown";
import BookmarksViewDropdown from "../../components/customDropdowns.tsx/bookmarksViewDropdown";
import CategoryIconsDropdown from "../../components/customDropdowns.tsx/categoryIconsDropdown";
import ShareDropdown from "../../components/customDropdowns.tsx/shareDropdown";
import SearchInput from "../../components/searchInput";
import useGetCurrentUrlPath from "../../hooks/useGetCurrentUrlPath";
import useIsMobileView from "../../hooks/useIsMobileView";
import SearchInputSearchIcon from "../../icons/searchInputSearchIcon";
import { useMiscellaneousStore } from "../../store/componentStore";
import {
	type BookmarksSortByTypes,
	type BookmarksViewTypes,
	type BookmarkViewCategories,
} from "../../types/componentStoreTypes";
import { optionsMenuListArray } from "../../utils/commonData";

import SidePane from "./sidePane";

// import styles 👇
import "react-modern-drawer/dist/index.css";

import { isNull } from "lodash";

import { AriaDropdown } from "../../components/ariaDropdown";
import AddBookmarkDropdown, {
	type AddBookmarkDropdownTypes,
} from "../../components/customDropdowns.tsx/addBookmarkDropdown";
import RenameIcon from "../../icons/actionIcons/renameIcon";
import TrashIconRed from "../../icons/actionIcons/trashIconRed";
import GlobeIcon from "../../icons/globeIcon";
import OptionsIconBlack from "../../icons/optionsIconBlack";
import UsersCollabIcon from "../../icons/usersCollabIcon";
import {
	dropdownMenuClassName,
	dropdownMenuItemClassName,
} from "../../utils/commonClassNames";

import ShareContent from "./share/shareContent";

type DashboardLayoutProps = {
	categoryId: CategoryIdUrlTypes;
	onAddBookmark: AddBookmarkDropdownTypes["onAddBookmark"];
	onAddNewCategory: (value: string) => Promise<void>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	onBookmarksDrop: (event: any) => Promise<void>;
	onCategoryOptionClick: (
		value: number | string,
		current: boolean,
		id: number,
	) => Promise<void>;
	onClearTrash: () => void;
	onIconColorChange: CategoryIconsDropdownTypes["onIconColorChange"];
	onIconSelect: (value: string, id: number) => void;
	renderMainContent: () => ChildrenTypes;
	setBookmarksView: (
		value: BookmarksSortByTypes | BookmarksViewTypes | number[] | string[],
		type: BookmarkViewCategories,
	) => void;
	updateCategoryName: (
		id: CategoriesData["id"],
		name: CategoriesData["category_name"],
	) => void;
	userId: string;
};

const DashboardLayout = (props: DashboardLayoutProps) => {
	const {
		categoryId,
		renderMainContent,
		userId,
		onAddNewCategory,
		onCategoryOptionClick,
		onClearTrash,
		onIconSelect,
		setBookmarksView,
		onAddBookmark,
		onBookmarksDrop,
		updateCategoryName,
		onIconColorChange,
	} = props;

	const [screenWidth, setScreenWidth] = useState(1_200);
	const [showHeadingInput, setShowHeadingInput] = useState(false);
	const [headingInputValue, setHeadingInputValue] = useState("");

	const { isMobile, isDesktop } = useIsMobileView();

	const [showSearchBar, setShowSearchBar] = useState(true);

	useEffect(() => {
		if (isDesktop) {
			setShowSearchBar(true);
		} else {
			setShowSearchBar(false);
		}
	}, [isDesktop]);

	useEffect(() => {
		// disabling as we need this for allotement width
		if (screen) {
			setScreenWidth(screen.width);
		}
	}, []);

	const queryClient = useQueryClient();

	const currentPath = useGetCurrentUrlPath();

	const setSearchText = useMiscellaneousStore((state) => state.setSearchText);
	const showSidePane = useMiscellaneousStore((state) => state.showSidePane);
	const setShowSidePane = useMiscellaneousStore(
		(state) => state.setShowSidePane,
	);
	const currentBookmarkView = useMiscellaneousStore(
		(state) => state.currentBookmarkView,
	);

	useEffect(() => {
		setSearchText("");
	}, [categoryId, setSearchText]);

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

	useEffect(() => {
		if (headerName) {
			setHeadingInputValue(headerName);
		}
	}, [headerName]);

	const navBarLogo = () => {
		const currentCategory = find(
			categoryData?.data,
			(item) => item?.category_slug === currentPath,
		);

		if (currentCategory) {
			return (
				<CategoryIconsDropdown
					buttonIconSize={20}
					iconColor={currentCategory?.icon_color}
					iconValue={currentCategory?.icon}
					onIconColorChange={onIconColorChange}
					onIconSelect={(value) => {
						onIconSelect(value, currentCategory?.id);
					}}
				/>
			);
		}

		return find(optionsMenuList, (item) => item?.current === true)?.icon;
	};

	const navBarHeading = () => {
		if (!showHeadingInput) {
			return (
				<div
					className="truncate text-xl font-semibold text-gray-light-12"
					onClick={(event) => {
						event.preventDefault();
						if (event.detail === 2) {
							if (currentCategoryData) {
								setShowHeadingInput(true);
							}

							if (headerName) {
								setHeadingInputValue(headerName);
							}
						}
					}}
					onKeyDown={() => {}}
					role="button"
					tabIndex={0}
				>
					{headingInputValue}
				</div>
			);
		} else {
			return (
				<Input
					className="m-0 h-[28px] rounded-none  border-none p-0 text-xl font-semibold leading-[16px] text-gray-light-12  focus:outline-none"
					errorText=""
					isError={false}
					isFullWidth={false}
					onBlur={() => {
						setShowHeadingInput(false);

						if (
							currentCategoryData?.id &&
							!isEmpty(headingInputValue) &&
							headingInputValue !== currentCategoryData?.category_name
						) {
							updateCategoryName(currentCategoryData?.id, headingInputValue);
						}
					}}
					onChange={(event) => {
						setHeadingInputValue(event.target.value);
					}}
					onKeyDown={(event) => {
						if (
							event.key === "Enter" &&
							!isEmpty(headingInputValue) &&
							headingInputValue !== currentCategoryData?.category_name
						) {
							updateCategoryName(
								currentCategoryData?.id as number,
								headingInputValue,
							);
							setShowHeadingInput(false);
							// setHeadingInputValue("");
						}
					}}
					placeholder="Enter name"
					selectTextOnFocus
					value={headingInputValue}
				/>
			);
		}
	};

	const renderSearchBar = showSearchBar ? (
		<div className="w-[246px] xl:my-[2px] xl:w-full">
			<SearchInput
				onBlur={() => !isDesktop && setShowSearchBar(false)}
				onChange={(value) => {
					setSearchText(value);
				}}
				placeholder={`Search in ${
					find(
						categoryData?.data,
						(item) => item?.category_slug === currentPath,
					)?.category_name ?? menuListItemName.allBookmarks
				}`}
				userId={userId}
			/>
		</div>
	) : (
		<Button
			className="mr-1 bg-transparent hover:bg-transparent"
			onClick={() => setShowSearchBar(true)}
		>
			<SearchInputSearchIcon size="16" />
		</Button>
	);

	const [headerOptionsCurrentTab, setHeaderOptionsCurrentTab] = useState<
		string | null
	>(null);

	const renderViewBasedHeaderOptions = () => {
		const optionsData = [
			{
				show: true,
				value: "view",
				render: (
					<BookmarksViewDropdown
						categoryId={categoryId}
						renderOnlyButton
						setBookmarksView={setBookmarksView}
						userId={userId}
					/>
				),
			},
			{
				show: true,
				value: "sort",
				render: (
					<BookmarksSortDropdown
						categoryId={categoryId}
						renderOnlyButton
						setBookmarksView={setBookmarksView}
						userId={userId}
					/>
				),
			},
			{
				show: currentPath === TRASH_URL,
				value: "trash",
				render: (
					// eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
					<div
						className={`flex items-center text-red-700 ${dropdownMenuItemClassName}`}
						onClick={() => onClearTrash()}
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
					// eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
					<div
						className={`flex items-center ${dropdownMenuItemClassName}`}
						onClick={() => {
							setShowHeadingInput(true);
						}}
					>
						<RenameIcon />
						<p className="ml-[6px]">Rename</p>
					</div>
				),
			},
		];

		const optionsList = optionsData
			?.filter((optionItem) => optionItem?.show === true)
			?.map((item) => (
				// eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
				<div
					key={item?.value}
					onClick={() => setHeaderOptionsCurrentTab(item?.value)}
				>
					{item?.render}
				</div>
			));

		let content = <div />;

		switch (headerOptionsCurrentTab) {
			case "view":
				content = (
					<BookmarksViewDropdown
						categoryId={categoryId}
						isDropdown={false}
						setBookmarksView={setBookmarksView}
						userId={userId}
					/>
				);
				break;
			case "sort":
				content = (
					<BookmarksSortDropdown
						categoryId={categoryId}
						isDropdown={false}
						setBookmarksView={setBookmarksView}
						userId={userId}
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
					<Button className="bg-transparent p-[7px]">
						<OptionsIconBlack />
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

	const collapseButtonCommonClasses =
		"absolute left-[-16px]  mt-[-2px] h-[14px] w-[4px] rounded-md bg-custom-gray-16 transition-transform duration-300 ease-in";
	const renderSidePaneCollapseButton = (
		<>
			{!showSidePane && (
				<div className="relative">
					<div className="">
						<button
							className="group"
							data-am-linearrow="tooltip tooltip-bottom"
							onClick={() => setShowSidePane(true)}
							type="button"
						>
							<div
								className={`${collapseButtonCommonClasses} top-[2px] group-hover:rotate-[-20deg]`}
							/>
							<div
								className={`${collapseButtonCommonClasses}  top-[12px]  group-hover:rotate-[20deg]`}
							/>
						</button>
					</div>
				</div>
			)}
		</>
	);

	const renderMainPaneNav = () => {
		const headerClass = classNames(
			"flex items-center justify-between py-[6.5px] bg-custom-white-1 absolute top-0 w-full z-10  backdrop-blur-[20.5px]",
			{
				// "pl-[15px] pr-3":
				// 	currentBookmarkView === "card" || currentBookmarkView === "moodboard",
				// "px-[7px]":
				// 	currentBookmarkView === "headlines" || currentBookmarkView === "list",
				"pl-[13px] ml-1 pr-3": true,
			},
		);

		const figureWrapperClass = classNames(
			"flex items-center px-2 py-[3px] w-1/5 xl:w-3/4",
		);

		const navOptionsWrapperClass = classNames({
			"flex w-4/5 items-center justify-between xl:justify-end  sm:mt-0": true,
			"xl:w-full": showSearchBar,
			"xl:w-1/4": !showSearchBar,
		});

		const showHeadingCondition = isDesktop ? true : !showSearchBar;

		return (
			<header className={headerClass}>
				{showHeadingCondition && (
					<div className={figureWrapperClass}>
						{renderSidePaneCollapseButton}
						<figure className="mr-2 flex max-h-[20px] min-h-[20px] w-full min-w-[20px] max-w-[20px] items-center">
							{navBarLogo()}
						</figure>
						{navBarHeading()}
						{/* only show when user is not editing the collection name */}
						{!showHeadingInput && (
							<div className="ml-2 flex space-x-2">
								{currentCategoryData?.is_public && <GlobeIcon />}
								{currentCategoryData?.collabData &&
									currentCategoryData?.collabData?.length > 1 && (
										<UsersCollabIcon />
									)}
							</div>
						)}
					</div>
				)}
				<div className={navOptionsWrapperClass}>
					{/* this div is there for centering needs */}
					<div className="h-5 w-[1%] xl:hidden" />
					{renderSearchBar}
					<div className="flex w-[27%] items-center justify-end space-x-3 xl:w-max xl:space-x-2">
						{renderViewBasedHeaderOptions()}
						{currentPath !== TRASH_URL && (
							<AddBookmarkDropdown onAddBookmark={onAddBookmark} />
						)}
					</div>
				</div>
			</header>
		);
	};

	const renderSidePane = (
		<SidePane
			onAddNewCategory={onAddNewCategory}
			onBookmarksDrop={onBookmarksDrop}
			onCategoryOptionClick={onCategoryOptionClick}
			onIconColorChange={onIconColorChange}
			onIconSelect={(value, id) => onIconSelect(value, id)}
		/>
	);

	const renderMainPaneContent = (
		<div className="w-full">
			{renderMainPaneNav()}
			<main>{renderMainContent()}</main>
		</div>
	);
	const renderDeskTopView = (
		<div style={{ width: "100vw", height: "100vh" }}>
			<Allotment
				defaultSizes={[10, screenWidth]}
				onChange={(value: number[]) => {
					if (value[0] === 0) {
						setShowSidePane(false);
					}

					if (value[0] === 244) {
						setShowSidePane(true);
					}
				}}
				onVisibleChange={() => {
					setShowSidePane(false);
				}}
				separator={false}
			>
				<Allotment.Pane
					className="transition-all duration-[50ms] ease-in-out"
					maxSize={600}
					minSize={244}
					snap
					visible={showSidePane}
				>
					<div className={`h-full ${showSidePane ? "block" : " hidden"}`}>
						{renderSidePane}
					</div>
				</Allotment.Pane>
				<Allotment.Pane className="transition-all duration-[50ms] ease-in-out">
					{renderMainPaneContent}
				</Allotment.Pane>
			</Allotment>
		</div>
	);

	const renderMobileView = (
		<div className="flex">
			<Drawer
				direction="left"
				onClose={() => setShowSidePane(false)}
				open={showSidePane}
			>
				{renderSidePane}
			</Drawer>
			<div className="w-[100vw]">{renderMainPaneContent}</div>
		</div>
	);

	return !isMobile ? renderDeskTopView : renderMobileView;
};

export default DashboardLayout;
