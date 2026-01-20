import { useCallback, useEffect, useRef, type Key } from "react";
import { useRouter } from "next/router";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
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
import {
	useDraggableCollectionState,
	useListState,
	type ListProps,
} from "react-stately";

import {
	AriaDropdown,
	AriaDropdownMenu,
} from "../../../components/ariaDropdown";
import useGetViewValue from "../../../hooks/useGetViewValue";
import { useIsMobileView } from "../../../hooks/useIsMobileView";
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
	viewValues,
} from "../../../utils/constants";
import { getColumnCount } from "../../../utils/helpers";
import { getCategorySlugFromRouter } from "../../../utils/url";
import { handleBulkBookmarkDelete } from "../handleBookmarkDelete";

import { CardViewVirtualized } from "./cardViewVirtualized";
import Option from "./option";
import useDeleteBookmarksOptimisticMutation from "@/async/mutationHooks/bookmarks/useDeleteBookmarksOptimisticMutation";
import useMoveBookmarkToTrashOptimisticMutation from "@/async/mutationHooks/bookmarks/useMoveBookmarkToTrashOptimisticMutation";
import { useAddCategoryToBookmarksOptimisticMutation } from "@/async/mutationHooks/category/use-add-category-to-bookmarks-optimistic-mutation";
import useSearchBookmarks from "@/async/queryHooks/bookmarks/useSearchBookmarks";
import { ClearTrashDropdown } from "@/components/clearTrashDropdown";
import { Checkbox } from "@/components/ui/recollect/checkbox";
import { mutationApiCall } from "@/utils/apiHelpers";
import { errorToast } from "@/utils/toastMessages";

type ListBoxDropTypes = ListProps<object> & {
	bookmarksColumns: number[];
	bookmarksList: SingleListData[];
	cardTypeCondition: unknown;
	flattendPaginationBookmarkData?: SingleListData[];
	getItems?: (keys: Set<Key>) => DragItem[];
	isPublicPage?: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	onItemDrop?: (event: any) => void;
};

