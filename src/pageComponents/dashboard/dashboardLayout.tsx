// import { Menu, Transition } from "@headlessui/react";

import { useEffect, useState } from "react";
import { ChevronDoubleRightIcon } from "@heroicons/react/solid";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { Allotment } from "allotment";
import classNames from "classnames";
import find from "lodash/find";

import Button from "../../components/atoms/button";
// import SearchInput from "../../components/searchInput";
// import OptionsIconGray from "../../icons/optionsIconGray";
import PlusIconWhite from "../../icons/plusIconWhite";
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
	SETTINGS_URL,
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

type DashboardLayoutProps = {
	categoryId: CategoryIdUrlTypes;
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
	onNavAddClick: () => void;
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
		onNavAddClick,
		onBookmarksDrop,
		updateCategoryName,
		onIconColorChange,
	} = props;

	const [screenWidth, setScreenWidth] = useState(1_200);
	const [showHeadingInput, setShowHeadingInput] = useState(false);
	const [headingInputValue, setHeadingInputValue] = useState("");

	const { isMobile, isTablet } = useIsMobileView();

	const [showSearchBar, setShowSearchBar] = useState(true);

	const isDesktop = !isMobile && !isTablet;

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
					className=" w-52 truncate text-xl font-semibold leading-[23px] text-gray-light-12 "
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
					className="m-0 h-[23px] rounded-none  border-none p-0 text-xl font-semibold leading-[23px] text-gray-light-12  focus:outline-none"
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
		<div className="w-[300px] xl:w-full">
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
		<Button className="mr-2" onClick={() => setShowSearchBar(true)}>
			<SearchInputSearchIcon size="16" />
		</Button>
	);

	const renderSidePaneCollapseButton = (
		<>
			{!showSidePane && (
				<Button
					className="mr-2 cursor-pointer bg-custom-gray-2 shadow-2xl hover:bg-custom-gray-4"
					onClick={() => setShowSidePane(true)}
				>
					<figure>
						<ChevronDoubleRightIcon className="h-3 w-3 shrink-0 text-gray-400" />
					</figure>
				</Button>
			)}
		</>
	);

	const renderMainPaneNav = () => {
		const headerClass = classNames(
			"flex items-center justify-between  border-b-[0.5px] border-b-custom-gray-4 py-[9px]",
			{
				"pl-[15px] pr-3":
					currentBookmarkView === "card" || currentBookmarkView === "moodboard",
				"px-[7px]":
					currentBookmarkView === "headlines" || currentBookmarkView === "list",
			},
		);

		const figureWrapperClass = classNames(
			"flex items-center px-2 py-[3px] w-1/5 xl:w-2/5",
		);

		const showHeadingCondition = isDesktop ? true : !showSearchBar;

		return (
			<header className={headerClass}>
				{showHeadingCondition && (
					<div className={figureWrapperClass}>
						{renderSidePaneCollapseButton}
						<figure className="mr-2 flex max-h-[20px] min-h-[20px] w-full min-w-[20px] max-w-[20px] items-center ">
							{navBarLogo()}
						</figure>
						{navBarHeading()}
					</div>
				)}
				<div className="flex w-4/5 items-center justify-between xl:w-full xl:justify-end xl:pl-2 sm:mt-0">
					<div className="h-5 w-5 xl:hidden" />
					{currentPath !== SETTINGS_URL && (
						<>
							{renderSearchBar}
							<div className="flex w-[407px] items-center justify-end xl:w-max">
								<div className="mr-3 flex items-center space-x-2">
									<BookmarksViewDropdown
										categoryId={categoryId}
										setBookmarksView={setBookmarksView}
										userId={userId}
									/>
									{currentPath === TRASH_URL && (
										<Button
											className="bg-red-700 hover:bg-red-900"
											id="clear-trash-button"
											onClick={() => onClearTrash()}
											type="dark"
										>
											<span className="text-white">
												{isMobile ? "Clear" : "Clear trash"}
											</span>
										</Button>
									)}
									<BookmarksSortDropdown
										categoryId={categoryId}
										setBookmarksView={setBookmarksView}
										userId={userId}
									/>
									{typeof categoryId === "number" && <ShareDropdown />}
								</div>
								{currentPath !== TRASH_URL && (
									<Button
										className="hover:bg-black"
										onClick={onNavAddClick}
										title="create"
										type="dark"
									>
										<figure className="h-4 w-4">
											<PlusIconWhite />
										</figure>
										<span className="ml-[6px] font-medium leading-[14px] text-white xl:hidden">
											Create
										</span>
									</Button>
								)}
							</div>
						</>
					)}
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
				defaultSizes={[144, screenWidth]}
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
					// className="transition-all duration-150 ease-in-out"
					maxSize={600}
					minSize={244}
					snap
					visible={showSidePane}
				>
					<div className={`h-full ${showSidePane ? "block" : " hidden"}`}>
						{renderSidePane}
					</div>
				</Allotment.Pane>
				<Allotment.Pane className="transition-all duration-150 ease-in-out">
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
