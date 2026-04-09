import { Button } from "@base-ui/react/button";

import { TrashIconGray } from "@/icons/trash-icon-gray";

import { Spinner } from "./spinner";

type PendingMode = "delete-all" | "keep-bookmarks" | null;

interface DeleteCollectionConfirmProps {
  count: number;
  onDeleteAll: () => void;
  onDeleteCollection: () => void;
  pendingMode: PendingMode;
}

export function DeleteCollectionConfirm({
  count,
  onDeleteAll,
  onDeleteCollection,
  pendingMode,
}: DeleteCollectionConfirmProps) {
  const isDisabled = pendingMode !== null;

  return (
    <>
      <p className="mb-2 px-2 py-1.5 text-[12px] leading-[135%] font-450 tracking-[0.24px] text-gray-600">
        Delete just the collection or delete all {count} {count === 1 ? "bookmark" : "bookmarks"}?
      </p>
      <Button
        className="flex w-full items-center justify-center rounded-lg bg-gray-alpha-100 px-4 py-[5.5px] text-13 leading-[115%] font-[450] tracking-[0.13px] whitespace-nowrap text-red-600 hover:bg-gray-alpha-200"
        disabled={isDisabled}
        onClick={onDeleteCollection}
      >
        {pendingMode === "keep-bookmarks" ? (
          <Spinner className="h-[15px] w-[15px]" />
        ) : (
          <>
            <TrashIconGray className="size-4" />
            <span className="ml-[6px] text-nowrap">Delete only collection</span>
          </>
        )}
      </Button>
      <Button
        className="mt-1 flex w-full items-center justify-center rounded-lg px-4 py-[5.5px] text-13 leading-[115%] font-[450] tracking-[0.13px] whitespace-nowrap text-red-600 hover:bg-gray-alpha-100"
        disabled={isDisabled}
        onClick={onDeleteAll}
      >
        {pendingMode === "delete-all" ? (
          <Spinner className="h-[15px] w-[15px]" />
        ) : (
          <>
            <TrashIconGray className="size-4" />
            <span className="ml-[6px]">Delete all bookmarks</span>
          </>
        )}
      </Button>
    </>
  );
}
