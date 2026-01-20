import { type Virtualizer } from "@tanstack/react-virtual";

import { viewValues } from "../../../utils/constants";

type SingleRowViewVirtualizedProps = {
	rowVirtualizer: Virtualizer<HTMLElement, Element>;
	cardTypeCondition: unknown;
	renderOption: (index: number) => React.ReactNode;
};

export const SingleRowViewVirtualized = ({
	rowVirtualizer,
	cardTypeCondition,
	renderOption,
}: SingleRowViewVirtualizedProps) => (
	<>
		{rowVirtualizer.getVirtualItems().map((virtualRow) => {
			const rowIndex = Math.floor(virtualRow.index / 1);
			const rowStart =
				rowVirtualizer
					.getVirtualItems()
					.find((vItem) => Math.floor(vItem.index / 1) === rowIndex)?.start ??
				0;

			return (
				<div
					data-index={virtualRow.index}
					key={virtualRow.key.toString()}
					ref={rowVirtualizer.measureElement}
					className={`absolute top-0 left-0 w-full pr-0 pl-0 ${cardTypeCondition === viewValues.timeline ? "pb-6" : "pb-0"}`}
					style={{
						transform: `translateY(${rowStart}px)`,
					}}
				>
					{renderOption(virtualRow.index)}
				</div>
			);
		})}
	</>
);
