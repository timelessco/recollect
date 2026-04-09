import type { ReactNode } from "react";

import type { BookmarkStatus } from "./bookmark-card";
import type { SavePhase } from "./save-view";
import type { SyncStatus } from "./sync-button";

import { FileLinkIcon } from "../icons/file-link-icon";
import { RecollectLogoIcon } from "../icons/recollect-logo-icon";
import { BookmarkCard } from "./bookmark-card";
import { SaveView } from "./save-view";
import { SyncButton } from "./sync-button";

function interpolateLogoScale(morphProgress: number): number {
  // Scale from 0.5 → 1 as the box expands
  return 0.5 + morphProgress * 0.5;
}

interface MainViewProps {
  bookmarkStatus: BookmarkStatus;
  containerHeight?: number;
  instagramCount?: number;
  instagramPressScale?: number;
  instagramStatus: SyncStatus;
  /** 0 = save view, 1 = main view, between = crossfade with blur */
  morphProgress?: number;
  savePhase: SavePhase | null;
  saveProgress: number;
  twitterCount?: number;
  twitterPressScale?: number;
  twitterStatus: SyncStatus;
}

function IdleContent({
  bookmarkStatus,
  twitterStatus,
  twitterCount,
  twitterPressScale,
  instagramStatus,
  instagramCount,
  instagramPressScale,
  logoScale = 1,
}: {
  bookmarkStatus: BookmarkStatus;
  instagramCount?: number;
  instagramPressScale?: number;
  instagramStatus: SyncStatus;
  logoScale?: number;
  twitterCount?: number;
  twitterPressScale?: number;
  twitterStatus: SyncStatus;
}) {
  return (
    <>
      <RecollectLogoIcon
        className="h-[20px] w-[16px] text-[#F44119]"
        style={{ transform: `scale(${logoScale})` }}
      />
      <p
        className="text-center text-[14px] leading-[115%] font-[420] text-[#E9E9E9]"
        style={{ margin: 0 }}
      >
        Start collecting
        <br />
        everything.
      </p>
      <div className="mt-[6px] flex flex-col items-center gap-[8px]">
        <BookmarkCard status={bookmarkStatus} />
        <button
          className="flex h-[30px] w-[158px] items-center gap-[7px] rounded-[11px] bg-white/12 px-[10px] text-[13px] leading-none text-white/40 transition-all hover:bg-white/18 active:scale-95"
          type="button"
        >
          <FileLinkIcon className="size-[18px] shrink-0 text-[#B4B4B4]" />
          Drop a file/link
        </button>
        <div className="flex flex-col gap-[2px]">
          <SyncButton
            count={twitterCount}
            platform="twitter"
            pressScale={twitterPressScale}
            status={twitterStatus}
          />
          <SyncButton
            count={instagramCount}
            platform="instagram"
            pressScale={instagramPressScale}
            status={instagramStatus}
          />
        </div>
      </div>
    </>
  );
}

const DROP_SHADOW =
  "0 38px 15px rgba(0,0,0,0.04), 0 21px 13px rgba(0,0,0,0.13), 0 10px 10px rgba(0,0,0,0.23), 0 2px 5px rgba(0,0,0,0.26)";

const INSET_SHADOW =
  "inset 0 0.5px 0.5px rgba(255,255,255,0.23), inset 0 0 15px 2px rgba(255,255,255,0.15)";

interface RenderMainBodyProps extends Omit<MainViewProps, "containerHeight" | "morphProgress"> {
  containerHeight?: number;
  isMorphing: boolean;
  morphProgress?: number;
}

function renderMainBody(props: RenderMainBodyProps) {
  const {
    bookmarkStatus,
    instagramCount,
    instagramPressScale,
    instagramStatus,
    isMorphing,
    morphProgress,
    savePhase,
    saveProgress,
    twitterCount,
    twitterPressScale,
    twitterStatus,
  } = props;

  if (isMorphing && morphProgress !== undefined) {
    return (
      <>
        {/* Save view — blurring out */}
        <div
          className="absolute inset-0 flex flex-col items-center gap-[12px] px-[8px] pt-[20px] pb-[10px]"
          style={{
            opacity: 1 - morphProgress,
            filter: `blur(${morphProgress * 10}px)`,
          }}
        >
          <SaveView phase="success" progress={100} />
        </div>
        {/* Main view — blurring in */}
        <div
          className="absolute inset-0 flex flex-col items-center gap-[12px] px-[8px] pt-[20px] pb-[10px]"
          style={{
            opacity: morphProgress,
            filter: `blur(${(1 - morphProgress) * 10}px)`,
          }}
        >
          <IdleContent
            bookmarkStatus={bookmarkStatus}
            instagramCount={instagramCount}
            instagramStatus={instagramStatus}
            logoScale={interpolateLogoScale(morphProgress)}
            twitterCount={twitterCount}
            twitterStatus={twitterStatus}
          />
        </div>
      </>
    );
  }

  if (savePhase !== null) {
    return <SaveView phase={savePhase} progress={saveProgress} />;
  }

  return (
    <IdleContent
      bookmarkStatus={bookmarkStatus}
      instagramCount={instagramCount}
      instagramPressScale={instagramPressScale}
      instagramStatus={instagramStatus}
      twitterCount={twitterCount}
      twitterPressScale={twitterPressScale}
      twitterStatus={twitterStatus}
    />
  );
}

export function MainView({
  bookmarkStatus,
  savePhase,
  saveProgress,
  twitterStatus,
  twitterCount,
  twitterPressScale,
  instagramStatus,
  instagramCount,
  instagramPressScale,
  containerHeight,
  morphProgress,
}: MainViewProps) {
  const height = containerHeight ?? (savePhase !== null ? 76 : 250);
  const isMorphing = morphProgress !== undefined && morphProgress > 0 && morphProgress < 1;

  return (
    <div
      className="relative w-[174px] rounded-[16px] bg-[rgba(22,22,22,0.90)]"
      style={{ height, boxShadow: DROP_SHADOW }}
    >
      <div
        className="relative flex h-full flex-col items-center gap-[12px] overflow-hidden rounded-[16px] px-[8px] pt-[20px] pb-[10px]"
        style={{ boxShadow: INSET_SHADOW }}
      >
        {renderMainBody({
          bookmarkStatus,
          containerHeight,
          instagramCount,
          instagramPressScale,
          instagramStatus,
          isMorphing,
          morphProgress,
          savePhase,
          saveProgress,
          twitterCount,
          twitterPressScale,
          twitterStatus,
        })}
      </div>
    </div>
  );
}

interface PopupShellProps {
  children: ReactNode;
}

export function PopupShell({ children }: PopupShellProps) {
  return (
    <div
      className="rounded-[16px] backdrop-blur-[13.8px]"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {children}
    </div>
  );
}
