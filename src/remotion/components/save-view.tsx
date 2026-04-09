import { Spinner } from "@/components/ui/recollect/spinner";

import { CheckIcon } from "../icons/check-icon";
import { SparkleIcon } from "../icons/sparkle-icon";

export type SavePhase = "saving" | "success";

interface SaveViewProps {
  phase: SavePhase;
  progress: number;
}

export function SaveView({ phase, progress }: SaveViewProps) {
  const isSaved = phase === "success";

  return (
    <div className="mt-[-9px] flex flex-1 flex-col items-center justify-center gap-[7px]">
      <div
        className="flex items-center gap-[7px] text-[13px] leading-none font-[420] text-[#B5B5B5]"
        style={{ marginLeft: -8 }}
      >
        {isSaved ? (
          <CheckIcon className="size-[18px] text-[#E9E9E9]" />
        ) : (
          <Spinner className="h-[19px] w-[18px] shrink-0 text-[#E9E9E9]" />
        )}
        <span>{isSaved ? "Saved to Recollect" : "Saving to Recollect"}</span>
      </div>

      <div className="relative h-[30px] w-[158px] overflow-hidden rounded-[11px] bg-white/12">
        <div
          className="absolute inset-0 rounded-[11px] bg-white/12 transition-[width] duration-800 ease-out"
          style={{ width: `${progress}%` }}
        />
        <div className="relative z-[1] flex h-full items-center gap-[6px] px-[10px] text-[11px] leading-none font-normal text-white/50">
          <SparkleIcon className="size-[12px] text-[#D9D9D9]" />
          <span>Auto-organising</span>
        </div>
      </div>
    </div>
  );
}