const ListBox = (props: ListBoxDropTypes) => {
	const {
		getItems,
		bookmarksColumns,
		cardTypeCondition,
		bookmarksList,
		flattendPaginationBookmarkData = [],
		isPublicPage,
	} = props;

	const { addCategoryToBookmarksOptimisticMutation } =
		useAddCategoryToBookmarksOptimisticMutation();

	const deleteBookmarkId = useMiscellaneousStore(
		(state) => state.deleteBookmarkId,
	);
	const setDeleteBookmarkId = useMiscellaneousStore(
		(state) => state.setDeleteBookmarkId,
	);

	const setIsCardDragging = useMiscellaneousStore(
		(store) => store.setIsCardDragging,
	);

	const queryClient = useQueryClient();
	const session = useSupabaseSession((storeState) => storeState.session);
	const searchText = useMiscellaneousStore((state) => state.searchText);

	// Hooks for data fetching
	const { flattenedSearchData } = useSearchBookmarks();
	const { moveBookmarkToTrashOptimisticMutation } =
		useMoveBookmarkToTrashOptimisticMutation();
	const { deleteBookmarkOptismicMutation } =
		useDeleteBookmarksOptimisticMutation();
	// Determine if we're currently searching
	const isSearching = !isEmpty(searchText);

	const categoryData = queryClient.getQueryData([
		CATEGORIES_KEY,
		session?.user?.id,
	]) as {
		data: CategoriesData[];
		error: PostgrestError;
	};
	const { isMobile, isTablet } = useIsMobileView();

	// this ref is for react-aria listbox
	const ariaRef = useRef<HTMLUListElement | null>(null);

	// Helper function to get scroll element
	const getScrollElement = () => {
		if (typeof document === "undefined") {
			return null;
		}

		const element = document.querySelector("#scrollableDiv");

		if (!element) {
			return document.documentElement;
		}

		return element as HTMLElement;
	};

	// ---- Virtualizer Setup ----
	const rowVirtualizer = useVirtualizer({
		measureElement: (element) => element.getBoundingClientRect().height,
		count: bookmarksList.length,
		getScrollElement,
		estimateSize: () => {
			// Default heights if not grid-based
			if (cardTypeCondition === viewValues.list) {
				return 250;
			}

			// Figure out lanes
			let lanes = 1;
			if (
				cardTypeCondition === viewValues.card ||
				cardTypeCondition === viewValues.moodboard
			) {
				lanes = getColumnCount(!isMobile && !isTablet, bookmarksColumns[0]);
			}

			// Get container width (fallback to 1200 if unknown)
			const containerWidth =
				typeof document !== "undefined"
					? (document.querySelector("#scrollableDiv")?.clientWidth ?? 1_200)
					: 1_200;

			// Each card width
			const cardWidth = containerWidth / lanes;

			// Estimate height based on aspect ratio (e.g., 4:3)
			const aspectRatio = 4 / 3;
			return cardWidth * aspectRatio;
		},
		overscan: 5,
		lanes: (() => {
			if (
				cardTypeCondition !== viewValues.card &&
				cardTypeCondition !== viewValues.moodboard
			) {
				return 1;
			}

			return getColumnCount(!isMobile && !isTablet, bookmarksColumns[0]);
		})(),
	});
	const bookmarksInfoValue = useGetViewValue("cardContentViewArray", []);

	useEffect(() => {
		rowVirtualizer.scrollToIndex(0);
	}, [rowVirtualizer, cardTypeCondition, bookmarksInfoValue]);

	const router = useRouter();
	// cat_id refers to cat slug here as its got from url
	const categorySlug = getCategorySlugFromRouter(router);
	// Setup listbox as normal. See the useListBox docs for more details.
	const preview = useRef(null);
	const state = useListState(props);

	// hook up aria listbox
	const { listBoxProps } = useListBox(
		{
			...props,
			// Prevent dragging from changing selection.
			shouldSelectOnPressUp: true,
			autoFocus: false,
		},
		state,
		ariaRef,
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

	// IMPORTANT: ariaRef is passed here so listeners attach properly
	useDraggableCollection(props, dragState, ariaRef);

	const ulClassName = classNames("outline-hidden focus:outline-hidden", {
		block: cardTypeCondition === viewValues.list,
		"max-w-[600px] mx-auto space-y-4":
			cardTypeCondition === viewValues.timeline,
	});

	const isTrashPage = categorySlug === TRASH_URL;

	// Bulk delete handler
	const onBulkBookmarkDelete = useCallback(
		(bookmarkIds: Key[], deleteForever: boolean, isTrash: boolean) => {
			handleBulkBookmarkDelete({
				bookmarkIds: bookmarkIds.map(Number),
				deleteForever,
				isTrash,
				isSearching,
				flattenedSearchData,
				flattendPaginationBookmarkData,
				deleteBookmarkId,
				setDeleteBookmarkId,
				sessionUserId: session?.user?.id,
				moveBookmarkToTrashOptimisticMutation,
				deleteBookmarkOptismicMutation,
				clearSelection: () => state.selectionManager.clearSelection(),
				mutationApiCall,
				errorToast,
			});
		},
		[
			deleteBookmarkId,
			deleteBookmarkOptismicMutation,
			flattendPaginationBookmarkData,
			flattenedSearchData,
			isSearching,
			moveBookmarkToTrashOptimisticMutation,
			session?.user?.id,
			setDeleteBookmarkId,
			state,
		],
	);

	const renderOption = (virtualIndex: number) => {
		const item = [...state.collection][virtualIndex];

		if (!item) {
			return null;
		}

		const bookmarkData = bookmarksList[virtualIndex];
		return (
			<Option
				cardTypeCondition={cardTypeCondition}
				dragState={dragState}
				isPublicPage={isPublicPage}
				isTrashPage={isTrashPage}
				item={item}
				key={item.key}
				state={state}
				type={bookmarkData?.type ?? ""}
				url={bookmarkData?.url ?? ""}
			/>
		);
	};

	const categoryDataMapper =
		categoryData?.data?.map((item) => ({
			label: item?.category_name,
			value: item?.id,
		})) || [];

	return (
		<>
			<ul {...listBoxProps} className={ulClassName} ref={ariaRef}>
				{cardTypeCondition === viewValues.moodboard ? (
					<div
						style={{
							height: rowVirtualizer?.getTotalSize(),
							width: "100%",
							position: "relative",
						}}
					>
						{rowVirtualizer?.getVirtualItems()?.map((virtualRow) => {
							const lanes = rowVirtualizer?.options?.lanes || 1;
							const columnWidth = 100 / lanes;
							return (
								<div
									data-index={virtualRow?.index}
									key={virtualRow?.key?.toString()}
									ref={rowVirtualizer?.measureElement}
									style={{
										position: "absolute",
										top: 0,
										left: `${virtualRow?.lane * columnWidth}%`,
										width: `${columnWidth}%`,
										transform: `translateY(${virtualRow?.start}px)`,
										paddingLeft: "0.75rem",
										paddingRight: "0.75rem",
										paddingBottom: "1.5rem",
									}}
								>
									{renderOption(virtualRow?.index)}
								</div>
							);
						})}
					</div>
				) : (
					<div
						style={
							cardTypeCondition === viewValues.card
								? { position: "relative" }
								: {
										height: rowVirtualizer?.getTotalSize(),
										position: "relative",
									}
						}
					>
						{cardTypeCondition === viewValues.card ? (
							<CardViewVirtualized
								bookmarksList={bookmarksList}
								bookmarksColumns={bookmarksColumns}
								renderOption={renderOption}
								getScrollElement={getScrollElement}
							/>
						) : (
							rowVirtualizer?.getVirtualItems()?.map((virtualRow) => {
								const rowIndex = Math.floor(virtualRow.index / 1);
								const rowStart =
									rowVirtualizer
										.getVirtualItems()
										.find((vItem) => Math.floor(vItem.index / 1) === rowIndex)
										?.start ?? 0;

								return (
									<div
										data-index={virtualRow.index}
										key={virtualRow.key.toString()}
										ref={rowVirtualizer.measureElement}
										style={{
											position: "absolute",
											top: 0,
											left: 0,
											width: "100%",
											transform: `translateY(${rowStart}px)`,
											paddingBottom:
												cardTypeCondition === viewValues.timeline
													? "24px"
													: "0px",
											paddingLeft: "0px",
											paddingRight: "0px",
										}}
									>
										{renderOption(virtualRow.index)}
									</div>
								);
							})
						)}
					</div>
				)}
				<DragPreview ref={preview}>
					{(items) => (
						<div className="rounded-lg bg-slate-200 px-2 py-1 text-sm leading-4 dark:bg-gray-alpha-100">
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
				<div className="fixed bottom-12 left-[40%] flex w-[596px] items-center justify-between rounded-[14px] bg-gray-50 px-[11px] py-[9px] shadow-custom-6 max-xl:left-1/2 max-xl:-translate-x-1/2 max-md:hidden">
					<div className="flex items-center gap-1">
						<label className="group relative flex cursor-pointer items-center justify-center gap-2">
							<Checkbox
								checked={
									Array.from(state.selectionManager.selectedKeys.keys())
										?.length > 0
								}
								onCheckedChange={() => state.selectionManager.clearSelection()}
								className="flex size-4 items-center justify-center gap-3 rounded-[5px] text-[10px] leading-[21px] font-450 tracking-[1%] text-gray-900 data-checked:bg-plain-reverse data-checked:text-plain data-unchecked:bg-plain data-unchecked:text-plain-reverse"
							/>

							{`${
								Array.from(state.selectionManager.selectedKeys.keys())?.length
							} bookmarks`}
						</label>

						{/* <Button
							className="p-1 text-13 font-450 leading-[15px] text-gray-900"
							onClick={() => state.selectionManager.selectAll()}
						>
							Select all
						</Button> */}
					</div>
					<div className="flex items-center">
						{!isTrashPage ? (
							<div
								className="mr-[13px] cursor-pointer text-13 leading-[15px] font-450 text-gray-900"
								onClick={() => {
									onBulkBookmarkDelete(
										Array.from(state.selectionManager.selectedKeys.keys()),
										false,
										true,
									);
									state.selectionManager.clearSelection();
								}}
								onKeyDown={() => {}}
								role="button"
								tabIndex={0}
							>
								Delete
							</div>
						) : (
							<ClearTrashDropdown
								isBottomBar
								label="Delete Bookmarks"
								onClearTrash={() => {
									onBulkBookmarkDelete(
										Array.from(
											state.selectionManager.selectedKeys.keys(),
										) as number[],
										true,
										true,
									);
								}}
								isClearingTrash={
									Array.from(state.selectionManager.selectedKeys.keys()).some(
										(key) =>
											deleteBookmarkId?.includes(
												Number.parseInt(key.toString(), 10),
											),
									) ?? false
								}
							/>
						)}
						{isTrashPage && (
							<div
								className="mr-[13px] cursor-pointer text-13 leading-[15px] font-450 text-gray-900"
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
									<div className="flex items-center rounded-lg bg-gray-200 px-2 py-[5px] text-13 leading-4 font-450 text-gray-900">
										<figure className="mr-[6px] text-gray-1000">
											<MoveIcon />
										</figure>
										<p>Add to</p>
									</div>
								}
								menuClassName={dropdownMenuClassName}
							>
								{categoryDataMapper?.map((dropdownItem) => (
									<AriaDropdownMenu
										key={dropdownItem?.value}
										onClick={() => {
											const selectedIds = Array.from(
												state.selectionManager.selectedKeys.keys(),
											).map(Number);

											addCategoryToBookmarksOptimisticMutation.mutate(
												{
													bookmark_ids: selectedIds,
													category_id: dropdownItem?.value,
												},
												{
													onSuccess: () => {
														state.selectionManager.clearSelection();
													},
												},
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
