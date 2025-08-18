import { useEffect, useRef } from "react";
import { useController } from "yet-another-react-lightbox";

export const PullEffect = () => {
	const { subscribeSensors, close, slideRect } = useController();
	const offsetRef = useRef(0);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		const maxOffset = slideRect?.height;
		const threshold = 200;
		const opacityStart = threshold * 0.5;

		const animateBack = (element: HTMLElement) => {
			let current = offsetRef?.current;

			const step = () => {
				if (current > 1) {
					current *= 0.85;
					offsetRef.current = current;

					element?.style?.setProperty("--yarl__pull_offset", `${current}px`);

					const opacity =
						current > opacityStart
							? Math?.min(
									1,
									1 -
										((current - opacityStart) / (threshold - opacityStart)) *
											0.5,
							  )
							: 1;
					element?.style?.setProperty("--yarl__pull_opacity", `${opacity}`);

					const scale = Math?.min(1, 1 - (current / threshold) * 0.2);
					element?.style?.setProperty("--yarl__pull_scale", `${scale}`);

					requestAnimationFrame(step);
				} else {
					offsetRef.current = 0;
					element?.style?.setProperty("--yarl__pull_offset", "0px");
					element?.style?.setProperty("--yarl__pull_opacity", "1");
					element?.style?.setProperty("--yarl__pull_scale", "1");
				}
			};

			requestAnimationFrame(step);
		};

		const unsubscribe = subscribeSensors("onWheel", (event) => {
			const element = event?.currentTarget as HTMLElement;

			offsetRef.current = Math?.min(
				Math?.max(offsetRef?.current + event?.deltaY, 0),
				maxOffset,
			);

			element?.style?.setProperty(
				"--yarl__pull_offset",
				`${offsetRef?.current}px`,
			);

			// Apply opacity only after 50%
			const opacity =
				offsetRef?.current > opacityStart
					? Math?.max(
							0.5,
							1 -
								((offsetRef?.current - opacityStart) /
									(threshold - opacityStart)) *
									0.5,
					  )
					: 1;
			element?.style?.setProperty("--yarl__pull_opacity", `${opacity}`);

			const scale = Math?.max(0.5, 1 - (offsetRef?.current / threshold) * 0.2);
			element?.style?.setProperty("--yarl__pull_scale", `${scale}`);

			if (offsetRef?.current > threshold) {
				close();
				return;
			}

			if (timeoutRef?.current) clearTimeout(timeoutRef?.current);
			timeoutRef.current = setTimeout(() => {
				animateBack(element);
			}, 200);
		});

		return () => {
			unsubscribe();
			if (timeoutRef?.current) clearTimeout(timeoutRef?.current);
		};
	}, [subscribeSensors, slideRect, close]);

	return null;
};
