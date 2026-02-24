"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWavesurfer } from "@wavesurfer/react";

import { useSpotifySync } from "./use-spotify-sync";
import { cn } from "@/utils/tailwind-merge";

type AudioMediaType = "audio" | "spotify";

export interface AudioWaveformPlayerProps {
	isActive?: boolean;
	mediaType: AudioMediaType;
	onError?: () => void;
	src: string;
	title?: string;
}

function formatTime(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Deterministic pseudo-random using sine. Avoids bitwise operators.
 */
function deterministicRandom(seed: number, index: number): number {
	return Math.abs(Math.sin(seed * 9301 + index * 49_297) % 1);
}

function generateSpotifyPeaks(count: number): number[][] {
	const peaks: number[] = [];
	for (let idx = 0; idx < count; idx++) {
		const base = 0.25 + deterministicRandom(42, idx) * 0.5;
		const spike =
			deterministicRandom(77, idx) > 0.85
				? deterministicRandom(13, idx) * 0.3
				: 0;
		peaks.push(Math.min(1, base + spike));
	}

	return [peaks];
}

function useIsDark(): boolean {
	const [isDark, setIsDark] = useState(false);

	useEffect(() => {
		const root = document.documentElement;
		setIsDark(root.classList.contains("dark"));
		const observer = new MutationObserver(() => {
			setIsDark(root.classList.contains("dark"));
		});
		observer.observe(root, { attributeFilter: ["class"] });
		return () => observer.disconnect();
	}, []);

	return isDark;
}

const WAVE_COLORS = {
	dark: { progress: "#d1d1d1", wave: "#3d3d3d" },
	light: { progress: "#212121", wave: "#e0e0e0" },
} as const;

function WaveformSkeleton() {
	return (
		<div className="h-20 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
	);
}

function PlayIcon() {
	return (
		<svg fill="currentColor" height="20" viewBox="0 0 20 20" width="20">
			<path d="M6.5 3.5v13l10-6.5z" />
		</svg>
	);
}

function PauseIcon() {
	return (
		<svg fill="currentColor" height="20" viewBox="0 0 20 20" width="20">
			<rect height="12" rx="1" width="3" x="5.5" y="4" />
			<rect height="12" rx="1" width="3" x="11.5" y="4" />
		</svg>
	);
}

/* Same SVG paths as media-player-icons.tsx VolumeOnIcon / VolumeOffIcon */

function VolumeOnIcon() {
	return (
		<svg fill="currentColor" height="18" viewBox="0 0 24 24" width="18">
			<path d="M12.4719 3.11833C12.797 3.29235 13 3.63121 13 4V20C13 20.3688 12.797 20.7077 12.4719 20.8817C12.1467 21.0557 11.7522 21.0366 11.4453 20.8321L5.69722 17H3C1.89543 17 1 16.1046 1 15V9C1 7.89543 1.89543 7 3 7H5.69722L11.4453 3.16795C11.7522 2.96338 12.1467 2.94431 12.4719 3.11833Z" />
			<path d="M16.5963 7.40422C16.2057 7.0137 15.5726 7.0137 15.1821 7.40422C14.7915 7.79475 14.7915 8.42791 15.1821 8.81843C15.9975 9.63387 16.5001 10.7575 16.5001 12.0004C16.5001 13.2433 15.9975 14.367 15.1821 15.1824C14.7915 15.5729 14.7915 16.2061 15.1821 16.5966C15.5726 16.9871 16.2057 16.9871 16.5963 16.5966C17.7714 15.4214 18.5001 13.7951 18.5001 12.0004C18.5001 10.2058 17.7714 8.5794 16.5963 7.40422Z" />
		</svg>
	);
}

function VolumeOffIcon() {
	return (
		<svg fill="currentColor" height="18" viewBox="0 0 24 24" width="18">
			<path d="M20.7071 4.70711C21.0976 4.31658 21.0976 3.68342 20.7071 3.29289C20.3166 2.90237 19.6834 2.90237 19.2929 3.29289L17 5.58579V4C17 3.63121 16.797 3.29235 16.4719 3.11833C16.1467 2.94431 15.7522 2.96338 15.4453 3.16795L9.69722 7H7C5.89543 7 5 7.89543 5 9V15C5 15.7021 5.36182 16.3198 5.90917 16.6766L3.29289 19.2929C2.90237 19.6834 2.90237 20.3166 3.29289 20.7071C3.68342 21.0976 4.31658 21.0976 4.70711 20.7071L20.7071 4.70711Z" />
			<path d="M10.6246 17.6183L17 11.2429V20C17 20.3688 16.797 20.7077 16.4719 20.8817C16.1467 21.0557 15.7522 21.0366 15.4453 20.8321L10.6246 17.6183Z" />
		</svg>
	);
}

export function AudioWaveformPlayer({
	isActive,
	mediaType,
	onError,
	src,
	title,
}: AudioWaveformPlayerProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const onErrorRef = useRef(onError);

	useEffect(() => {
		onErrorRef.current = onError;
	}, [onError]);

	const isDark = useIsDark();
	const colors = isDark ? WAVE_COLORS.dark : WAVE_COLORS.light;
	const isSpotify = mediaType === "spotify";
	const spotifyPeaks = useMemo(() => generateSpotifyPeaks(200), []);

	const [volume, setVolume] = useState(1);
	const [muted, setMuted] = useState(false);
	const effectiveVolume = muted ? 0 : volume;

	const { currentTime, isPlaying, isReady, wavesurfer } = useWavesurfer({
		barGap: 2,
		barRadius: 2,
		barWidth: 3,
		container: containerRef,
		cursorWidth: 0,
		height: 80,
		normalize: true,
		progressColor: colors.progress,
		waveColor: colors.wave,
		...(isSpotify ? { duration: 30, peaks: spotifyPeaks } : { url: src }),
	});

	const {
		duration: spotifyDuration,
		playing: spotifyPlaying,
		setRef: spotifySetRef,
		spotifyReady,
		time: spotifyTime,
		togglePlayPause: spotifyTogglePlayPause,
	} = useSpotifySync({
		onError,
		src,
		wavesurfer: isSpotify ? wavesurfer : null,
	});

	useEffect(() => {
		if (!wavesurfer || isSpotify) {
			return undefined;
		}

		return wavesurfer.on("error", () => onErrorRef.current?.());
	}, [isSpotify, wavesurfer]);

	useEffect(() => {
		if (isSpotify || !wavesurfer) {
			return;
		}

		if (isActive) {
			void wavesurfer.play();
		} else {
			wavesurfer.pause();
		}
	}, [isActive, isSpotify, wavesurfer]);

	useEffect(() => {
		if (!wavesurfer || isSpotify) {
			return;
		}

		wavesurfer.setVolume(effectiveVolume);
	}, [effectiveVolume, isSpotify, wavesurfer]);

	const effectivePlaying = isSpotify ? spotifyPlaying : isPlaying;
	const effectiveTime = isSpotify ? spotifyTime : currentTime;
	const effectiveDuration = isSpotify
		? spotifyDuration
		: (wavesurfer?.getDuration() ?? 0);

	const handlePlayPause = () => {
		if (isSpotify) {
			spotifyTogglePlayPause();
		} else {
			void wavesurfer?.playPause();
		}
	};

	const handleMuteToggle = useCallback(() => {
		setMuted((prev) => !prev);
	}, []);

	const handleVolumeChange = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const newVol = Number.parseFloat(event.target.value);
			setVolume(newVol);
			if (newVol > 0) {
				setMuted(false);
			}
		},
		[],
	);

	useEffect(() => {
		if (!isSpotify || !wavesurfer || !spotifyDuration) {
			return;
		}

		wavesurfer.setOptions({ duration: spotifyDuration });
	}, [isSpotify, spotifyDuration, wavesurfer]);

	return (
		<div
			className={cn(
				"waveform-player w-full max-w-[min(600px,90vw)] rounded-2xl border",
				"border-gray-200 bg-gray-100",
				"dark:border-gray-800 dark:bg-gray-900",
			)}
			onPointerDown={(event) => event.stopPropagation()}
		>
			{isSpotify && spotifyReady && (
				<spotify-audio
					ref={spotifySetRef}
					src={src}
					style={{ display: "none" }}
				/>
			)}

			{/* Waveform area */}
			<div className="relative overflow-hidden rounded-t-2xl px-5 pt-5">
				{!isReady && <WaveformSkeleton />}
				<div
					ref={containerRef}
					className={cn(!isReady && "invisible")}
					style={{ height: 80 }}
				/>
			</div>

			{/* Controls */}
			<div className="flex items-center gap-2 px-5 pt-3 pb-4">
				<button
					aria-label={effectivePlaying ? "Pause" : "Play"}
					className={cn(
						"flex size-9 shrink-0 items-center justify-center rounded-full",
						"bg-gray-900 text-white transition-transform active:scale-92",
						"dark:bg-gray-100 dark:text-gray-900",
					)}
					onClick={handlePlayPause}
					type="button"
				>
					{effectivePlaying ? <PauseIcon /> : <PlayIcon />}
				</button>

				{/* Volume: mute button + vertical popup slider (mirrors video player) */}
				<div className="mute-group">
					<div className="mute-group-inner">
						<button
							aria-label={muted ? "Unmute" : "Mute"}
							className="mute-btn"
							onClick={handleMuteToggle}
							type="button"
						>
							{effectiveVolume === 0 ? <VolumeOffIcon /> : <VolumeOnIcon />}
						</button>
						<div className="vol-wrap">
							<div className="vol-track">
								<input
									aria-label="Volume"
									className="vol-range"
									max="1"
									min="0"
									onChange={handleVolumeChange}
									step="0.01"
									style={
										{
											"--vol-fill": `${effectiveVolume * 100}%`,
										} as React.CSSProperties
									}
									type="range"
									value={effectiveVolume}
								/>
							</div>
						</div>
					</div>
				</div>

				{/* Timestamps */}
				<div className="ml-auto text-xs text-gray-500 tabular-nums dark:text-gray-400">
					{formatTime(effectiveTime)}
					<span className="mx-0.5">/</span>
					{formatTime(effectiveDuration)}
				</div>
			</div>

			{title && (
				<div className="border-t border-gray-200 px-5 py-3 dark:border-gray-800">
					<p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
						{title}
					</p>
				</div>
			)}
		</div>
	);
}
