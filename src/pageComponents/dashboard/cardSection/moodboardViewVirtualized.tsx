import { type Virtualizer } from "@tanstack/react-virtual";

type MoodboardViewVirtualizedProps = {
	rowVirtualizer: Virtualizer<HTMLElement, Element>;
	renderOption: (index: number) => React.ReactNode;
};

export const MoodboardViewVirtualized = ({
	rowVirtualizer,
	renderOption,
}: MoodboardViewVirtualizedProps) => (
	<div
		style={{
			height: rowVirtualizer?.getTotalSize(),
			width: "100%",
			position: "relative",
		}}
	>
		{rowVirtualizer.getVirtualItems().map((virtualRow) => {
			const lanes = rowVirtualizer.options.lanes;
			const columnWidth = 100 / lanes;

			return (
				<div
					data-index={virtualRow.index}
					key={virtualRow.key.toString()}
					ref={rowVirtualizer.measureElement}
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
);
