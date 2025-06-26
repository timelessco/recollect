import { type onBulkBookmarkDeleteType } from ".";
import { useEffect, useRef, type Key } from "react";
import { useRouter } from "next/router";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import classNames from "classnames";
import find from "lodash/find";
import isEmpty from "lodash/isEmpty";
import isNull from "lodash/isNull";
import {
	DragPreview,
	useDraggableCollection,
	useListBox,
	type DragItem,
} from "react-aria";
import Masonry from "react-masonry-css";
import {
	useDraggableCollectionState,
	useListState,
	type ListProps,
} from "react-stately";

import {
	AriaDropdown,
	AriaDropdownMenu,
} from "../../../components/ariaDropdown";
import Checkbox from "../../../components/checkbox";
import useIsMobileView from "../../../hooks/useIsMobileView";
import MoveIcon from "../../../icons/moveIcon";
import {
	useMiscellaneousStore,
	useSupabaseSession,
} from "../../../store/componentStore";
import {
	type CategoriesData,
	type SingleListData,
} from "../../../types/apiTypes";
import {
	dropdownMenuClassName,
	dropdownMenuItemClassName,
} from "../../../utils/commonClassNames";
import {
	CATEGORIES_KEY,
	TRASH_URL,
	UNCATEGORIZED_URL,
	viewValues,
} from "../../../utils/constants";
import { getCategorySlugFromRouter } from "../../../utils/url";

// we are disabling this rule as option might get complicated , so we need to have it in a separate file
import Option from "./option";

type ListBoxDropTypes = ListProps<object> & {
	// bookmarksColumns: string | number[] | string[] | undefined;
	bookmarksColumns: number[];
	bookmarksList: SingleListData[];
	cardTypeCondition: unknown;
	getItems?: (keys: Set<Key>) => DragItem[];
	isPublicPage?: boolean;
	onBulkBookmarkDelete: onBulkBookmarkDeleteType;
	onCategoryChange: (bookmark_ids: number[], category_id: number) => void;
	// onReorder: (event: DroppableCollectionReorderEvent) => unknown;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	onItemDrop?: (event: any) => void;
};

