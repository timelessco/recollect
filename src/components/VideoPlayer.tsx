"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

import { Spinner } from "./spinner";
import {
	FullscreenIcon,
	MuteIcon,
	PipIcon,
	PlayPauseIcon,
	SettingsIcon,
} from "./video-player-icons";
import {
	CONTROL_BAR_STYLE,
	CONTROLLER_STYLE,
	MEDIA_STYLE,
	YOUTUBE_CONTROLLER_STYLE,
} from "./video-player-theme";

import "./video-player-theme.css";

export interface VideoPlayerProps {
	isActive?: boolean;
	isYouTube?: boolean;
	onError?: () => void;
	src: string;
}

/* ---- Main player ---- */

function VideoPlayerInner({
	isActive,
	isYouTube,
	onError,
	src,
}: VideoPlayerProps) {
	const mediaRef = useMediaRef();
	const mediaElRef = useRef<HTMLVideoElement | null>(null);
	const onErrorRef = useRef(onError);
	onErrorRef.current = onError;
	const [loading, setLoading] = useState(true);
	const [youTubeReady, setYouTubeReady] = useState(false);

	useEffect(() => {
		if (!isYouTube) {
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
	}, [isYouTube]);

	useEffect(() => {
		const el = mediaElRef.current;
		if (!el) {
			return;
		}

		if (isActive) {
			void el.play();
		} else {
			el.pause();
		}
	}, [isActive]);

	const ref = useCallback(
		(el: HTMLVideoElement | null) => {
			mediaElRef.current = el;
			mediaRef(el);

			if (!el) {
				return undefined;
			}

			const handleError = () => onErrorRef.current?.();
			const handleLoaded = () => setLoading(false);
			el.addEventListener("error", handleError);
			el.addEventListener("loadeddata", handleLoaded);
			return () => {
				el.removeEventListener("error", handleError);
				el.removeEventListener("loadeddata", handleLoaded);
				mediaRef(null);
			};
		},
		[mediaRef],
	);

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
				style={{
					...(isYouTube ? YOUTUBE_CONTROLLER_STYLE : CONTROLLER_STYLE),
					...(loading ? { position: "absolute", opacity: 0 } : undefined),
				}}
			>
				{isYouTube ? (
					youTubeReady && (
						<youtube-video crossOrigin="" ref={ref} slot="media" src={src} />
					)
				) : (
					<video ref={ref} slot="media" src={src} style={MEDIA_STYLE}>
						<track default kind="captions" label="No captions" srcLang="en" />
					</video>
				)}

				<div className="video-gradient-bottom" />

				<MediaControlBar style={CONTROL_BAR_STYLE}>
					<MediaPlayButton>
						<PlayPauseIcon />
					</MediaPlayButton>

					<div className="mute-group">
						<div className="mute-group-inner">
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

					<div className="settings-group">
						<div className="settings-group-inner">
							<MediaPlaybackRateMenuButton>
								<span
									className="flex size-full items-center justify-center"
									slot="icon"
								>
									<SettingsIcon />
								</span>
							</MediaPlaybackRateMenuButton>
							<div className="settings-menu-wrap">
								<MediaPlaybackRateMenu hidden />
							</div>
						</div>
					</div>
					{!isYouTube && (
						<MediaPipButton>
							<PipIcon />
						</MediaPipButton>
					)}

					<MediaFullscreenButton>
						<FullscreenIcon />
					</MediaFullscreenButton>
				</MediaControlBar>
			</MediaController>
		</>
	);
}

export function VideoPlayer(props: VideoPlayerProps) {
	return (
		<MediaProvider>
			<VideoPlayerInner {...props} />
		</MediaProvider>
	);
}
