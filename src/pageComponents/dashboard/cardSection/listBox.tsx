/* eslint-disable react/no-unstable-nested-components */
import { type onBulkBookmarkDeleteType } from ".";
import { useCallback, useEffect, useMemo, useRef, type Key } from "react";
import { useRouter } from "next/router";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { VirtuosoMasonry } from "@virtuoso.dev/masonry";
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
import InfiniteScroll from "react-infinite-scroll-component";
import {
	useDraggableCollectionState,
	useListState,
	type DraggableCollectionState,
	type ListProps,
	type ListState,
} from "react-stately";
import { Virtuoso, VirtuosoGrid } from "react-virtuoso";

import useFetchPaginatedBookmarks from "../../../async/queryHooks/bookmarks/useFetchPaginatedBookmarks";
import useSearchBookmarks from "../../../async/queryHooks/bookmarks/useSearchBookmarks";
import {
	AriaDropdown,
	AriaDropdownMenu,
} from "../../../components/ariaDropdown";
import Checkbox from "../../../components/checkbox";
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
	PAGINATION_LIMIT,
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

	const ulClassName = classNames("outline-none focus:outline-none", {
		// [`columns-${moodboardColsLogic()} gap-6`]:
		// 	cardTypeCondition === "moodboard",
		block:
			cardTypeCondition === viewValues.list ||
			cardTypeCondition === viewValues.headlines,

		"max-w-[600px] mx-auto space-y-4":
			cardTypeCondition === viewValues.timeline,
	});

	const isTrashPage = categorySlug === TRASH_URL;

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
			<ul {...listBoxProps} className={ulClassName} ref={ref}>
				<RenderOption
					bookmarksColumns={bookmarksColumns}
					bookmarksList={bookmarksList}
					cardTypeCondition={cardTypeCondition}
					dragState={dragState}
					isCard={cardTypeCondition === viewValues.card}
					isMasonry={cardTypeCondition === viewValues.moodboard}
					isPublicPage={isPublicPage}
					isTrashPage={isTrashPage}
					state={state}
				/>
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
							BookmarkHoverCheckbox
							checked={
								Array.from(state.selectionManager.selectedKeys.keys())?.length >
								0
							}
							label={`${Array.from(state.selectionManager.selectedKeys.keys())
								?.length}
            bookmarks`}
							onChange={() => state.selectionManager.clearSelection()}
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

