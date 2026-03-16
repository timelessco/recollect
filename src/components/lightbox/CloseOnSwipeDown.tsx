import { useEffect, useRef } from "react";
import { useController } from "yet-another-react-lightbox";

const THRESHOLD = 200;
const OPACITY_START = THRESHOLD * 0.5;

export const PullEffect = ({ enabled }: { enabled?: boolean }): null => {
	const { subscribeSensors, close, slideRect } = useController();

	const offsetRef = useRef(0);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Touch tracking refs
	const pointerStartYRef = useRef(0);
	const pointerLastYRef = useRef(0);
	const isDraggingRef = useRef(false);

	useEffect(() => {
		if (!enabled) {
			return () => {};
		}

		const maxOffset = slideRect?.height ?? 0;

		const reset = (element: HTMLElement) => {
			offsetRef.current = 0;
			element.style.setProperty("--yarl-pull-offset", "0px");
			element.style.setProperty("--yarl-pull-opacity", "1");
			element.style.setProperty("--yarl-pull-scale", "1");
		};

		const applyOffset = (element: HTMLElement) => {
			element.style.setProperty("--yarl-pull-offset", `${offsetRef.current}px`);

			const opacity =
				offsetRef.current > OPACITY_START
					? Math.max(
							0.5,
							1 -
								((offsetRef.current - OPACITY_START) /
									(THRESHOLD - OPACITY_START)) *
									0.5,
						)
					: 1;
			element.style.setProperty("--yarl-pull-opacity", `${opacity}`);

			const scale = Math.max(0.5, 1 - (offsetRef.current / THRESHOLD) * 0.2);
			element.style.setProperty("--yarl-pull-scale", `${scale}`);
		};

		// Desktop: wheel/trackpad
		const unsubWheel = subscribeSensors("onWheel", (event) => {
			const element = event.currentTarget as HTMLElement;

			if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
				return;
			}

			offsetRef.current = Math.min(
				Math.max(offsetRef.current + event.deltaY, 0),
				maxOffset,
			);

			applyOffset(element);

			if (offsetRef.current > THRESHOLD) {
				close();
				return;
			}

			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}

			timeoutRef.current = setTimeout(() => reset(element), 200);
		});

		// Mobile: pointer events (touch)
		const unsubPointerDown = subscribeSensors(
			"onPointerDown",
			(event: React.PointerEvent) => {
				if (event.pointerType !== "touch") {
					return;
				}

				pointerStartYRef.current = event.clientY;
				pointerLastYRef.current = event.clientY;
				isDraggingRef.current = false;
				offsetRef.current = 0;
			},
		);

		const unsubPointerMove = subscribeSensors(
			"onPointerMove",
			(event: React.PointerEvent) => {
				if (event.pointerType !== "touch") {
					return;
				}

				const deltaY = event.clientY - pointerStartYRef.current;
				const element = event.currentTarget as HTMLElement;

				// Only activate pull-down (positive deltaY = downward)
				if (deltaY <= 0) {
					if (isDraggingRef.current) {
						reset(element);
						isDraggingRef.current = false;
					}

					return;
				}

				isDraggingRef.current = true;
				pointerLastYRef.current = event.clientY;
				offsetRef.current = Math.min(deltaY, maxOffset);

				applyOffset(element);

				if (offsetRef.current > THRESHOLD) {
					isDraggingRef.current = false;
					close();
				}
			},
		);

		const handlePointerEnd = (event: React.PointerEvent) => {
			if (event.pointerType !== "touch") {
				return;
			}

			if (!isDraggingRef.current) {
				return;
			}

			const element = event.currentTarget as HTMLElement;
			isDraggingRef.current = false;

			if (offsetRef.current > THRESHOLD) {
				close();
			} else {
				reset(element);
			}
		};

		const unsubPointerUp = subscribeSensors("onPointerUp", handlePointerEnd);
		const unsubPointerCancel = subscribeSensors(
			"onPointerCancel",
			handlePointerEnd,
		);

		return () => {
			unsubWheel();
			unsubPointerDown();
			unsubPointerMove();
			unsubPointerUp();
			unsubPointerCancel();
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, [subscribeSensors, slideRect, close, enabled]);

	return null;
};
