import { type onBulkBookmarkDeleteType } from ".";
import { useEffect, useRef, type Key } from "react";
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
	bookmarksColumns: number[];
	bookmarksList: SingleListData[];
	cardTypeCondition: unknown;
	getItems?: (keys: Set<Key>) => DragItem[];
	isPublicPage?: boolean;
	onBulkBookmarkDelete: onBulkBookmarkDeleteType;
	onCategoryChange: (bookmark_ids: number[], category_id: number) => void;
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
	const { isMobile, isTablet } = useIsMobileView();

	// this ref is for scrolling + virtualization
	const parentRef = useRef<HTMLUListElement | null>(null);
	// this ref is for react-aria listbox
	const ariaRef = useRef<HTMLUListElement | null>(null);

	// ---- Virtualizer Setup ----
	const rowVirtualizer = useVirtualizer({
		measureElement: (element, _entry, instance) => {
			const direction = instance.scrollDirection;
			if (direction === "forward" || direction === null) {
				// Allow a fresh measurement when scrolling down (or initial)
				return element.getBoundingClientRect().height;
			} else {
				// eslint-disable-next-line unicorn/prefer-dom-node-dataset
				const indexKey = Number(element.getAttribute("data-index"));
				const cached = instance.measurementsCache[indexKey]?.size;
				return cached ?? element.getBoundingClientRect().height;
			}
		},
		count: bookmarksList.length,
		getScrollElement: () =>
			typeof document !== "undefined"
				? document.querySelector("#scrollableDiv")
				: null,
		estimateSize: () => {
			// Default heights if not grid-based
			if (cardTypeCondition === viewValues.list) return 250;

			// Figure out lanes
			let lanes = 1;
			if (
				cardTypeCondition === viewValues.card ||
				cardTypeCondition === viewValues.moodboard
			) {
				if (isMobile || isTablet) {
					lanes = 2;
				} else {
					switch (bookmarksColumns?.[0]) {
						case 10:
							lanes = 5;
							break;
						case 20:
							lanes = 4;
							break;
						case 30:
							lanes = 3;
							break;
						case 40:
							lanes = 2;
							break;
						case 50:
							lanes = 1;
							break;
						default:
							lanes = 1;
					}
				}
			}

			// Get container width (fallback to 1200 if unknown)
			const containerWidth =
				typeof document !== "undefined"
					? document.querySelector("#scrollableDiv")?.clientWidth ?? 1_200
					: 1_200;

			// Each card width
			const cardWidth = containerWidth / lanes;

			// Estimate height based on aspect ratio (e.g., 4:3)
			const aspectRatio = 4 / 3;
			return cardWidth * aspectRatio;
		},
		overscan: 1,
		lanes: (() => {
			if (
				cardTypeCondition !== viewValues.card &&
				cardTypeCondition !== viewValues.moodboard
			)
				return 1;
			if (isMobile || isTablet) return 2;

			switch (bookmarksColumns?.[0]) {
				case 10:
					return 5;
				case 20:
					return 4;
				case 30:
					return 3;
				case 40:
					return 2;
				case 50:
					return 1;
				default:
					return 1;
			}
		})(),
	});

	const router = useRouter();
	// cat_id reffers to cat slug here as its got from url
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

	const ulClassName = classNames("outline-none focus:outline-none", {
		block: cardTypeCondition === viewValues.list,
		"max-w-[600px] mx-auto space-y-4":
			cardTypeCondition === viewValues.timeline,
	});

	const isTrashPage = categorySlug === TRASH_URL;
	const renderOption = (virtualIndex: number) => {
		const item = [...state.collection][virtualIndex];

		if (!item) return null;

		const bookmarkData = bookmarksList[virtualIndex];
		return (
			<Option
				cardTypeCondition={cardTypeCondition}
				dragState={dragState}
				isPublicPage={isPublicPage}
				isTrashPage={isTrashPage}
				item={item}
				key={bookmarkData.id}
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

	let finalCategoryData;

	if (categorySlug !== UNCATEGORIZED_URL) {
		finalCategoryData = [
			{ label: "Uncategorized", value: 0 },
			...categoryDataMapper,
		];
	} else {
		finalCategoryData = [...categoryDataMapper];
	}

	return (
		<>
			<ul
				{...listBoxProps}
				className={ulClassName}
				ref={(element) => {
					parentRef.current = element;
					ariaRef.current = element;
				}}
			>
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
						style={{
							height: rowVirtualizer?.getTotalSize(),
							position: "relative",
						}}
					>
						{rowVirtualizer?.getVirtualItems()?.map((virtualRow) => {
							const isCardView = cardTypeCondition === viewValues.card;
							const lanes = rowVirtualizer?.options?.lanes || 1;
							const columnIndex = isCardView ? virtualRow.index % lanes : 0;
							const columnWidth = isCardView ? 100 / lanes : 100;
							// Calculate row index and get the row's top position
							const rowIndex = Math.floor(virtualRow.index / lanes);
							const rowStart =
								rowVirtualizer
									.getVirtualItems()
									.find((vItem) => Math.floor(vItem.index / lanes) === rowIndex)
									?.start ?? 0;

							const translateX = isCardView ? columnWidth * columnIndex : 0;
							const itemWidth = isCardView ? `${columnWidth}%` : "100%";

							return (
								<div
									data-index={virtualRow.index}
									key={bookmarksList[virtualRow.index].id}
									ref={(element) => {
										if (element) rowVirtualizer.measureElement(element);
									}}
									style={{
										position: "absolute",
										top: 0,
										left: `${translateX}%`,
										width: itemWidth,
										transform: `translateY(${rowStart}px)`,
										paddingBottom:
											cardTypeCondition === viewValues.timeline
												? "24px"
												: cardTypeCondition === viewValues.card
												? "42px"
												: "0px",

										paddingLeft: isCardView ? "0.75rem" : "0px",
										paddingRight: isCardView ? "0.75rem" : "0px",
									}}
								>
									{renderOption(virtualRow.index)}
								</div>
							);
						})}
					</div>
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
				<div className="fixed bottom-12 left-[40%] flex w-[596px] items-center justify-between rounded-[14px] bg-white px-[11px] py-[9px] shadow-custom-6 xl:left-[50%] xl:-translate-x-1/2 md:hidden">
					<div className="flex items-center gap-1">
						<Checkbox
							BookmarkHoverCheckbox
							checked={
								Array.from(state.selectionManager.selectedKeys.keys())?.length >
								0
							}
							label={`${Array.from(state.selectionManager.selectedKeys.keys())
								?.length} bookmarks`}
							onChange={() => state.selectionManager.clearSelection()}
							value="selected-bookmarks"
						/>
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
