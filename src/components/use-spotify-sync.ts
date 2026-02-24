import { useCallback, useEffect, useRef, useState } from "react";
import type WaveSurfer from "wavesurfer.js";

export interface UseSpotifySyncProps {
	onError?: () => void;
	src: string;
	wavesurfer: WaveSurfer | null;
}

/**
 * Manages spotify-audio element lifecycle and manually syncs its playback
 * state with a wavesurfer instance (used as pure visualization, not bound
 * via wavesurfer's `media` option).
 */
export function useSpotifySync({
	onError,
	src,
	wavesurfer,
}: UseSpotifySyncProps) {
	const onErrorRef = useRef(onError);

	useEffect(() => {
		onErrorRef.current = onError;
	}, [onError]);

	const [spotifyReady, setSpotifyReady] = useState(false);
	const [element, setElement] = useState<HTMLMediaElement | null>(null);
	const [playing, setPlaying] = useState(false);
	const [time, setTime] = useState(0);
	const [duration, setDuration] = useState(0);

	// Dynamic import for spotify-audio-element
	useEffect(() => {
		void (async () => {
			try {
				await import("spotify-audio-element");
				setSpotifyReady(true);
			} catch {
				onErrorRef.current?.();
			}
		})();
	}, []);

	// Sync spotify element events → local state + wavesurfer visual progress
	useEffect(() => {
		if (!element) {
			return undefined;
		}

		const onPlay = () => setPlaying(true);
		const onPause = () => setPlaying(false);
		const onError = () => onErrorRef.current?.();
		const onDuration = () => {
			const dur = element.duration;
			if (dur && Number.isFinite(dur)) {
				setDuration(dur);
			}
		};

		const onTimeUpdate = () => {
			const cur = element.currentTime;
			setTime(cur);
			// Drive wavesurfer's visual progress bar
			if (wavesurfer && duration > 0) {
				wavesurfer.seekTo(cur / duration);
			}
		};

		element.addEventListener("play", onPlay);
		element.addEventListener("pause", onPause);
		element.addEventListener("error", onError);
		element.addEventListener("timeupdate", onTimeUpdate);
		element.addEventListener("durationchange", onDuration);
		element.addEventListener("loadedmetadata", onDuration);

		// Check if metadata already loaded
		if (element.duration && Number.isFinite(element.duration)) {
			setDuration(element.duration);
		}

		return () => {
			element.removeEventListener("play", onPlay);
			element.removeEventListener("pause", onPause);
			element.removeEventListener("error", onError);
			element.removeEventListener("timeupdate", onTimeUpdate);
			element.removeEventListener("durationchange", onDuration);
			element.removeEventListener("loadedmetadata", onDuration);
		};
	}, [duration, element, wavesurfer]);

	// Waveform click → seek spotify element
	useEffect(() => {
		if (!wavesurfer || !element || !duration) {
			return undefined;
		}

		return wavesurfer.on("interaction", (newTime: number) => {
			element.currentTime = newTime;
		});
	}, [duration, element, wavesurfer]);

	const togglePlayPause = useCallback(() => {
		if (!element) {
			return;
		}

		if (element.paused) {
			void (element as HTMLMediaElement).play();
		} else {
			element.pause();
		}
	}, [element]);

	const setRef = useCallback((el: HTMLElement | null) => {
		setElement(el as HTMLMediaElement | null);
	}, []);

	return {
		duration,
		playing,
		setRef,
		spotifyReady,
		src,
		time,
		togglePlayPause,
	};
}
