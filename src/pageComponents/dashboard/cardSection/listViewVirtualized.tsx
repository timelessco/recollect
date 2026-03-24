import type { Virtualizer } from "@tanstack/react-virtual";

import { cn } from "@/utils/tailwind-merge";

import { viewValues } from "../../../utils/constants";

interface SingleRowViewVirtualizedProps {
  cardTypeCondition: unknown;
  renderOption: (index: number) => React.ReactNode;
  rowVirtualizer: Virtualizer<HTMLElement, Element>;
}

export const SingleRowViewVirtualized = ({
  cardTypeCondition,
  renderOption,
  rowVirtualizer,
}: SingleRowViewVirtualizedProps) => (
  <>
    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
      const rowIndex = Math.floor(virtualRow.index / 1);
      const rowStart =
        rowVirtualizer.getVirtualItems().find((vItem) => Math.floor(vItem.index / 1) === rowIndex)
          ?.start ?? 0;

      return (
        <div
          className={cn(
            "absolute top-0 left-0 w-full pr-0 pl-0",
            cardTypeCondition === viewValues.timeline ? "pb-6" : "pb-0",
          )}
          data-index={virtualRow.index}
          key={virtualRow.key.toString()}
          ref={rowVirtualizer.measureElement}
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
