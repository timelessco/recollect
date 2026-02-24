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
} from "./media-player-icons";
import { AudioWaveformPlayer } from "./AudioWaveformPlayer";
import {
	CONTROL_BAR_STYLE,
	CONTROLLER_STYLE,
	MEDIA_STYLE,
	YOUTUBE_CONTROLLER_STYLE,
} from "./media-player-theme";
import { Spinner } from "./spinner";

import "./media-player-theme.css";

export type MediaType = "audio" | "spotify" | "video" | "youtube";

export interface MediaPlayerProps {
	isActive?: boolean;
	mediaType: MediaType;
	onError?: () => void;
	src: string;
	title?: string;
}

function isAudioType(mediaType: MediaType): mediaType is "audio" | "spotify" {
	return mediaType === "audio" || mediaType === "spotify";
}

function getControllerStyle(mediaType: "video" | "youtube") {
	if (mediaType === "youtube") {
		return YOUTUBE_CONTROLLER_STYLE;
	}

	return CONTROLLER_STYLE;
}

/* ---- Video/YouTube player (media-chrome) ---- */

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
				<video ref={ref} slot="media" src={src} style={MEDIA_STYLE}>
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
				style={{
					...getControllerStyle(mediaType),
					...(loading ? { position: "absolute", opacity: 0 } : undefined),
				}}
			>
				{mediaElement}

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

					{mediaType === "video" && (
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

export function MediaPlayer(props: MediaPlayerProps) {
	if (isAudioType(props.mediaType)) {
		return (
			<AudioWaveformPlayer
				isActive={props.isActive}
				mediaType={props.mediaType}
				onError={props.onError}
				src={props.src}
				title={props.title}
			/>
		);
	}

	return (
		<MediaProvider>
			<VideoPlayerInner
				isActive={props.isActive}
				mediaType={props.mediaType}
				onError={props.onError}
				src={props.src}
			/>
		</MediaProvider>
	);
}
