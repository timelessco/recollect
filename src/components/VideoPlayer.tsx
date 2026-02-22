"use client";

import { useCallback, useEffect, useRef } from "react";
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
	MediaSeekBackwardButton,
	MediaTimeDisplay,
	MediaTimeRange,
	MediaVolumeRange,
} from "media-chrome/react";
import {
	MediaActionTypes,
	MediaProvider,
	useMediaDispatch,
	useMediaRef,
} from "media-chrome/react/media-store";

import { CONTROL_BAR_STYLE, CONTROLLER_STYLE } from "./video-player-theme";

import "./video-player-theme.css";

export interface VideoPlayerProps {
	isActive: boolean;
	isYouTube?: boolean;
	onError?: () => void;
	src: string;
}

function AutoplayController({ isActive }: { isActive: boolean }) {
	const dispatch = useMediaDispatch();

	useEffect(() => {
		if (isActive) {
			dispatch({ type: MediaActionTypes.MEDIA_PLAY_REQUEST });
		} else {
			dispatch({ type: MediaActionTypes.MEDIA_PAUSE_REQUEST });
		}
	}, [dispatch, isActive]);

	return null;
}

/* ---- Custom SVG icon slots ---- */

function PlayPauseIcon() {
	return (
		<svg slot="icon" viewBox="0 0 24 24" aria-hidden>
			<g className="icon-state icon-play">
				<path d="M8 5v14l11-7z" fill="currentColor" />
			</g>
			<g className="icon-state icon-pause">
				<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" fill="currentColor" />
			</g>
		</svg>
	);
}

function VolumeOnIcon() {
	return (
		<g className="icon-state vol-on">
			<path
				d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
				fill="currentColor"
			/>
		</g>
	);
}

function VolumeOffIcon() {
	return (
		<g className="icon-state vol-off">
			<path
				d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"
				fill="currentColor"
			/>
		</g>
	);
}

function MuteIcon() {
	return (
		<svg slot="icon" viewBox="0 0 24 24" aria-hidden>
			<VolumeOnIcon />
			<VolumeOffIcon />
		</svg>
	);
}

function FullscreenEnterIcon() {
	return (
		<g className="icon-state fs-enter">
			<path
				d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"
				fill="currentColor"
			/>
		</g>
	);
}

function FullscreenExitIcon() {
	return (
		<g className="icon-state fs-exit">
			<path
				d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"
				fill="currentColor"
			/>
		</g>
	);
}

function FullscreenIcon() {
	return (
		<svg slot="icon" viewBox="0 0 24 24" aria-hidden>
			<FullscreenEnterIcon />
			<FullscreenExitIcon />
		</svg>
	);
}

/* ---- Main player ---- */

function VideoPlayerInner({
	isActive,
	isYouTube,
	onError,
	src,
}: VideoPlayerProps) {
	const mediaRef = useMediaRef();
	const onErrorRef = useRef(onError);
	onErrorRef.current = onError;

	useEffect(() => {
		if (isYouTube) {
			void import("youtube-video-element");
		}
	}, [isYouTube]);

	const ref = useCallback(
		(el: HTMLVideoElement | null) => {
			mediaRef(el);

			if (!el) {
				return undefined;
			}

			const handleError = () => onErrorRef.current?.();
			el.addEventListener("error", handleError);
			return () => el.removeEventListener("error", handleError);
		},
		[mediaRef],
	);

	return (
		<MediaController style={CONTROLLER_STYLE}>
			{isYouTube ? (
				<youtube-video ref={ref} slot="media" src={src} />
			) : (
				<video ref={ref} slot="media" src={src}>
					<track default kind="captions" label="No captions" srcLang="en" />
				</video>
			)}

			<AutoplayController isActive={isActive} />

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

				<MediaSeekBackwardButton />
				<MediaPipButton />

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
