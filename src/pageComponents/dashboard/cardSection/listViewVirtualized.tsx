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
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						width: "100%",
						transform: `translateY(${rowStart}px)`,
						paddingBottom:
							cardTypeCondition === viewValues.timeline ? "24px" : "0px",
						paddingLeft: "0px",
						paddingRight: "0px",
					}}
				>
					{renderOption(virtualRow.index)}
				</div>
			);
		})}
	</>
);
