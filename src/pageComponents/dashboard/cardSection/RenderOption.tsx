/* eslint-disable react/no-unstable-nested-components */
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { VirtuosoMasonry } from "@virtuoso.dev/masonry";
import classNames from "classnames";
import { isEmpty } from "lodash";
import { type DraggableCollectionState, type ListState } from "react-stately";
import { Virtuoso, VirtuosoGrid } from "react-virtuoso";

import useFetchPaginatedBookmarks from "../../../async/queryHooks/bookmarks/useFetchPaginatedBookmarks";
import useSearchBookmarks from "../../../async/queryHooks/bookmarks/useSearchBookmarks";
import {
	useLoadersStore,
	useMiscellaneousStore,
} from "../../../store/componentStore";
import {
	type OptionDropItemTypes,
	type SingleListData,
} from "../../../types/apiTypes";
import { PAGINATION_LIMIT } from "../../../utils/constants";

import Option from "./option";

// Define types for the ItemContent component props
type ItemContentProps = {
	context: {
		cardTypeCondition: unknown;
		dragState: DraggableCollectionState;
		// For infinite scroll
		hasNextPage: boolean;
		isLoading: boolean;
		isPublicPage?: boolean;
		isTrashPage: boolean;
		loadMore: () => void;
		state: ListState<object>;
		totalItems: number;
	};
	data: {
		bookmarkData: {
			type: string;
			url: string;
		} | null;
		item: OptionDropItemTypes;
	};
	index: number;
};

const ItemContent = memo(
	({ data: bookmark, index, context }: ItemContentProps) => {
		const observer = useRef<IntersectionObserver | null>(null);
		const lastItemRef = useRef<HTMLDivElement>(null);
		const isLastItem = index === context.totalItems - 1;

		// Set up intersection observer for infinite scroll
		useEffect(() => {
			const currentElement = lastItemRef.current;
			const observerOptions = {
				root: null,
				rootMargin: "0px",
				threshold: 0.1,
			};

			const handleIntersect = (entries: IntersectionObserverEntry[]) => {
				const [entry] = entries;
				if (entry.isIntersecting && context.hasNextPage && !context.isLoading) {
					context.loadMore();
				}
			};

			// Clean up previous observer if it exists
			if (observer.current) {
				observer.current.disconnect();
			}

			// Create and start new observer
			const newObserver = new IntersectionObserver(
				handleIntersect,
				observerOptions,
			);

			if (currentElement) {
				newObserver.observe(currentElement);
			}

			observer.current = newObserver;

			// Cleanup function
			return () => {
				if (observer.current) {
					observer.current.disconnect();
				}
			};
		}, [
			isLastItem,
			context.hasNextPage,
			context.isLoading,
			context.loadMore,
			context,
		]);

		if (!bookmark?.bookmarkData) return null;

		return (
			<div ref={isLastItem ? lastItemRef : undefined}>
				<Option
					cardTypeCondition={context.cardTypeCondition}
					dragState={context.dragState}
					isPublicPage={context.isPublicPage}
					isTrashPage={context.isTrashPage}
					item={bookmark.item}
					state={context.state}
					type={bookmark.bookmarkData.type ?? ""}
					url={bookmark.bookmarkData.url ?? ""}
				/>
			</div>
		);
	},
);

export const RenderOption = ({
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
	const isSearchLoading = useLoadersStore((states) => states.isSearchLoading);

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

	// Create stable bookmarks array
	const bookmarks = useMemo(() => {
		const collectionItems = [...state.collection];
		const maxIndex = Math.max(collectionItems.length, bookmarksList.length);

		// Create array with proper length to maintain indices
		return Array.from({ length: maxIndex }, (_, virtualIndex) => {
			const item = collectionItems[virtualIndex];
			const bookmarkData = bookmarksList[virtualIndex];

			// Return object even if item or bookmarkData is missing - this maintains indexing
			return {
				item: item || null,
				bookmarkData: bookmarkData || null,
				virtualIndex,
			};
		});
	}, [state.collection, bookmarksList]);

	// Memoize column count
	const columnCount = useMemo(() => {
		const col = bookmarksColumns[0];
		return col === 10
			? 5
			: col === 20
			? 4
			: col === 30
			? 3
			: col === 40
			? 2
			: 1;
	}, [bookmarksColumns]);

	const masonryContext = useMemo(
		() => ({
			cardTypeCondition,
			dragState,
			isPublicPage,
			isTrashPage: isTrashPage ?? false,
			state,
			hasNextPage,
			isLoading,
			loadMore,
			totalItems: bookmarks.length,
		}),
		[
			cardTypeCondition,
			dragState,
			isPublicPage,
			isTrashPage,
			state,
			hasNextPage,
			isLoading,
			loadMore,
			bookmarks.length,
		],
	);

	if (isMasonry) {
		return (
			<div style={{ position: "relative" }}>
				<VirtuosoMasonry
					ItemContent={ItemContent}
					columnCount={columnCount}
					context={masonryContext}
					data={bookmarks}
					initialItemCount={26}
					style={{ height: "100vh" }}
				/>
				{!hasNextPage && !isSearchLoading ? (
					<div className="pb-6 text-center">Life happens, save it</div>
				) : null}
			</div>
		);
	}

	if (isCard) {
		return (
			<VirtuosoGrid
				components={{
					Footer: () =>
						!hasNextPage && !isSearchLoading ? (
							<div className="pb-6 text-center">Life happens, save it</div>
						) : null,
				}}
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
				style={{ height: "100vh" }}
				totalCount={bookmarks.length}
			/>
		);
	}

	return (
		<Virtuoso
			components={{
				Footer: () =>
					!hasNextPage ? (
						<div className="pb-6 text-center">Life happens, save it</div>
					) : null,
			}}
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
			style={{ height: "100vh" }}
			totalCount={bookmarks.length}
		/>
	);
};
