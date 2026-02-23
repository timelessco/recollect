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
	YOUTUBE_CONTROLLER_STYLE,
} from "./video-player-theme";

import "./video-player-theme.css";

export interface VideoPlayerProps {
	isYouTube?: boolean;
	onError?: () => void;
	src: string;
}

/* ---- Main player ---- */

function VideoPlayerInner({ isYouTube, onError, src }: VideoPlayerProps) {
	const mediaRef = useMediaRef();
	const onErrorRef = useRef(onError);
	onErrorRef.current = onError;

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

	const ref = useCallback(
		(el: HTMLVideoElement | null) => {
			mediaRef(el);

			if (!el) {
				return undefined;
			}

			const handleError = () => onErrorRef.current?.();
			el.addEventListener("error", handleError);
			return () => {
				el.removeEventListener("error", handleError);
				mediaRef(null);
			};
		},
		[mediaRef],
	);

	return (
		<MediaController
			onPointerDownCapture={(event) => event.stopPropagation()}
			style={isYouTube ? YOUTUBE_CONTROLLER_STYLE : CONTROLLER_STYLE}
		>
			{isYouTube ? (
				youTubeReady && (
					<youtube-video
						crossOrigin=""
						ref={ref}
						slot="media"
						src={src}
						autoPlay
					/>
				)
			) : (
				<video ref={ref} slot="media" src={src} autoPlay>
					<track default kind="captions" label="No captions" srcLang="en" />
				</video>
			)}

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
	);
}

export function VideoPlayer(props: VideoPlayerProps) {
	return (
		<MediaProvider>
			<VideoPlayerInner {...props} />
		</MediaProvider>
	);
}
