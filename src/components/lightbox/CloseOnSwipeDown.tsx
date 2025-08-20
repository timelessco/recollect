import { useEffect, useRef } from "react";
import { useController } from "yet-another-react-lightbox";

export const PullEffect = () => {
	// Lightbox controller hook gives access to sensors, close function, and slide dimensions
	const { subscribeSensors, close, slideRect } = useController();

	// Stores how far the slide has been pulled down (Y offset in px)
	const offsetRef = useRef(0);

	// Stores a timeout ID so we can reset the animation after the user stops scrolling
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		// Maximum pull distance (limited by slide height)
		const maxOffset = slideRect?.height;

		// Threshold beyond which the lightbox will close
		const threshold = 200;

		// Opacity should start reducing after pulling 50% of threshold
		const opacityStart = threshold * 0.5;

		/**
		 * Smoothly animate the slide back to its original position (y = 0, scale = 1, opacity = 1)
		 */
		const animateBack = (element: HTMLElement) => {
			let current = offsetRef?.current;

			const step = () => {
				// Keep reducing offset until it's very close to zero
				if (current > 1) {
					// Reduce current offset progressively (ease-out effect)
					current *= 0.85;
					offsetRef.current = current;

					// Apply vertical offset
					element?.style?.setProperty("--yarl__pull_offset", `${current}px`);

					// Apply opacity (fades only after 50% of threshold)
					const opacity =
						current > opacityStart
							? Math?.min(
									1,
									1 -
										((current - opacityStart) / (threshold - opacityStart)) *
											// fade out gradually
											0.5,
							  )
							: 1;
					element?.style?.setProperty("--yarl__pull_opacity", `${opacity}`);

					// Apply scaling effect (shrinks slightly as pulled)
					const scale = Math?.min(1, 1 - (current / threshold) * 0.2);
					element?.style?.setProperty("--yarl__pull_scale", `${scale}`);

					// Continue animating on the next frame
					requestAnimationFrame(step);
				} else {
					// Reset to defaults when animation finishes
					offsetRef.current = 0;
					element?.style?.setProperty("--yarl__pull_offset", "0px");
					element?.style?.setProperty("--yarl__pull_opacity", "1");
					element?.style?.setProperty("--yarl__pull_scale", "1");
				}
			};

			// Kick off animation
			requestAnimationFrame(step);
		};

		/**
		 * Subscribe to wheel events on the slide.
		 * This lets us detect when the user scrolls/pulls down.
		 */
		const unsubscribe = subscribeSensors("onWheel", (event) => {
			const element = event?.currentTarget as HTMLElement;

			// Update offset, clamped between 0 and slide height
			offsetRef.current = Math?.min(
				Math?.max(offsetRef?.current + event?.deltaY, 0),
				maxOffset,
			);

			// Apply vertical offset transform
			element?.style?.setProperty(
				"--yarl__pull_offset",
				`${offsetRef?.current}px`,
			);

			// Apply opacity only after passing opacityStart
			const opacity =
				offsetRef?.current > opacityStart
					? Math?.max(
							// never go below 0.5 while pulling
							0.5,
							1 -
								((offsetRef?.current - opacityStart) /
									(threshold - opacityStart)) *
									0.5,
					  )
					: 1;
			element?.style?.setProperty("--yarl__pull_opacity", `${opacity}`);

			// Apply scale (never shrink below 0.5)
			const scale = Math?.max(0.5, 1 - (offsetRef?.current / threshold) * 0.2);
			element?.style?.setProperty("--yarl__pull_scale", `${scale}`);

			// If pulled beyond threshold, close the lightbox
			if (offsetRef?.current > threshold) {
				close();
				return;
			}

			// If user stops scrolling, animate slide back to normal after 200ms
			if (timeoutRef?.current) clearTimeout(timeoutRef?.current);
			timeoutRef.current = setTimeout(() => {
				animateBack(element);
			}, 200);
		});

		// Cleanup: unsubscribe from wheel events & clear timeout
		return () => {
			unsubscribe();
			if (timeoutRef?.current) clearTimeout(timeoutRef?.current);
		};
	}, [subscribeSensors, slideRect, close]);

	// Component renders nothing (pure effect-based behavior)
	return null;
};
