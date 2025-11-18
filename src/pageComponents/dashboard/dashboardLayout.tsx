/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import { useCallback, useEffect, useRef, useState } from "react";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { Allotment, type AllotmentHandle } from "allotment";
import classNames from "classnames";
import find from "lodash/find";

import Button from "../../components/atoms/button";
import {
	type BookmarksCountTypes,
	type CategoriesData,
} from "../../types/apiTypes";
import { type CategoryIdUrlTypes } from "../../types/componentTypes";
import {
	BOOKMARKS_COUNT_KEY,
	CATEGORIES_KEY,
	TRASH_URL,
} from "../../utils/constants";

import "allotment/dist/style.css";

import Drawer from "react-modern-drawer";

import BookmarksSortDropdown from "../../components/customDropdowns.tsx/bookmarksSortDropdown";
import BookmarksViewDropdown from "../../components/customDropdowns.tsx/bookmarksViewDropdown";
import ShareDropdown from "../../components/customDropdowns.tsx/shareDropdown";
import useGetCurrentUrlPath from "../../hooks/useGetCurrentUrlPath";
import useIsMobileView from "../../hooks/useIsMobileView";
import { useMiscellaneousStore } from "../../store/componentStore";
import {
	type BookmarksSortByTypes,
	type BookmarksViewTypes,
	type BookmarkViewCategories,
} from "../../types/componentStoreTypes";
import { optionsMenuListArray } from "../../utils/commonData";

import {
	NavBarLogo,
	SidePaneCollapseButton,
} from "./dashboardLayoutComponents";
import { NavBarHeading } from "./dashboardLayoutHeadingComponents";
import SidePane from "./sidePane";

import "react-modern-drawer/dist/index.css";

import { isNull } from "lodash";

import { AriaDropdown, AriaDropdownMenu } from "../../components/ariaDropdown";
import AddBookmarkDropdown, {
	type AddBookmarkDropdownTypes,
} from "../../components/customDropdowns.tsx/addBookmarkDropdown";
import { Spinner } from "../../components/spinner";
import RenameIcon from "../../icons/actionIcons/renameIcon";
import TrashIconRed from "../../icons/actionIcons/trashIconRed";
import OptionsIcon from "../../icons/optionsIcon";
import {
	dropdownMenuClassName,
	dropdownMenuItemClassName,
} from "../../utils/commonClassNames";

import { SearchBar } from "./dashboardLayoutSearchComponents";
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
	onDeleteCollectionClick: () => void;
	setBookmarksView: (
		value: BookmarksSortByTypes | BookmarksViewTypes | number[] | string[],
		type: BookmarkViewCategories,
	) => void;
	uploadFileFromAddDropdown: AddBookmarkDropdownTypes["uploadFile"];
	userId: string;
	isLoadingCategories?: boolean;
	isClearingTrash?: boolean;
	children: React.ReactNode;
};

const interpolateScaleValue = (angle: number) => {
	if (angle < 0) {
		return 0.95;
	} else if (angle > 200) {
		return 1;
	} else {
		return 0.95 + (angle / 200) * 0.05;
	}
};

const interpolateTransformValue = (angle: number) => {
	if (angle <= 0) {
		return -23;
	} else if (angle >= 200) {
		return 0;
	} else {
		return -23 + (angle / 200) * 23;
	}
};

const interpolateOpacityValue = (angle: number) => {
	if (angle <= 0) {
		return 0;
	} else if (angle >= 180) {
		return 1;
	} else {
		return angle / 180;
	}
};

