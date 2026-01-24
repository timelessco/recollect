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
		className="relative w-full"
		style={{
			height: rowVirtualizer?.getTotalSize(),
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
					className="absolute top-0 pr-3 pb-6 pl-3"
					style={{
						left: `${virtualRow?.lane * columnWidth}%`,
						width: `${columnWidth}%`,
						transform: `translateY(${virtualRow?.start}px)`,
					}}
				>
					{renderOption(virtualRow?.index)}
				</div>
			);
		})}
	</div>
);
