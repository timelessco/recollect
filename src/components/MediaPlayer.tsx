"use client";

import {
	lazy,
	Suspense,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import {
	MediaControlBar,
	MediaController,
	MediaFullscreenButton,
	MediaMuteButton,
	MediaPipButton,
	MediaPlayButton,
	MediaPreviewChapterDisplay,
	MediaPreviewThumbnail,
	MediaPreviewTimeDisplay,
	MediaTimeDisplay,
	MediaTimeRange,
	MediaVolumeRange,
} from "media-chrome/react";
import { MediaProvider, useMediaRef } from "media-chrome/react/media-store";
import {
	MediaPlaybackRateMenu,
	MediaPlaybackRateMenuButton,
} from "media-chrome/react/menu";

import {
	FullscreenIcon,
	MuteIcon,
	PipIcon,
	PlayPauseIcon,
	SettingsIcon,
} from "./media-player-icons";
import { Spinner } from "./spinner";
import { SpotifyEmbed } from "./SpotifyEmbed";
import { cn } from "@/utils/tailwind-merge";

import "./media-player-theme.css";

const AudioWaveformPlayer = lazy(async () => {
	const mod = await import("./AudioWaveformPlayer");

	return { default: mod.AudioWaveformPlayer };
});

export type MediaType = "audio" | "spotify" | "video" | "youtube";

export interface MediaPlayerProps {
	isActive?: boolean;
	mediaType: MediaType;
	onError?: () => void;
	src: string;
	title?: string;
}

const VIDEO_CONTROLLER_CLASS =
	"max-h-[80vh] max-w-[1200px] rounded-2xl [--media-background-color:#000] [--media-control-background:transparent] [--media-control-hover-background:rgba(255,255,255,0.1)] [--media-primary-color:#fff]";

const YOUTUBE_CONTROLLER_CLASS = `${VIDEO_CONTROLLER_CLASS} aspect-video w-full`;

/* ---- Video / YouTube player (media-chrome) ---- */

interface VideoPlayerProps {
	isActive?: boolean;
	mediaType: "video" | "youtube";
	onError?: () => void;
	src: string;
}

function VideoPlayerInner({
	isActive,
	mediaType,
	onError,
	src,
}: VideoPlayerProps) {
	const mediaRef = useMediaRef();
	const mediaElRef = useRef<HTMLElement | null>(null);
	const onErrorRef = useRef(onError);
	onErrorRef.current = onError;
	const [loading, setLoading] = useState(true);
	const [youTubeReady, setYouTubeReady] = useState(false);

	useEffect(() => {
		if (mediaType !== "youtube") {
			return;
		}

		void (async () => {
			try {
				await import("youtube-video-element");
				setYouTubeReady(true);
			} catch {
				onErrorRef.current?.();
			}
		})();
	}, [mediaType]);

	useEffect(() => {
		const el = mediaElRef.current;
		if (!el || !("play" in el)) {
			return;
		}

		if (isActive) {
			void (el as HTMLMediaElement).play();
		} else {
			(el as HTMLMediaElement).pause();
		}
	}, [isActive]);

	const ref = useCallback(
		(el: HTMLElement | null) => {
			mediaElRef.current = el;
			mediaRef(el as HTMLMediaElement | null);

			if (!el) {
				return undefined;
			}

			const handleError = () => onErrorRef.current?.();
			const handleLoaded = () => setLoading(false);

			// Check if media is already loaded (event fired before listener attached)
			if ((el as HTMLMediaElement).readyState >= 2) {
				setLoading(false);
			}

			el.addEventListener("error", handleError);
			// youtube-video-element may not fire `loadeddata`; listen for
			// `loadedmetadata` as well so the spinner always clears.
			el.addEventListener("loadedmetadata", handleLoaded);
			el.addEventListener("loadeddata", handleLoaded);

			return () => {
				el.removeEventListener("error", handleError);
				el.removeEventListener("loadedmetadata", handleLoaded);
				el.removeEventListener("loadeddata", handleLoaded);
				mediaRef(null);
			};
		},
		[mediaRef],
	);

	let mediaElement: React.ReactNode = null;
	switch (mediaType) {
		case "youtube": {
			if (youTubeReady) {
				mediaElement = (
					<youtube-video crossOrigin="" ref={ref} slot="media" src={src} />
				);
			}

			break;
		}

		case "video": {
			mediaElement = (
				<video
					ref={ref}
					slot="media"
					src={src}
					className="h-auto max-h-[80vh] w-auto max-w-[min(1200px,90vw)]"
				>
					<track default kind="captions" label="No captions" srcLang="en" />
				</video>
			);
			break;
		}
	}

	return (
		<>
			{loading && (
				<div className="flex items-center justify-center py-16">
					<Spinner className="size-3" />
				</div>
			)}
			<MediaController
				breakpoints="pip:400 sm:384 md:576 lg:768 xl:960"
				onPointerDown={(event) => event.stopPropagation()}
				className={cn(
					mediaType === "youtube"
						? YOUTUBE_CONTROLLER_CLASS
						: VIDEO_CONTROLLER_CLASS,
					loading && "absolute opacity-0",
				)}
			>
				{mediaElement}

				<div className="video-gradient-bottom" />

				<MediaControlBar className="flex items-center gap-3 px-3 pt-[60px] pb-2">
					<MediaPlayButton ref={(el) => el?.setAttribute("notooltip", "")}>
						<PlayPauseIcon />
					</MediaPlayButton>

					<div className="mute-group flex">
						<div className="mute-group-inner relative size-10 shrink-0">
							<MediaMuteButton ref={(el) => el?.setAttribute("notooltip", "")}>
								<MuteIcon />
							</MediaMuteButton>
							<div className="vol-wrap">
								<MediaVolumeRange />
							</div>
						</div>
					</div>

					<MediaTimeDisplay />
					<MediaTimeDisplay showDuration />

					<MediaTimeRange>
						<MediaPreviewThumbnail slot="preview" />
						<MediaPreviewChapterDisplay slot="preview" />
						<MediaPreviewTimeDisplay slot="preview" />
					</MediaTimeRange>

					<div className="relative shrink-0">
						<MediaPlaybackRateMenuButton
							ref={(el) => el?.setAttribute("notooltip", "")}
						>
							<span className="flex items-center justify-center" slot="icon">
								<SettingsIcon />
							</span>
						</MediaPlaybackRateMenuButton>
						<div className="settings-menu-wrap">
							<MediaPlaybackRateMenu hidden />
						</div>
					</div>

					{mediaType === "video" && (
						<MediaPipButton ref={(el) => el?.setAttribute("notooltip", "")}>
							<PipIcon />
						</MediaPipButton>
					)}

					<MediaFullscreenButton
						ref={(el) => el?.setAttribute("notooltip", "")}
					>
						<FullscreenIcon />
					</MediaFullscreenButton>
				</MediaControlBar>
			</MediaController>
		</>
	);
}

export function MediaPlayer({
	isActive,
	mediaType,
	onError,
	src,
	title,
}: MediaPlayerProps) {
	if (mediaType === "audio") {
		return (
			<Suspense
				fallback={
					<div className="flex items-center justify-center py-16">
						<Spinner className="size-3" />
					</div>
				}
			>
				<AudioWaveformPlayer
					isActive={isActive}
					onError={onError}
					src={src}
					title={title}
				/>
			</Suspense>
		);
	}

	if (mediaType === "spotify") {
		return <SpotifyEmbed src={src} />;
	}

	return (
		<MediaProvider>
			<VideoPlayerInner
				isActive={isActive}
				mediaType={mediaType}
				onError={onError}
				src={src}
			/>
		</MediaProvider>
	);
}
