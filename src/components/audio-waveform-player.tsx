"use client";

import "./media-player-theme.css";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import {
  MediaControlBar,
  MediaController,
  MediaMuteButton,
  MediaPlayButton,
  MediaTimeDisplay,
  MediaVolumeRange,
} from "media-chrome/react";
import { MediaProvider, useMediaRef } from "media-chrome/react/media-store";
import { MediaPlaybackRateMenu, MediaPlaybackRateMenuButton } from "media-chrome/react/menu";

import type WaveSurfer from "wavesurfer.js";

import { cn } from "@/utils/tailwind-merge";

import { MuteIcon, PlayPauseIcon, SettingsIcon } from "./media-player-icons";

export interface AudioWaveformPlayerProps {
  isActive?: boolean;
  onError?: () => void;
  src: string;
  title?: string;
}

const SEEK_STEP_SECONDS = 5;

const WAVEFORM_PROGRESS_COLOR = "#FC541C";
const WAVEFORM_WAVE_COLOR = "#999";

function WaveformSkeleton() {
  return (
    <div className="flex h-12 flex-1 animate-pulse items-center rounded-lg bg-gray-100 dark:bg-gray-800" />
  );
}

function AudioWaveformPlayerInner({ isActive, onError, src, title }: AudioWaveformPlayerProps) {
  const mediaRef = useMediaRef();
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<null | WaveSurfer>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const [isReady, setIsReady] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Shared ref callback for the <audio> element: register with media-chrome + store locally
  const audioRef = useCallback(
    (el: HTMLAudioElement | null) => {
      audioElRef.current = el;
      mediaRef(el);
    },
    [mediaRef],
  );

  // Create wavesurfer instance once the audio element and container are mounted
  /* oxlint-disable consistent-return */
  useEffect(() => {
    const container = containerRef.current;
    const audio = audioElRef.current;
    if (!container || !audio) {
      return;
    }

    let destroyed = false;

    async function initWaveSurfer(el: HTMLDivElement, media: HTMLAudioElement) {
      try {
        const WaveSurferModule = await import("wavesurfer.js");
        const WS = WaveSurferModule.default;

        if (destroyed) {
          return;
        }

        const ws = WS.create({
          barGap: 2,
          barRadius: 28,
          barWidth: 2,
          container: el,
          cursorWidth: 0,
          dragToSeek: { debounceTime: 0 },
          height: 48,
          media,
          normalize: true,
          progressColor: WAVEFORM_PROGRESS_COLOR,
          waveColor: WAVEFORM_WAVE_COLOR,
        });

        wsRef.current = ws;

        ws.on("ready", (dur) => {
          setIsReady(true);
          setDuration(dur);
        });

        ws.on("timeupdate", (time) => {
          setCurrentTime(time);
        });

        ws.on("error", () => {
          onErrorRef.current?.();
        });
      } catch {
        onErrorRef.current?.();
      }
    }

    void initWaveSurfer(container, audio);

    return () => {
      destroyed = true;
      if (wsRef.current) {
        wsRef.current.destroy();
        wsRef.current = null;
      }

      setIsReady(false);
    };
  }, []);

  // Auto-play/pause based on slide visibility
  useEffect(() => {
    const audio = audioElRef.current;
    if (!audio) {
      return;
    }

    if (isActive) {
      void audio.play();
    } else {
      audio.pause();
    }
  }, [isActive]);

  // Keyboard seek on waveform container
  const handleWaveformKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    const ws = wsRef.current;
    if (!ws) {
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      ws.skip(SEEK_STEP_SECONDS);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      ws.skip(-SEEK_STEP_SECONDS);
    }
  }, []);

  return (
    <MediaController
      audio
      autohide="-1"
      className={cn(
        "flex max-h-none w-full max-w-[min(600px,90vw)] flex-col overflow-visible rounded-2xl bg-gray-75 p-1",
        "[--media-background-color:transparent] [--media-control-background:transparent] [--media-control-hover-background:var(--color-gray-alpha-100)] [--media-primary-color:var(--color-gray-900)]",
        "[--video-accent:var(--color-gray-900)] [--video-base:16px] [--video-buffered:var(--color-gray-alpha-200)] [--video-track-bg:var(--color-gray-alpha-200)] [--video-track-hover:var(--color-gray-alpha-300)]",
      )}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
    >
      <audio ref={audioRef} slot="media" src={src}>
        <track default kind="captions" label="No captions" srcLang="en" />
      </audio>

      {/* Waveform card */}
      <div className="flex w-full items-center rounded-[12px] bg-gray-50 px-2 py-[37px]">
        {!isReady && <WaveformSkeleton />}
        <div
          aria-label="Audio progress"
          aria-valuemax={duration}
          aria-valuemin={0}
          aria-valuenow={currentTime}
          className={cn(
            "h-12 flex-1 cursor-pointer touch-none rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
            !isReady && "invisible absolute",
          )}
          onKeyDown={handleWaveformKeyDown}
          ref={containerRef}
          role="slider"
          tabIndex={isReady ? 0 : -1}
        />
      </div>

      {/* Control bar: play + title | time | volume | settings */}
      <MediaControlBar className="flex w-full items-center gap-3 px-1 pt-[8.5px] pb-[4.5px]">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <MediaPlayButton ref={(el) => el?.setAttribute("notooltip", "")}>
            <PlayPauseIcon className="text-gray-700" />
          </MediaPlayButton>

          <span className="truncate text-[clamp(12px,3vw,15px)] leading-[1.15] font-normal tracking-[0.3px] text-gray-700">
            {title}
          </span>
        </div>

        <MediaTimeDisplay showDuration />

        <div className="mute-group flex">
          <div className="mute-group-inner relative shrink-0">
            <MediaMuteButton ref={(el) => el?.setAttribute("notooltip", "")}>
              <MuteIcon className="text-gray-700" />
            </MediaMuteButton>
            <div className="vol-wrap">
              <MediaVolumeRange />
            </div>
          </div>
        </div>

        <div className="relative shrink-0">
          <MediaPlaybackRateMenuButton ref={(el) => el?.setAttribute("notooltip", "")}>
            <span className="flex items-center justify-center" slot="icon">
              <SettingsIcon className="text-gray-700" />
            </span>
          </MediaPlaybackRateMenuButton>
          <div className="settings-menu-wrap">
            <MediaPlaybackRateMenu hidden />
          </div>
        </div>
      </MediaControlBar>
    </MediaController>
  );
}

export function AudioWaveformPlayer(props: AudioWaveformPlayerProps) {
  return (
    <MediaProvider>
      <AudioWaveformPlayerInner {...props} />
    </MediaProvider>
  );
}
