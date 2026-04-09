import { Spinner } from "@/components/ui/recollect/spinner";

import { PlusIcon } from "../icons/plus-icon";

export type BookmarkStatus = "checking" | "not-saved" | "saving" | "saved";

interface BookmarkCardProps {
  status: BookmarkStatus;
}

export function BookmarkCard({ status }: BookmarkCardProps) {
  if (status === "checking") {
    return <div className="h-[30px] w-[158px] animate-pulse rounded-[11px] bg-white/8" />;
  }

  if (status === "saving") {
    return (
      <div className="flex h-[30px] w-[158px] items-center justify-center gap-[7px] rounded-[11px] bg-white/12 px-[10px] text-[13px] leading-none text-white/40">
        <Spinner className="h-[19px] w-[18px] shrink-0 text-[#E9E9E9]" />
        Saving...
      </div>
    );
  }

  return (
    <button
      className="flex h-[30px] w-[158px] items-center gap-[7px] rounded-[11px] bg-white/12 px-[10px] text-[13px] leading-none text-white/40 transition-colors hover:bg-white/18 active:scale-95"
      type="button"
    >
      <PlusIcon className="size-[18px] shrink-0 text-[#B4B4B4]" />
      {status === "saved" ? "Saved" : "Add current URL"}
    </button>
  );
}
