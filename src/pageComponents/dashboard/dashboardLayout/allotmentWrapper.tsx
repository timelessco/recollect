import { useEffect, type RefObject } from "react";
import {
	Allotment,
	type AllotmentHandle,
	type AllotmentProps,
} from "allotment";

import {
	DEFAULT_SIDE_PANE_WIDTH,
	useSidePaneStore,
} from "../../../store/sidePaneStore";

import "allotment/dist/style.css";

// Side pane resize thresholds

// Below this width, snap closed
const SNAP_THRESHOLD = 180;
// Delay for resize animations (ms)
const ANIMATION_DELAY = 100;

// Interpolation functions for Allotment resize animation
const interpolateScaleValue = (angle: number) => {
	if (angle < 0) {
		return 0.95;
	} else if (angle > 200) {
		return 1;
	} else {
		return 0.95 + (angle / 200) * 0.05;
	}
};

const interpolateTransformValue = (angle: number) => {
	if (angle <= 0) {
		return -23;
	} else if (angle >= 200) {
		return 0;
	} else {
		return -23 + (angle / 200) * 23;
	}
};

const interpolateOpacityValue = (angle: number) => {
	if (angle <= 0) {
		return 0;
	} else if (angle >= 180) {
		return 1;
	} else {
		return angle / 180;
	}
};

interface AllotmentWrapperProps extends AllotmentProps {
	allotmentRef: RefObject<AllotmentHandle | null>;
	sidePaneRef: RefObject<HTMLDivElement | null>;
	children: React.ReactNode;
}

export const AllotmentWrapper = (props: AllotmentWrapperProps) => {
	const { allotmentRef, sidePaneRef, ...rest } = props;

	const setShowSidePane = useSidePaneStore((state) => state.setShowSidePane);
	const setSidePaneWidth = useSidePaneStore((state) => state.setSidePaneWidth);

	// Resize pane animation logic
	useEffect(() => {
		const resizePaneRef = sidePaneRef?.current;

		const observer = new ResizeObserver((entries) => {
			const elementWidth = entries[0]?.contentRect?.width;
			const sidePaneElement = document.querySelector(
				"#side-pane-id",
			) as HTMLElement;

			if (sidePaneElement) {
				if (elementWidth < 200) {
					sidePaneElement.style.scale =
						interpolateScaleValue(elementWidth)?.toString();
					sidePaneElement.style.transform = `translateX(${interpolateTransformValue(
						elementWidth,
					)}px)`;

					sidePaneElement.style.opacity =
						interpolateOpacityValue(elementWidth)?.toString();
				} else {
					sidePaneElement.style.scale = "1";
					sidePaneElement.style.opacity = "1";
					sidePaneElement.style.transform = `translateX(0px)`;
				}
			}
		});

		if (resizePaneRef) {
			observer.observe(resizePaneRef);
			return () => resizePaneRef && observer.unobserve(resizePaneRef);
		}

		return undefined;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<Allotment
			onChange={(value: number[]) => {
				if (value[0] === 0) {
					setShowSidePane(false);
				}

				if (value[0] === 184) {
					setShowSidePane(true);
				}
			}}
			onDragEnd={(values: number[]) => {
				const leftPaneSize = values?.[0];
				if (leftPaneSize === 0 && sidePaneRef?.current?.clientWidth === 0) {
					// open side pane when its fully closed and on the resize pane click
					setShowSidePane(true);
					// opens side pane
					setTimeout(() => allotmentRef?.current?.reset(), ANIMATION_DELAY);
				}

				const sidepaneWidth = sidePaneRef.current?.clientWidth;
				if (
					leftPaneSize < SNAP_THRESHOLD &&
					sidepaneWidth &&
					sidepaneWidth > 0
				) {
					// closes the side pane when user is resizing it and side pane is less than snap threshold
					setTimeout(
						() => allotmentRef?.current?.resize([0, 100]),
						ANIMATION_DELAY,
					);
					setShowSidePane(false);
				}

				if (
					leftPaneSize > SNAP_THRESHOLD &&
					leftPaneSize < DEFAULT_SIDE_PANE_WIDTH
				) {
					// resets the side pane to default sizes based on user resizing width
					allotmentRef?.current?.reset();
					// close collapse button on resize
					setShowSidePane(true);
				}

				if (leftPaneSize > DEFAULT_SIDE_PANE_WIDTH) {
					setShowSidePane(true);
					setSidePaneWidth(leftPaneSize);
				}
			}}
			onVisibleChange={() => {
				setShowSidePane(false);
			}}
			ref={allotmentRef}
			{...rest}
		/>
	);
};
