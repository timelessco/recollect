import { useEffect, useRef, useState, type RefObject } from "react";
import Image from "next/image";
import { type ZoomRef } from "yet-another-react-lightbox";

import { SCREENSHOT_URL } from "../../utils/constants";

type EmbedWithFallbackProps = {
	currentZoomRef: RefObject<ZoomRef> | ZoomRef | null;
	placeholder?: string;
	placeholderHeight?: number;
	placeholderWidth?: number;
	src: string;
};

/**
 * EmbedWithFallback Component
 *
 * A  component that attempts to embed web content using an HTML object element,
 * with  fallback to a placeholder image if the embed fails. Features include:
 *
 * - Automatic failure detection using height monitoring
 * - Responsive image scaling for screenshots
 * - Dynamic sizing based on viewport constraints
 * - Graceful degradation from live embed to static image
 *
 * The component uses a polling mechanism to detect when the object element fails
 * to load content, indicated by the fallback div becoming visible.
 */
export const EmbedWithFallback = ({
	src,
	placeholder,
	placeholderHeight,
	placeholderWidth,
	currentZoomRef,
}: EmbedWithFallbackProps) => {
	// Ref for the main container element
	const containerRef = useRef<HTMLDivElement>(null);

	// Ref for the fallback detection div inside the object element
	// When this div becomes visible (height > 0), it means the object failed to load
	const fallbackRef = useRef<HTMLDivElement>(null);

	// State to track whether the embed has failed and should show fallback
	const [failed, setFailed] = useState(false);

	// Helper function to safely access the zoom ref value
	const getZoomRef = () => {
		if (!currentZoomRef) return null;
		return "current" in currentZoomRef
			? currentZoomRef.current
			: currentZoomRef;
	};

	/**
	 * Effect hook that monitors the embed loading status
	 * Uses a polling mechanism to check if the fallback div becomes visible,
	 * which indicates the object element failed to load the content
	 */
	useEffect(() => {
		let attempts = 0;
		// Maximum number of checks before giving up
		const maxAttempts = 10;

		/**
		 * Recursive function that checks if the embed has failed
		 * Monitors the height of the fallback div - if it becomes visible (height > 0),
		 * the object element has failed to load and we should show the placeholder
		 */
		const check = () => {
			const fallback = fallbackRef?.current;

			if (!fallback) return;

			// Get the current height of the fallback div
			const viewHeight = fallback?.getBoundingClientRect()?.height;

			if (viewHeight > 0) {
				// Fallback div is visible, meaning object failed to load
				setFailed(true);
			} else if (attempts < maxAttempts) {
				// Continue checking if we haven't reached max attempts
				attempts++;
				// Check again in 200ms
				setTimeout(check, 200);
			}
		};

		// Reset failed state and start checking after initial delay
		setFailed(false);
		// Initial delay to allow object to start loading
		setTimeout(check);
		// Re-run when src changes
	}, [src]);

	/**
	 * Render fallback placeholder image when embed has failed
	 * Includes intelligent scaling and responsive behavior
	 */
	if (failed && placeholder) {
		// Check if this is a screenshot URL (may need special scaling)
		const isScreenshot = placeholder?.startsWith(SCREENSHOT_URL);

		// Apply 50% scaling to screenshots to make them more manageable
		const scaledWidth = isScreenshot
			? (placeholderWidth ?? 0) * 0.5
			: placeholderWidth ?? 0;
		const scaledHeight = isScreenshot
			? (placeholderHeight ?? 0) * 0.5
			: placeholderHeight ?? 0;

		// Check if image dimensions exceed reasonable display limits
		const exceedsWidth = scaledWidth > 1_200;
		const underHeight = scaledHeight > window?.innerHeight * 0.8;

		/**
		 * Render constrained image when dimensions are too large
		 * Uses CSS constraints to ensure image fits within reasonable bounds
		 */
		if (exceedsWidth || underHeight) {
			return (
				<div className="flex items-center justify-center">
					<div
						className={`flex ${exceedsWidth ? "max-w-[1200px]" : ""} ${
							underHeight ? "max-h-[80vh]" : ""
						}`}
					>
						<Image
							alt="Preview"
							className="object-contain"
							draggable={false}
							height={placeholderHeight}
							onDoubleClick={(event) => {
								event.stopPropagation();
								const zoom = getZoomRef();
								if (!zoom) return;

								if (zoom?.zoom > 1) {
									zoom?.zoomOut();
								} else {
									zoom?.zoomIn();
								}
							}}
							src={placeholder}
							width={placeholderWidth}
						/>
					</div>
				</div>
			);
		}

		/**
		 * Render normal-sized placeholder image
		 * Screenshots get 50% scaling applied via CSS transform as they are 2x screenshots
		 */
		return (
			<div
				className={`flex min-h-screen origin-center items-center justify-center ${
					isScreenshot ? "scale-50" : ""
				}`}
			>
				<Image
					alt="Preview"
					className="h-auto w-auto"
					draggable={false}
					height={placeholderHeight}
					onDoubleClick={(event) => {
						event.stopPropagation();
						const zoom = getZoomRef();
						if (!zoom) return;

						if (zoom?.zoom > 1) {
							zoom?.zoomOut();
						} else {
							zoom?.zoomIn();
						}
					}}
					src={placeholder}
					width={placeholderWidth}
				/>
			</div>
		);
	}

	/**
	 * Render the main embed attempt using HTML object element
	 * The object element tries to embed the web content directly
	 * If it fails, the fallback div becomes visible, which we detect above
	 */
	return (
		<div
			className="relative h-full min-h-[500px] w-full max-w-[1200px]"
			ref={containerRef}
		>
			<object
				className="h-full w-full"
				data={src}
				title="Website Preview"
				type="text/html"
			>
				{/* 
				Fallback content that becomes visible if object fails to load
				This div is monitored by our useEffect to detect loading failures
				Small height ensures it's not visually intrusive when visible
				*/}
				<div ref={fallbackRef} style={{ height: "5px", width: "100%" }} />
			</object>
		</div>
	);
};
