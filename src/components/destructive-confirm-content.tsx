import type { ReactNode } from "react";

import { Button } from "@base-ui/react/button";

import { TrashIconGray } from "@/icons/trash-icon-gray";

import { Spinner } from "./spinner";

interface DestructiveConfirmContentProps {
  description?: string;
  icon?: ReactNode;
  iconSecondary?: ReactNode;
  label: string;
  labelSecondary?: string;
  onConfirm: () => void;
  onConfirmSecondary?: () => void;
  pending?: boolean;
  pendingSecondary?: boolean;
}

export function DestructiveConfirmContent({
  description,
  icon = <TrashIconGray className="size-4" />,
  iconSecondary = <TrashIconGray className="size-4" />,
  label,
  labelSecondary,
  onConfirm,
  onConfirmSecondary,
  pending = false,
  pendingSecondary = false,
}: DestructiveConfirmContentProps) {
  return (
    <>
      <p className="py-[6px] text-center text-[12px] leading-[115%] tracking-[0.02em] text-gray-600">
        Sure you want to delete?
      </p>
      {description && (
        <p className="pb-1 text-center text-[11px] leading-[115%] tracking-[0.02em] text-gray-500">
          {description}
        </p>
      )}
      <Button
        className="flex w-full items-center justify-center rounded-lg bg-gray-alpha-100 px-2 py-[5.5px] text-13 leading-[115%] font-medium tracking-[0.01em] text-red-600 hover:bg-gray-alpha-200 hover:text-red-600"
        disabled={pending || pendingSecondary}
        onClick={onConfirm}
      >
        {pending ? (
          <Spinner className="h-[15px] w-[15px]" />
        ) : (
          <>
            {icon}
            <span className="ml-[6px] text-red-600 hover:text-red-600">{label}</span>
          </>
        )}
      </Button>
      {onConfirmSecondary && labelSecondary && (
        <Button
          className="mt-1 flex w-full items-center justify-center rounded-lg bg-gray-alpha-100 px-2 py-[5.5px] text-13 leading-[115%] font-medium tracking-[0.01em] text-gray-600 hover:bg-gray-alpha-200 hover:text-gray-700"
          disabled={pending || pendingSecondary}
          onClick={onConfirmSecondary}
        >
          {pendingSecondary ? (
            <Spinner className="h-[15px] w-[15px]" />
          ) : (
            <>
              {iconSecondary}
              <span className="ml-[6px]">{labelSecondary}</span>
            </>
          )}
        </Button>
      )}
    </>
  );
}
