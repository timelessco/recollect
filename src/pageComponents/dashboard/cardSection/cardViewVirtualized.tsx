import { useVirtualizer } from "@tanstack/react-virtual";

import { useIsMobileView } from "../../../hooks/useIsMobileView";
import { type SingleListData } from "../../../types/apiTypes";
import { getColumnCount } from "../../../utils/helpers";

type CardViewVirtualizedProps = {
	bookmarksList: SingleListData[];
	bookmarksColumns: number[];
	renderOption: (index: number) => React.ReactNode;
	getScrollElement: () => HTMLElement | null;
};

export const CardViewVirtualized = ({
	bookmarksList,
	bookmarksColumns,
	renderOption,
	getScrollElement,
}: CardViewVirtualizedProps) => {
	const { isMobile, isTablet } = useIsMobileView();

	// Calculate lanes using the helper function
	const lanes = getColumnCount(!isMobile && !isTablet, bookmarksColumns[0]);

	// Calculate total rows
	const totalRows = Math.ceil(bookmarksList.length / lanes);

	// Row virtualizer
	const rowVirtualizer = useVirtualizer({
		count: totalRows,
		getScrollElement,
		estimateSize: () => {
			const containerWidth =
				typeof document !== "undefined"
					? (document.querySelector("#scrollableDiv")?.clientWidth ?? 1_200)
					: 1_200;

			const cardWidth = containerWidth / lanes;

			const aspectRatio = 4 / 3;
			const cardHeight = cardWidth * aspectRatio;

			return cardHeight + 43;
		},
		overscan: 5,
		measureElement: (element) => element.getBoundingClientRect().height,
	});

	return (
		<div
			style={{
				height: rowVirtualizer.getTotalSize(),
				position: "relative",
			}}
		>
			{rowVirtualizer.getVirtualItems().map((virtualRow) => {
				const rowIndex = virtualRow.index;
				const startIndex = rowIndex * lanes;
				const endIndex = Math.min(startIndex + lanes, bookmarksList.length);
				const rowItems = bookmarksList.slice(startIndex, endIndex);
				const columnWidth = 100 / lanes;

				return (
					<div
						key={virtualRow.key}
						data-index={rowIndex}
						className="pb-[43px]"
						ref={rowVirtualizer.measureElement}
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							width: "100%",
							transform: `translateY(${virtualRow.start}px)`,
							display: "flex",
						}}
					>
						{rowItems.map((bookmark, itemIndex) => {
							const bookmarkIndex = startIndex + itemIndex;

							return (
								<div
									key={bookmark.id}
									style={{
										width: `${columnWidth}%`,
										paddingLeft: "0.75rem",
										paddingRight: "0.75rem",
									}}
								>
									{renderOption(bookmarkIndex)}
								</div>
							);
						})}
					</div>
				);
			})}
		</div>
	);
};
