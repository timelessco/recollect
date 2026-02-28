"use client";

import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type KeyboardEvent,
} from "react";
import {
	MediaControlBar,
	MediaController,
	MediaMuteButton,
	MediaPlayButton,
	MediaTimeDisplay,
	MediaVolumeRange,
} from "media-chrome/react";
import { MediaProvider, useMediaRef } from "media-chrome/react/media-store";
import {
	MediaPlaybackRateMenu,
	MediaPlaybackRateMenuButton,
} from "media-chrome/react/menu";
import type WaveSurfer from "wavesurfer.js";

import { MuteIcon, PlayPauseIcon, SettingsIcon } from "./media-player-icons";
import { cn } from "@/utils/tailwind-merge";

import "./media-player-theme.css";

export interface AudioWaveformPlayerProps {
	isActive?: boolean;
	onError?: () => void;
	src: string;
	title?: string;
}

const SEEK_STEP_SECONDS = 5;

const WAVEFORM_PROGRESS_COLOR = "#FC541C";

function getWaveColor(): string {
	const isDark = document.documentElement.classList.contains("dark");

	// Figma: gray-500 (#999) at 40% opacity
	return isDark ? "rgba(153, 153, 153, 0.3)" : "rgba(153, 153, 153, 0.4)";
}

function useWaveformColors(): { progress: string; wave: string } {
	const [wave, setWave] = useState("rgba(153, 153, 153, 0.4)");

	useEffect(() => {
		setWave(getWaveColor());

		const root = document.documentElement;
		const observer = new MutationObserver(() => {
			setWave(getWaveColor());
		});
		observer.observe(root, { attributeFilter: ["class"] });

		return () => observer.disconnect();
	}, []);

	return { progress: WAVEFORM_PROGRESS_COLOR, wave };
}

function WaveformSkeleton() {
	return (
		<div className="flex h-12 flex-1 animate-pulse items-center rounded-lg bg-gray-200 dark:bg-gray-800" />
	);
}

function AudioWaveformPlayerInner({
	isActive,
	onError,
	src,
	title,
}: AudioWaveformPlayerProps) {
	const mediaRef = useMediaRef();
	const audioElRef = useRef<HTMLAudioElement | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const wsRef = useRef<WaveSurfer | null>(null);
	const onErrorRef = useRef(onError);
	onErrorRef.current = onError;

	const [isReady, setIsReady] = useState(false);
	const [duration, setDuration] = useState(0);
	const [currentTime, setCurrentTime] = useState(0);

	const colors = useWaveformColors();

	// Shared ref callback for the <audio> element: register with media-chrome + store locally
	const audioRef = useCallback(
		(el: HTMLAudioElement | null) => {
			audioElRef.current = el;
			mediaRef(el);
		},
		[mediaRef],
	);

	// Create wavesurfer instance once the audio element and container are mounted
	useEffect(() => {
		const container = containerRef.current;
		const audio = audioElRef.current;
		if (!container || !audio) {
			return undefined;
		}

		let destroyed = false;

		void (async () => {
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
					container,
					cursorWidth: 0,
					dragToSeek: { debounceTime: 0 },
					height: 48,
					media: audio,
					normalize: true,
					progressColor: WAVEFORM_PROGRESS_COLOR,
					waveColor: getWaveColor(),
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
		})();

		return () => {
			destroyed = true;
			if (wsRef.current) {
				wsRef.current.destroy();
				wsRef.current = null;
			}

			setIsReady(false);
		};
	}, []);

	// Update waveform colors dynamically for dark mode without recreating instance
	useEffect(() => {
		wsRef.current?.setOptions({
			progressColor: colors.progress,
			waveColor: colors.wave,
		});
	}, [colors.progress, colors.wave]);

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
	const handleWaveformKeyDown = useCallback(
		(event: KeyboardEvent<HTMLDivElement>) => {
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
		},
		[],
	);

	return (
		<MediaController
			audio
			autohide="-1"
			onPointerDown={(event) => event.stopPropagation()}
			className={cn(
				"flex max-h-none w-full max-w-[min(600px,90vw)] flex-col gap-1 overflow-visible rounded-2xl p-1",
				"[--media-background-color:var(--color-gray-100)] [--media-control-background:transparent] [--media-control-hover-background:var(--color-gray-alpha-100)] [--media-primary-color:var(--color-gray-900)]",
				"[--video-accent:var(--color-gray-900)] [--video-base:16px] [--video-buffered:var(--color-gray-alpha-200)] [--video-track-bg:var(--color-gray-alpha-200)] [--video-track-hover:var(--color-gray-alpha-300)]",
			)}
		>
			<audio ref={audioRef} slot="media" src={src}>
				<track default kind="captions" label="No captions" srcLang="en" />
			</audio>

			{/* Waveform card */}
			<div className="flex w-full items-center rounded-[12px] bg-gray-0 px-2 py-[37px]">
				{!isReady && <WaveformSkeleton />}
				<div
					ref={containerRef}
					aria-label="Audio progress"
					aria-valuemax={duration}
					aria-valuemin={0}
					aria-valuenow={currentTime}
					className={cn(
						"h-12 flex-1 cursor-pointer touch-none rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
						!isReady && "invisible absolute",
					)}
					onKeyDown={handleWaveformKeyDown}
					role="slider"
					tabIndex={0}
				/>
			</div>

			{/* Control bar: play + title | time | volume | settings */}
			<MediaControlBar className="flex w-full items-center gap-3 px-1 pt-[8.5px] pb-[4.5px]">
				<div className="flex min-w-0 flex-1 items-center gap-2">
					<MediaPlayButton ref={(el) => el?.setAttribute("notooltip", "")}>
						<PlayPauseIcon className="h-6 w-6 text-gray-700" />
					</MediaPlayButton>

					<span className="truncate text-[15px] leading-[1.15] font-normal tracking-[0.3px] text-gray-700">
						{title}
					</span>
				</div>

				<MediaTimeDisplay showDuration />

				<div className="mute-group flex">
					<div className="mute-group-inner relative size-6 shrink-0">
						<MediaMuteButton ref={(el) => el?.setAttribute("notooltip", "")}>
							<MuteIcon className="h-6 w-6 text-gray-700" />
						</MediaMuteButton>
						<div className="vol-wrap">
							<MediaVolumeRange />
						</div>
					</div>
				</div>

				<div className="settings-group flex">
					<MediaPlaybackRateMenuButton
						ref={(el) => el?.setAttribute("notooltip", "")}
					>
						<span
							className="flex size-full items-center justify-center"
							slot="icon"
						>
							<SettingsIcon className="h-6 w-6 text-gray-700" />
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