const RenderOption = ({
	state,
	bookmarksList,
	bookmarksColumns,
	cardTypeCondition,
	dragState,
	isCard,
	isMasonry,
	isPublicPage,
	isTrashPage,
}: {
	bookmarksColumns: number[];
	bookmarksList: SingleListData[];
	cardTypeCondition: unknown;
	dragState: DraggableCollectionState;
	isCard: boolean;
	isMasonry?: boolean;
	isPublicPage?: boolean;
	isTrashPage?: boolean;
	state: ListState<object>;
}) => {
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

	const searchText = useMiscellaneousStore((states) => states.searchText);
	const {
		fetchNextPage: fetchNextSearchPage,
		hasNextPage: hasNextSearchPage = false,
		isFetchingNextPage: isFetchingNextSearchPage,
	} = useSearchBookmarks();

	const {
		allBookmarksData,
		fetchNextPage: fetchNextBookmarkPage,
		isFetchingNextPage: isFetchingNextBookmarkPage,
	} = useFetchPaginatedBookmarks();

	const isSearching = !isEmpty(searchText);
	const isLoading = isSearching
		? isFetchingNextSearchPage
		: isFetchingNextBookmarkPage;

	const hasMoreBookmarks = useMemo(() => {
		if (isSearching) return false;

		if (!allBookmarksData?.pages?.length) return true;

		const lastPage = allBookmarksData.pages[allBookmarksData.pages.length - 1];
		if (!lastPage?.data || lastPage.data.length === 0) return false;
		return lastPage.data.length >= PAGINATION_LIMIT;
	}, [allBookmarksData?.pages, isSearching]);

	const hasNextPage = isSearching ? hasNextSearchPage : hasMoreBookmarks;

	const loadMore = useCallback(() => {
		if (isLoading || !hasNextPage) return;

		if (isSearching) {
			void fetchNextSearchPage();
		} else {
			void fetchNextBookmarkPage();
		}
	}, [
		isLoading,
		hasNextPage,
		isSearching,
		fetchNextSearchPage,
		fetchNextBookmarkPage,
	]);

	// Create a stable key that changes when bookmarks change
	const masonryKey = useMemo(
		() => `masonry-${bookmarks.length}-${isSearching ? "search" : "bookmarks"}`,
		[bookmarks.length, isSearching],
	);
	const infiniteScrollRef = useRef<HTMLDivElement>(null);
	if (isMasonry) {
		return (
			<div
				className=""
				id="scrollableDiv-masonry"
				ref={infiniteScrollRef}
				style={{ height: "100vh", overflow: "auto" }}
			>
				<InfiniteScroll
					dataLength={bookmarks.length}
					endMessage={
						bookmarks.length > 0 && (
							<p className="pb-6 text-center text-sm text-gray-500">
								{isSearching
									? "No more search results"
									: "You've reached the end of your bookmarks"}
							</p>
						)
					}
					hasMore={isSearching ? hasNextSearchPage : hasMoreBookmarks}
					loader={
						isLoading && <p className="py-4 text-center">Loading more...</p>
					}
					next={loadMore}
					scrollableTarget="scrollableDiv-masonry"
					style={{ overflow: "unset" }}
				>
					<VirtuosoMasonry
						ItemContent={(index) => {
							const bookmark = bookmarks[index.index];
							if (!bookmark?.bookmarkData) return null;

							return (
								<Option
									cardTypeCondition={cardTypeCondition}
									dragState={dragState}
									isPublicPage={isPublicPage}
									isTrashPage={isTrashPage ?? false}
									item={bookmark.item}
									state={state}
									type={bookmark.bookmarkData.type ?? ""}
									url={bookmark.bookmarkData.url ?? ""}
								/>
							);
						}}
						columnCount={
							bookmarksColumns[0] === 10
								? 5
								: bookmarksColumns[0] === 20
								? 4
								: bookmarksColumns[0] === 30
								? 3
								: bookmarksColumns[0] === 40
								? 2
								: 1
						}
						data={bookmarks}
						initialItemCount={26}
						key={masonryKey}
						target="scrollableDiv-masonry"
					/>
				</InfiniteScroll>
			</div>
		);
	}

	if (isCard) {
		return (
			<VirtuosoGrid
				data={bookmarks}
				endReached={() => {
					if (isSearching) {
						void fetchNextSearchPage();
					} else {
						void fetchNextBookmarkPage();
					}
				}}
				itemContent={(_, bookmark) => (
					<Option
						cardTypeCondition={cardTypeCondition}
						dragState={dragState}
						isPublicPage={isPublicPage}
						isTrashPage={isTrashPage ?? false}
						item={bookmark.item}
						state={state}
						type={bookmark.bookmarkData?.type ?? ""}
						url={bookmark.bookmarkData?.url ?? ""}
					/>
				)}
				listClassName={classNames("grid gap-6 auto-rows-min", {
					"grid-cols-5": bookmarksColumns[0] === 10,
					"grid-cols-4": bookmarksColumns[0] === 20,
					"grid-cols-3": bookmarksColumns[0] === 30,
					"grid-cols-2": bookmarksColumns[0] === 40,
					"grid-cols-1": bookmarksColumns[0] === 50,
				})}
				overscan={200}
				style={{ height: "100vh", overflow: "auto" }}
				totalCount={bookmarks.length}
			/>
		);
	}

	// ✅ List view
	return (
		<Virtuoso
			data={bookmarks}
			endReached={() => {
				if (isSearching) {
					void fetchNextSearchPage();
				} else {
					void fetchNextBookmarkPage();
				}
			}}
			itemContent={(_, bookmark) => (
				<Option
					cardTypeCondition={cardTypeCondition}
					dragState={dragState}
					isPublicPage={isPublicPage}
					isTrashPage={isTrashPage ?? false}
					item={bookmark.item}
					state={state}
					type={bookmark.bookmarkData?.type ?? ""}
					url={bookmark.bookmarkData?.url ?? ""}
				/>
			)}
			overscan={200}
			style={{ height: "100vh", overflow: "auto" }}
		/>
	);
};