const DashboardLayout = (props: DashboardLayoutProps) => {
	const {
		categoryId,
		children,
		userId,
		onAddNewCategory,
		onCategoryOptionClick,
		onClearTrash,
		setBookmarksView,
		onAddBookmark,
		onBookmarksDrop,
		uploadFileFromAddDropdown,
		onDeleteCollectionClick,
		isClearingTrash,
	} = props;

	const { isDesktop } = useIsMobileView();

	const [showSearchBar, setShowSearchBar] = useState(true);
	const [triggerHeadingEdit, setTriggerHeadingEdit] = useState(false);

	const allotmentRef = useRef<AllotmentHandle>(null);
	const sidePaneRef = useRef<HTMLDivElement>(null);

	const showSidePane = useMiscellaneousStore((state) => state.showSidePane);
	const setShowSidePane = useMiscellaneousStore(
		(state) => state.setShowSidePane,
	);

	// this is the resize pane animation logic
	useEffect(() => {
		const resizePaneRef = sidePaneRef?.current;
		const savedState = localStorage.getItem("sidePaneOpen");
		if (savedState !== null) {
			setShowSidePane(savedState === "true");
		}

		const observer = new ResizeObserver((entries) => {
			const elementWidth = entries[0]?.contentRect?.width;
			const sidePaneElement = document.querySelector(
				"#side-pane-id",
			) as HTMLElement;

			if (sidePaneElement) {
				if (elementWidth < 200) {
					sidePaneElement.style.scale =
						interpolateScaleValue(elementWidth)?.toString();
					sidePaneElement.style.transform = `translateX(${interpolateTransformValue(
						elementWidth,
					)}px)`;

					sidePaneElement.style.opacity =
						interpolateOpacityValue(elementWidth)?.toString();
				} else {
					sidePaneElement.style.scale = "1";
					sidePaneElement.style.opacity = "1";
					sidePaneElement.style.transform = `translateX(0px)`;
				}
			}
		});

		if (resizePaneRef) {
			observer.observe(resizePaneRef);
			return () => resizePaneRef && observer.unobserve(resizePaneRef);
		}

		return undefined;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		localStorage.setItem("sidePaneOpen", String(showSidePane));
	}, [showSidePane]);

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

	if (isDesktop) {
		return (
			<div style={{ width: "100vw", height: "100vh" }}>
				<Allotment
					className="split-view-container"
					onChange={(value: number[]) => {
						if (value[0] === 0) {
							setShowSidePane(false);
						}

						if (value[0] === 184) {
							setShowSidePane(true);
						}
					}}
					onDragEnd={(values: number[]) => {
						const leftPaneSize = values?.[0];
						if (leftPaneSize === 0 && sidePaneRef?.current?.clientWidth === 0) {
							// open side pane when its fully closed and on the resize pane click
							setShowSidePane(true);
							// opens side pane
							setTimeout(() => allotmentRef?.current?.reset(), 120);
						}

						const sidepaneWidth = sidePaneRef.current?.clientWidth;
						if (leftPaneSize < 180 && sidepaneWidth && sidepaneWidth > 0) {
							// closes the side pane when user is resizing it and side pane is less than 180px
							setTimeout(() => allotmentRef?.current?.resize([0, 100]), 100);
							setShowSidePane(false);
						}

						if (leftPaneSize > 180 && leftPaneSize < 244) {
							// resets the side pane to default sizes based on user resizing width
							allotmentRef?.current?.reset();
							// close collpase button on resize
							setShowSidePane(true);
						}

						if (leftPaneSize > 244) {
							setShowSidePane(true);
						}
					}}
					onVisibleChange={() => {
						setShowSidePane(false);
					}}
					ref={allotmentRef}
					separator={false}
				>
					<Allotment.Pane
						className="split-left-pane"
						maxSize={350}
						minSize={0}
						preferredSize={244}
						ref={sidePaneRef}
						snap
						visible={showSidePane}
					>
						<div className="h-full min-w-[200px]" id="side-pane-id">
							<SidePane
								onAddNewCategory={onAddNewCategory}
								onBookmarksDrop={onBookmarksDrop}
								onCategoryOptionClick={onCategoryOptionClick}
								isLoadingCategories={props.isLoadingCategories}
							/>
						</div>
					</Allotment.Pane>
					<Allotment.Pane className="split-right-pane">
						<div className="w-full">
							<header
								className={classNames(
									"absolute top-0 z-5 flex w-full items-center justify-between bg-[rgb(255_255_255/90%)] py-[6.5px] shadow-[0_0.5px_0.5px_rgba(0,0,0,0.06)] backdrop-blur-[20.5px] dark:bg-[rgb(16_16_16/90%)]",
									{
										// "pl-[15px] pr-3":
										// 	currentBookmarkView === "card" || currentBookmarkView === "moodboard",
										// "px-[7px]":
										// 	currentBookmarkView === "headlines" || currentBookmarkView === "list",
										"pr-3 pl-[13px]": true,
									},
								)}
							>
								{(isDesktop ? true : !showSearchBar) && (
									<div
										className={classNames(
											"flex w-1/5 items-center px-2 py-[3px] max-xl:w-3/4",
										)}
									>
										<SidePaneCollapseButton
											showSidePane={showSidePane}
											onToggle={() => {
												setShowSidePane(true);
												setTimeout(() => allotmentRef?.current?.reset(), 120);
											}}
										/>
										<figure className="mr-2 flex max-h-[20px] min-h-[20px] w-full max-w-[20px] min-w-[20px] items-center text-plain-reverse">
											<NavBarLogo
												currentCategoryData={currentCategoryData}
												optionsMenuList={optionsMenuList}
											/>
										</figure>
										<NavBarHeading
											currentCategoryData={currentCategoryData}
											headerName={headerName}
											triggerEdit={triggerHeadingEdit}
										/>
									</div>
								)}
								<div
									className={classNames({
										"flex w-4/5 items-center justify-between max-xl:justify-end max-sm:mt-0": true,
										"max-xl:w-full": showSearchBar,
										"max-xl:w-1/4": !showSearchBar,
									})}
								>
									{/* this div is there for centering needs */}
									<div className="h-5 w-[1%] max-xl:hidden" />
									<SearchBar
										showSearchBar={showSearchBar}
										isDesktop={isDesktop}
										categoryId={categoryId}
										currentCategoryData={currentCategoryData}
										currentPath={currentPath}
										userId={userId}
										onShowSearchBar={setShowSearchBar}
									/>
									<div className="flex w-[27%] items-center justify-end gap-3 max-xl:w-max max-xl:gap-2">
										{renderViewBasedHeaderOptions()}
										{currentPath !== TRASH_URL && (
											<AddBookmarkDropdown
												onAddBookmark={onAddBookmark}
												uploadFile={uploadFileFromAddDropdown}
											/>
										)}
										{/* Dark/Light toggle here */}
									</div>
								</div>
							</header>
							<main>{children}</main>
						</div>
					</Allotment.Pane>
				</Allotment>
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
				<SidePane
					onAddNewCategory={onAddNewCategory}
					onBookmarksDrop={onBookmarksDrop}
					onCategoryOptionClick={onCategoryOptionClick}
					isLoadingCategories={props.isLoadingCategories}
				/>
			</Drawer>
			<div className="w-screen">
				<div className="w-full">
					<header
						className={classNames(
							"absolute top-0 z-5 flex w-full items-center justify-between bg-[rgb(255_255_255/90%)] py-[6.5px] shadow-[0_0.5px_0.5px_rgba(0,0,0,0.06)] backdrop-blur-[20.5px] dark:bg-[rgb(16_16_16/90%)]",
							{
								// "pl-[15px] pr-3":
								// 	currentBookmarkView === "card" || currentBookmarkView === "moodboard",
								// "px-[7px]":
								// 	currentBookmarkView === "headlines" || currentBookmarkView === "list",
								"pr-3 pl-[13px]": true,
							},
						)}
					>
						{(isDesktop ? true : !showSearchBar) && (
							<div
								className={classNames(
									"flex w-1/5 items-center px-2 py-[3px] max-xl:w-3/4",
								)}
							>
								<SidePaneCollapseButton
									showSidePane={showSidePane}
									onToggle={() => {
										setShowSidePane(true);
										setTimeout(() => allotmentRef?.current?.reset(), 120);
									}}
								/>
								<figure className="mr-2 flex max-h-[20px] min-h-[20px] w-full max-w-[20px] min-w-[20px] items-center text-plain-reverse">
									<NavBarLogo
										currentCategoryData={currentCategoryData}
										optionsMenuList={optionsMenuList}
									/>
								</figure>
								<NavBarHeading
									currentCategoryData={currentCategoryData}
									headerName={headerName}
									triggerEdit={triggerHeadingEdit}
								/>
							</div>
						)}
						<div
							className={classNames({
								"flex w-4/5 items-center justify-between max-xl:justify-end max-sm:mt-0": true,
								"max-xl:w-full": showSearchBar,
								"max-xl:w-1/4": !showSearchBar,
							})}
						>
							{/* this div is there for centering needs */}
							<div className="h-5 w-[1%] max-xl:hidden" />
							<SearchBar
								showSearchBar={showSearchBar}
								isDesktop={isDesktop}
								categoryId={categoryId}
								currentCategoryData={currentCategoryData}
								currentPath={currentPath}
								userId={userId}
								onShowSearchBar={setShowSearchBar}
							/>
							<div className="flex w-[27%] items-center justify-end gap-3 max-xl:w-max max-xl:gap-2">
								{renderViewBasedHeaderOptions()}
								{currentPath !== TRASH_URL && (
									<AddBookmarkDropdown
										onAddBookmark={onAddBookmark}
										uploadFile={uploadFileFromAddDropdown}
									/>
								)}
								{/* Dark/Light toggle here */}
							</div>
						</div>
					</header>
					<main>{children}</main>
				</div>
			</div>
		</div>
	);
};

export default DashboardLayout;
