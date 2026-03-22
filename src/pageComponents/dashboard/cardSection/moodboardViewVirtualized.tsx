import type { Virtualizer } from "@tanstack/react-virtual";

interface MoodboardViewVirtualizedProps {
  renderOption: (index: number) => React.ReactNode;
  rowVirtualizer: Virtualizer<HTMLElement, Element>;
}

export const MoodboardViewVirtualized = ({
  renderOption,
  rowVirtualizer,
}: MoodboardViewVirtualizedProps) => (
  <div
    className="relative w-full"
    style={{
      height: rowVirtualizer?.getTotalSize(),
    }}
  >
    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
      const { lanes } = rowVirtualizer.options;
      const columnWidth = 100 / lanes;

      return (
        <div
          className="absolute top-0 pr-3 pb-6 pl-3"
          data-index={virtualRow.index}
          key={virtualRow.key.toString()}
          ref={rowVirtualizer.measureElement}
          style={{
            left: `${virtualRow?.lane * columnWidth}%`,
            transform: `translateY(${virtualRow?.start}px)`,
            width: `${columnWidth}%`,
          }}
        >
          {renderOption(virtualRow?.index)}
        </div>
      );
    })}
  </div>
);
