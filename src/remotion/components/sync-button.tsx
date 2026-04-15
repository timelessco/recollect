import { Spinner } from "@/components/ui/recollect/spinner";
import { InstagramIcon } from "@/icons/social/instagram-icon";
import { XIcon } from "@/icons/social/x-icon";

import { CheckIcon } from "../icons/check-icon";

export type SyncStatus = "idle" | "hovering" | "syncing" | "done";

const syncBtn =
  "flex w-[158px] h-[30px] items-center gap-[7px] px-[10px] text-[13px] font-[420] leading-none text-[#B5B5B5] rounded-[11px] transition-all";

interface SyncButtonProps {
  count?: number;
  platform: "instagram" | "twitter";
  pressScale?: number;
  status: SyncStatus;
}

export function SyncButton({ platform, status, count, pressScale = 1 }: SyncButtonProps) {
  const PlatformIcon = platform === "instagram" ? InstagramIcon : XIcon;
  const label = platform === "instagram" ? "Sync Instagram" : "Sync Twitter";

  if (status === "done") {
    return (
      <div className={syncBtn}>
        <CheckIcon className="size-[18px] text-[#E9E9E9]" />
        <span>Synced {count ?? 0}</span>
      </div>
    );
  }

  if (status === "syncing") {
    return (
      <div className={syncBtn}>
        <Spinner className="h-[19px] w-[18px] shrink-0 text-[#E9E9E9]" />
        <span>Syncing {count ?? 0}</span>
      </div>
    );
  }

  if (status === "hovering") {
    return (
      <button
        className={`${syncBtn} bg-white/12`}
        style={{ transform: `scale(${pressScale})` }}
        type="button"
      >
        <span className="flex size-[18px] shrink-0 items-center justify-center">
          <PlatformIcon className="size-[18px] shrink-0 text-[#979797]" />
        </span>
        <span>{label}</span>
      </button>
    );
  }

  // status === "idle"
  return (
    <button className={syncBtn} type="button">
      <span className="flex size-[18px] shrink-0 items-center justify-center">
        <PlatformIcon className="size-[18px] shrink-0 text-[#979797]" />
      </span>
      <span>{label}</span>
    </button>
  );
}
