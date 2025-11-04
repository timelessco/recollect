import { useEffect, useRef } from "react";
import { useController } from "yet-another-react-lightbox";

export const PullEffect = ({ enabled }: { enabled?: boolean }): null => {
	// Lightbox controller: lets us subscribe to user input sensors,
	// close the lightbox, and access current slide dimensions
	const { subscribeSensors, close, slideRect } = useController();

	// Tracks how far the user has pulled down (Y offset in px)
	const offsetRef = useRef(0);

	// Used to debounce/reset animations after inactivity
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		if (!enabled) {
			return () => {};
		}

		// Maximum pull distance = slide height
		const maxOffset = slideRect?.height ?? 0;

		// Threshold at which we actually close the lightbox
		const threshold = 200;

		// Point at which opacity starts decreasing
		const opacityStart = threshold * 0.5;

		// Reset styles back to default (no offset, full opacity, normal scale)
		const reset = (element: HTMLElement) => {
			offsetRef.current = 0;
			element.style.setProperty("--yarl-pull-offset", "0px");
			element.style.setProperty("--yarl-pull-opacity", "1");
			element.style.setProperty("--yarl-pull-scale", "1");
		};

		// Subscribe to wheel events from the lightbox
		const unsubscribe = subscribeSensors("onWheel", (event) => {
			const element = event.currentTarget as HTMLElement;

			// --- Ignore horizontal swipes (left/right) ---
			// If horizontal movement is stronger than vertical, do nothing
			if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
				return;
			}

			// Update offset: clamp between 0 and maxOffset (slide height)
			offsetRef.current = Math.min(
				Math.max(offsetRef.current + event.deltaY, 0),
				maxOffset,
			);

			// Update CSS variables for translation
			element.style.setProperty("--yarl-pull-offset", `${offsetRef.current}px`);

			// Fade out gradually after crossing opacityStart
			const opacity =
				offsetRef.current > opacityStart
					? Math.max(
							0.5,
							1 -
								((offsetRef.current - opacityStart) /
									(threshold - opacityStart)) *
									0.5,
						)
					: 1;
			element.style.setProperty("--yarl-pull-opacity", `${opacity}`);

			// Scale down slightly as we pull further
			const scale = Math.max(0.5, 1 - (offsetRef.current / threshold) * 0.2);
			element.style.setProperty("--yarl-pull-scale", `${scale}`);

			// Close the lightbox if pull distance exceeds threshold
			if (offsetRef.current > threshold) {
				close();
				return;
			}

			// Animate back to neutral if user stops pulling
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
			timeoutRef.current = setTimeout(() => reset(element), 200);
		});

		// Cleanup on unmount or dependency change
		return () => {
			unsubscribe();
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, [subscribeSensors, slideRect, close, enabled]);

	return null;
};
