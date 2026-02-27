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
import {
	AUDIO_CONTROL_BAR_STYLE,
	AUDIO_CONTROLLER_STYLE,
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
}

function isAudioType(mediaType: MediaType): boolean {
	return mediaType === "audio" || mediaType === "spotify";
}

function getControllerStyle(mediaType: MediaType) {
	if (isAudioType(mediaType)) {
		return AUDIO_CONTROLLER_STYLE;
	}

	if (mediaType === "youtube") {
		return YOUTUBE_CONTROLLER_STYLE;
	}

	return CONTROLLER_STYLE;
}

/* ---- Main player ---- */

function MediaPlayerInner({
	isActive,
	mediaType,
	onError,
	src,
}: MediaPlayerProps) {
	const mediaRef = useMediaRef();
	const mediaElRef = useRef<HTMLElement | null>(null);
	const onErrorRef = useRef(onError);
	onErrorRef.current = onError;
	const [loading, setLoading] = useState(true);
	const [youTubeReady, setYouTubeReady] = useState(false);
	const [spotifyReady, setSpotifyReady] = useState(false);

	const isAudio = isAudioType(mediaType);

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
		if (mediaType !== "spotify") {
			return;
		}

		void (async () => {
			try {
				await import("spotify-audio-element");
				setSpotifyReady(true);
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
			// Custom elements (spotify-audio) implement the HTMLMediaElement API
			// at runtime but extend HTMLElement, so cast for media-chrome
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

		case "spotify": {
			if (spotifyReady) {
				mediaElement = <spotify-audio ref={ref} slot="media" src={src} />;
			}

			break;
		}

		case "audio": {
			mediaElement = (
				<audio ref={ref} slot="media" src={src}>
					<track default kind="captions" label="No captions" srcLang="en" />
				</audio>
			);
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

	// Audio types don't need the loading gate — the <audio> element and
	// spotify-audio custom element may never fire "loadeddata", so show
	// the control bar immediately.
	const showLoading = loading && !isAudio;

	return (
		<>
			{showLoading && (
				<div className="flex items-center justify-center py-16">
					<Spinner className="size-3" />
				</div>
			)}
			<MediaController
				audio={isAudio || undefined}
				autohide={isAudio ? "-1" : undefined}
				breakpoints="pip:400 sm:384 md:576 lg:768 xl:960"
				onPointerDown={(event) => event.stopPropagation()}
				style={{
					...getControllerStyle(mediaType),
					...(showLoading ? { position: "absolute", opacity: 0 } : undefined),
				}}
			>
				{mediaElement}

				{!isAudio && <div className="video-gradient-bottom" />}

				<MediaControlBar
					style={isAudio ? AUDIO_CONTROL_BAR_STYLE : CONTROL_BAR_STYLE}
				>
					<MediaPlayButton ref={(el) => el?.setAttribute("notooltip", "")}>
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
						{!isAudio && (
							<>
								<MediaPreviewThumbnail slot="preview" />
								<MediaPreviewChapterDisplay slot="preview" />
							</>
						)}
						<MediaPreviewTimeDisplay slot="preview" />
					</MediaTimeRange>

					{mediaType !== "spotify" && (
						<div className="settings-group">
							<div className="settings-group-inner">
								<MediaPlaybackRateMenuButton
									ref={(el) => el?.setAttribute("notooltip", "")}
								>
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
					)}

					{mediaType === "video" && (
						<MediaPipButton ref={(el) => el?.setAttribute("notooltip", "")}>
							<PipIcon />
						</MediaPipButton>
					)}

					{!isAudio && (
						<MediaFullscreenButton
							ref={(el) => el?.setAttribute("notooltip", "")}
						>
							<FullscreenIcon />
						</MediaFullscreenButton>
					)}
				</MediaControlBar>
			</MediaController>
		</>
	);
}

export function MediaPlayer(props: MediaPlayerProps) {
	return (
		<MediaProvider>
			<MediaPlayerInner {...props} />
		</MediaProvider>
	);
}
