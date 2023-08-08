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
import HomeIconGray from "../../icons/homeIconGray";
import InboxIconGray from "../../icons/inboxIconGray";
// import OptionsIconGray from "../../icons/optionsIconGray";
import PlusIconWhite from "../../icons/plusIconWhite";
import SearchIconGray from "../../icons/searchIconGray";
import TrashIconGray from "../../icons/trashIconGray";
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
	ALL_BOOKMARKS_URL,
	BOOKMARKS_COUNT_KEY,
	CATEGORIES_KEY,
	IMAGES_URL,
	SEARCH_URL,
	SETTINGS_URL,
	TRASH_URL,
	UNCATEGORIZED_URL,
	VIDEOS_URL,
} from "../../utils/constants";

import "allotment/dist/style.css";
import isEmpty from "lodash/isEmpty";

import Input from "../../components/atoms/input";
import BookmarksSortDropdown from "../../components/customDropdowns.tsx/bookmarksSortDropdown";
import BookmarksViewDropdown from "../../components/customDropdowns.tsx/bookmarksViewDropdown";
import CategoryIconsDropdown from "../../components/customDropdowns.tsx/categoryIconsDropdown";
import ShareDropdown from "../../components/customDropdowns.tsx/shareDropdown";
import SearchInput from "../../components/searchInput";
import useGetCurrentUrlPath from "../../hooks/useGetCurrentUrlPath";
import ImageIcon from "../../icons/imageIcon";
import SettingsIcon from "../../icons/settingsIcon";
import VideoIcon from "../../icons/videoIcon";
import { useMiscellaneousStore } from "../../store/componentStore";
import {
	type BookmarksSortByTypes,
	type BookmarksViewTypes,
	type BookmarkViewCategories,
} from "../../types/componentStoreTypes";

import SidePane from "./sidePane";

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

	const optionsMenuList = [
		{
			icon: <SearchIconGray />,
			name: "Search",
			href: `/${SEARCH_URL}`,
			current: currentPath === SEARCH_URL,
			id: 0,
			count: undefined,
		},
		{
			icon: <HomeIconGray />,
			name: "All Bookmarks",
			href: `/${ALL_BOOKMARKS_URL}`,
			current: currentPath === ALL_BOOKMARKS_URL,
			id: 1,
			count: bookmarksCountData?.data?.allBookmarks,
		},
		{
			icon: <InboxIconGray />,
			name: "Inbox",
			href: `/${UNCATEGORIZED_URL}`,
			current: currentPath === UNCATEGORIZED_URL,
			id: 2,
			count: bookmarksCountData?.data?.uncategorized,
		},
		{
			icon: <TrashIconGray />,
			name: "Trash",
			href: `/${TRASH_URL}`,
			current: currentPath === TRASH_URL,
			id: 3,
			count: bookmarksCountData?.data?.trash,
		},
		{
			icon: <SettingsIcon />,
			name: "Settings",
			href: `/${SETTINGS_URL}`,
			current: currentPath === SETTINGS_URL,
			id: 4,
			count: undefined,
		},
		{
			icon: <ImageIcon />,
			name: "Image",
			href: `/${IMAGES_URL}`,
			current: currentPath === IMAGES_URL,
			id: 5,
			count: undefined,
		},
		{
			icon: <VideoIcon />,
			name: "Videos",
			href: `/${VIDEOS_URL}`,
			current: currentPath === VIDEOS_URL,
			id: 6,
			count: undefined,
		},
	];

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
					className=" w-52 truncate text-xl font-semibold leading-[23px] text-custom-gray-5"
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
					className="m-0 h-[23px] rounded-none  border-none p-0 text-xl font-semibold leading-[23px] text-custom-gray-5 focus:outline-none"
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
					value={headingInputValue}
				/>
			);
		}
	};

	const renderMainPaneNav = () => {
		const headerClass = classNames(
			"flex items-center justify-between border-b-[0.5px] border-b-custom-gray-4 py-[9px]",
			{
				"pl-[15px] pr-3":
					currentBookmarkView === "card" || currentBookmarkView === "moodboard",
				"px-[7px]":
					currentBookmarkView === "headlines" || currentBookmarkView === "list",
			},
		);

		const figureWrapperClass = classNames(
			"flex  items-center px-2 py-[3.5px]",
			{
				"min-w-[250px]": currentBookmarkView !== "list",
				"min-w-[255px]": currentBookmarkView === "list",
			},
		);

		return (
			<header className={headerClass}>
				<div className={figureWrapperClass}>
					<figure className="mr-2 flex h-5 w-5 items-center">
						{navBarLogo()}
					</figure>
					{navBarHeading()}
				</div>
				{currentPath !== SETTINGS_URL && (
					<>
						<SearchInput
							onChange={(value) => {
								setSearchText(value);
							}}
							placeholder={`Search in ${
								find(
									categoryData?.data,
									(item) => item?.category_slug === currentPath,
								)?.category_name ?? "All Bookmarks"
							}`}
							userId={userId}
						/>
						<div className="flex min-w-[420px] items-center justify-end">
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
										<span className="text-white">Clear Trash</span>
									</Button>
								)}
								<BookmarksSortDropdown
									categoryId={categoryId}
									setBookmarksView={setBookmarksView}
									userId={userId}
								/>
								{typeof categoryId === "number" && <ShareDropdown />}
							</div>
							<Button
								className="hover:bg-black"
								onClick={onNavAddClick}
								type="dark"
							>
								<figure className="h-4 w-4">
									<PlusIconWhite />
								</figure>
								<span className="ml-[6px] font-medium leading-[14px] text-white">
									Create
								</span>
							</Button>
						</div>
					</>
				)}
			</header>
		);
	};

	return (
		<div style={{ width: "100vw", height: "100vh" }}>
			{!showSidePane && (
				<Button
					className="absolute left-[12px] top-[64px] z-50 cursor-pointer bg-slate-200 shadow-2xl"
					onClick={() => setShowSidePane(true)}
				>
					<figure>
						<ChevronDoubleRightIcon className="h-4 w-4 shrink-0 text-gray-400" />
					</figure>
				</Button>
			)}
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
					className="transition-all duration-150 ease-in-out"
					maxSize={600}
					minSize={244}
					snap
					visible={showSidePane}
				>
					{showSidePane && (
						<SidePane
							onAddNewCategory={onAddNewCategory}
							onBookmarksDrop={onBookmarksDrop}
							onCategoryOptionClick={onCategoryOptionClick}
							onIconColorChange={onIconColorChange}
							onIconSelect={(value, id) => onIconSelect(value, id)}
						/>
					)}
				</Allotment.Pane>
				<Allotment.Pane className="transition-all duration-150 ease-in-out">
					<div className="w-full">
						{renderMainPaneNav()}
						<main>{renderMainContent()}</main>
					</div>
				</Allotment.Pane>
			</Allotment>
		</div>
	);
};

export default DashboardLayout;
