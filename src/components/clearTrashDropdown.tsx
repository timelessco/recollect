import { Popover } from "@/components/ui/recollect/popover";
import { TrashIconGray } from "@/icons/trash-icon-gray";

import { DestructiveConfirmContent } from "./destructive-confirm-content";

interface ClearTrashDropdownProps {
  isBottomBar?: boolean;
  isClearingTrash: boolean;
  isOpen?: boolean;
  label?: string;
  menuOpenToggle?: (isOpen: boolean) => void;
  onClearTrash: () => void;
}

export function ClearTrashDropdown(props: ClearTrashDropdownProps) {
  const {
    isBottomBar = false,
    isClearingTrash,
    isOpen,
    label,
    menuOpenToggle,
    onClearTrash,
  } = props;

  return (
    <Popover.Root
      onOpenChange={(nextOpen) => {
        menuOpenToggle?.(nextOpen);
      }}
      open={isOpen}
    >
      <Popover.Trigger
        className={
          isBottomBar
            ? "mr-[13px] cursor-pointer text-13 leading-[15px] font-450 text-gray-900"
            : "z-15 ml-2 rounded-lg bg-whites-700 p-[5px] backdrop-blur-xs group-hover:flex"
        }
      >
        {isBottomBar ? (
          "Delete Forever"
        ) : (
          <figure
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
          >
            <TrashIconGray
              className="size-4"
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
            />
          </figure>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner align="start">
          <Popover.Popup className={`${!isBottomBar ? "ml-2" : ""} w-[180px] leading-[20px]`}>
            <DestructiveConfirmContent
              label={label ?? "Clear All Trash"}
              onConfirm={onClearTrash}
              pending={isClearingTrash}
            />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