const ListBox = (props: ListBoxDropTypes) => {
	const {
		getItems,
		bookmarksColumns,
		cardTypeCondition,
		bookmarksList,
		onCategoryChange,
		onBulkBookmarkDelete,
		isPublicPage,
	} = props;
	const setIsCardDragging = useMiscellaneousStore(
		(store) => store.setIsCardDragging,
	);
	const queryClient = useQueryClient();
	const session = useSupabaseSession((storeState) => storeState.session);

	const categoryData = queryClient.getQueryData([
		CATEGORIES_KEY,
		session?.user?.id,
	]) as {
		data: CategoriesData[];
		error: PostgrestError;
	};

	const router = useRouter();
	// cat_id reffers to cat slug here as its got from url
	const categorySlug = getCategorySlugFromRouter(router);

	// Setup listbox as normal. See the useListBox docs for more details.
	const preview = useRef(null);
	const state = useListState(props);
	const ref = useRef(null);
	const { listBoxProps } = useListBox(
		{
			...props,
			// Prevent dragging from changing selection.
			shouldSelectOnPressUp: true,
			autoFocus: false,
		},
		state,
		ref,
	);

	useEffect(() => {
		state.selectionManager.clearSelection();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [router.asPath]);

	// Setup drag state for the collection.
	const dragState = useDraggableCollectionState({
		// Pass through events from props.
		...props,

		// Collection and selection manager come from list state.
		collection: state.collection,
		selectionManager: state.selectionManager,
		onDragStart() {
			setIsCardDragging(true);
		},
		onDragEnd() {
			setIsCardDragging(false);
			state.selectionManager.clearSelection();
		},
		preview,
		// Provide data for each dragged item. This function could
		// also be provided by the user of the component.
		getItems:
			getItems ??
			((keys) =>
				[...keys].map((key) => {
					const item = state.collection.getItem(key);

					return {
						"text/plain": !isNull(item) ? item.textValue : "",
					};
				})),
	});

	useDraggableCollection(props, dragState, ref);

	const cardGridClassNames = classNames({
		"grid gap-6": true,
		"grid-cols-5":
			typeof bookmarksColumns === "object" &&
			!isNull(bookmarksColumns) &&
			bookmarksColumns[0] === 10,
		"grid-cols-4":
			typeof bookmarksColumns === "object" && bookmarksColumns[0] === 20,
		"grid-cols-3":
			typeof bookmarksColumns === "object" && bookmarksColumns[0] === 30,
		"grid-cols-2":
			typeof bookmarksColumns === "object" && bookmarksColumns[0] === 40,
		"grid-cols-1":
			typeof bookmarksColumns === "object" && bookmarksColumns[0] === 50,
	});

	const { isMobile, isTablet } = useIsMobileView();
	const moodboardColsLogic = () => {
		if (isTablet || isMobile) {
			return "2";
		} else {
			switch (bookmarksColumns && bookmarksColumns[0] / 10) {
				case 1:
					return "5";
				case 2:
					return "4";
				case 3:
					return "3";
				case 4:
					return "2";
				case 5:
					return "1";
				default:
					return "1";
					break;
			}
		}
	};

	const ulClassName = classNames("outline-none focus:outline-none", {
		// [`columns-${moodboardColsLogic()} gap-6`]:
		// 	cardTypeCondition === "moodboard",
		block:
			cardTypeCondition === viewValues.list ||
			cardTypeCondition === viewValues.headlines,
		[isMobile || isTablet ? "grid gap-6 grid-cols-2" : cardGridClassNames]:
			cardTypeCondition === "card",
		"max-w-[600px] mx-auto space-y-4":
			cardTypeCondition === viewValues.timeline,
	});

	const isTrashPage = categorySlug === TRASH_URL;

	const renderOption = () => {
		const bookmarks = [...state.collection].map((item) => {
			const bookmarkData = find(
				bookmarksList,
				(listItem) => listItem?.id === Number.parseInt(item.key as string, 10),
			);

			return {
				item,
				bookmarkData,
			};
		});

		// Update renderedBookmarks in the store with the current list of bookmarks
		// const validBookmarks = bookmarks
		// 	.filter((b) => b.bookmarkData)
		// 	.map((b) => b.bookmarkData) as SingleListData[];

		// Update the store with the current bookmarks for this category
		// setRenderedBookmarks(currentCategoryId, validBookmarks);

		return bookmarks.map(({ item, bookmarkData }) => (
			<Option
				cardTypeCondition={cardTypeCondition}
				dragState={dragState}
				isPublicPage={isPublicPage}
				item={item}
				key={item.key}
				state={state}
				type={bookmarkData?.type ?? ""}
				url={bookmarkData?.url ?? ""}
			/>
		));
	};

	const categoryDataMapper =
		categoryData?.data?.map((item) => ({
			label: item?.category_name,
			value: item?.id,
		})) || [];

	let finalCategoryData;

	if (categorySlug !== UNCATEGORIZED_URL) {
		// is user is in uncategorized page then the bottom bar should not have the uncategorized option
		finalCategoryData = [
			{ label: "Uncategorized", value: 0 },
			...categoryDataMapper,
		];
	} else {
		finalCategoryData = [...categoryDataMapper];
	}

	return (
		<>
			{/* <PreviewLightBox id={0} open={open} setOpen={setOpen} /> */}
			<ul {...listBoxProps} className={ulClassName} ref={ref}>
				{cardTypeCondition === viewValues.moodboard ? (
					<Masonry
						breakpointCols={Number.parseInt(moodboardColsLogic(), 10)}
						className="my-masonry-grid"
						columnClassName="my-masonry-grid_column"
					>
						{renderOption()}
					</Masonry>
				) : (
					renderOption()
				)}
				<DragPreview ref={preview}>
					{(items) => (
						<div className="rounded-lg bg-slate-200 px-2 py-1 text-sm leading-4">
							{items.length > 1
								? `${items.length} bookmarks`
								: find(
										bookmarksList,
										(item) =>
											item?.id === Number.parseInt(items[0]["text/plain"], 10),
								  )?.title}
						</div>
					)}
				</DragPreview>
			</ul>
			{state.selectionManager.selectedKeys.size > 0 && (
				<div className="fixed  bottom-12 left-[40%] flex w-[596px] items-center justify-between rounded-[14px] bg-white px-[11px] py-[9px] shadow-custom-6 xl:left-[50%] xl:-translate-x-1/2 md:hidden">
					<div className="flex items-center gap-1">
						<Checkbox
							checked={
								Array.from(state.selectionManager.selectedKeys.keys())?.length >
								0
							}
							label={`${Array.from(state.selectionManager.selectedKeys.keys())
								?.length}
            bookmarks`}
							onChange={() => state.selectionManager.clearSelection()}
							showPlaceholder
							value="selected-bookmarks"
						/>
						{/* <Button
							className="p-1 text-13 font-450 leading-[15px] text-gray-light-12"
							onClick={() => state.selectionManager.selectAll()}
						>
							Select all
						</Button> */}
					</div>
					<div className="flex items-center">
						<div
							className=" mr-[13px] cursor-pointer text-13 font-450 leading-[15px] text-gray-light-12 "
							onClick={() => {
								onBulkBookmarkDelete(
									Array.from(
										state.selectionManager.selectedKeys.keys(),
									) as number[],
									true,
									Boolean(isTrashPage),
								);
								state.selectionManager.clearSelection();
							}}
							onKeyDown={() => {}}
							role="button"
							tabIndex={0}
						>
							{isTrashPage ? "Delete Forever" : "Delete"}
						</div>
						{isTrashPage && (
							<div
								className="mr-[13px] cursor-pointer text-13 font-450 leading-[15px] text-gray-light-12 "
								onClick={() => {
									onBulkBookmarkDelete(
										Array.from(
											state.selectionManager.selectedKeys.keys(),
										) as number[],
										false,
										false,
									);
									state.selectionManager.clearSelection();
								}}
								onKeyDown={() => {}}
								role="button"
								tabIndex={0}
							>
								Recover
							</div>
						)}
						{!isEmpty(categoryData?.data) && !isTrashPage && (
							<AriaDropdown
								menuButton={
									<div className="flex items-center rounded-lg bg-custom-gray-6 px-2 py-[5px] text-13 font-450 leading-4 text-gray-light-12 ">
										<figure className="mr-[6px]">
											<MoveIcon />
										</figure>
										<p>Move to</p>
									</div>
								}
								menuClassName={dropdownMenuClassName}
							>
								{finalCategoryData?.map((dropdownItem) => (
									<AriaDropdownMenu
										key={dropdownItem?.value}
										onClick={() => {
											state.selectionManager.clearSelection();
											onCategoryChange(
												Array.from(
													state.selectionManager.selectedKeys.keys(),
												) as number[],
												dropdownItem?.value,
											);
										}}
									>
										<div
											className={`w-full truncate ${dropdownMenuItemClassName}`}
										>
											{dropdownItem?.label}
										</div>
									</AriaDropdownMenu>
								))}
							</AriaDropdown>
						)}
					</div>
				</div>
			)}
		</>
	);
};

export default ListBox;
