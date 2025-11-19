import "allotment/dist/style.css";

import { type RefObject } from "react";
import { useResizeObserver } from "@react-hookz/web";
import {
	Allotment,
	type AllotmentHandle,
	type AllotmentProps,
} from "allotment";

import { useSidePaneStore } from "../../../store/sidePaneStore";

// Below this width, reset to default
export const SIDE_PANE_DEFAULT_WIDTH = 244;
// Below this width, snap closed
export const SIDE_PANE_SNAP_THRESHOLD = 200;
// Delay for resize animations (ms)
export const SIDE_PANE_ANIMATION_DELAY = 100;

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
	sidePaneContentRef: RefObject<HTMLDivElement | null>;
	children: React.ReactNode;
}

export const AllotmentWrapper = (props: AllotmentWrapperProps) => {
	const { allotmentRef, sidePaneRef, sidePaneContentRef, ...rest } = props;

	const setShowSidePane = useSidePaneStore((state) => state.setShowSidePane);

	// Resize pane animation logic with useResizeObserver for better performance
	useResizeObserver(sidePaneRef, (entry) => {
		const elementWidth = entry.contentRect.width;
		const sidePaneElement = sidePaneContentRef.current;

		if (!sidePaneElement) {
			return;
		}

		// Use requestAnimationFrame for smooth 60fps updates
		requestAnimationFrame(() => {
			if (elementWidth < SIDE_PANE_SNAP_THRESHOLD) {
				sidePaneElement.style.scale =
					interpolateScaleValue(elementWidth).toString();
				sidePaneElement.style.transform = `translateX(${interpolateTransformValue(
					elementWidth,
				)}px)`;
				sidePaneElement.style.opacity =
					interpolateOpacityValue(elementWidth).toString();
			} else {
				sidePaneElement.style.scale = "1";
				sidePaneElement.style.opacity = "1";
				sidePaneElement.style.transform = "translateX(0px)";
			}
		});
	});

	return (
		// Ongoing issue with allotment - Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release.
		// https://github.com/johnwalley/allotment/issues/833
		<Allotment
			onChange={(values) => {
				const sidePaneSize = values[0];
				if (sidePaneSize === 0) {
					setShowSidePane(false);
				}

				if (sidePaneSize === 184) {
					setShowSidePane(true);
				}
			}}
			onDragEnd={(values) => {
				const sidePaneSize = values[0];
				if (sidePaneSize === 0 && sidePaneRef?.current?.clientWidth === 0) {
					// open side pane when its fully closed and on the resize pane click
					setShowSidePane(true);
					// opens side pane
					setTimeout(
						() => allotmentRef?.current?.reset(),
						SIDE_PANE_ANIMATION_DELAY,
					);
				}

				const sidepaneWidth = sidePaneRef.current?.clientWidth;
				if (
					sidePaneSize < SIDE_PANE_SNAP_THRESHOLD &&
					sidepaneWidth &&
					sidepaneWidth > 0
				) {
					// closes the side pane when user is resizing it and side pane is less than snap threshold
					setTimeout(
						() => allotmentRef?.current?.resize([0, 100]),
						SIDE_PANE_ANIMATION_DELAY,
					);
					setShowSidePane(false);
				}

				if (
					sidePaneSize > SIDE_PANE_SNAP_THRESHOLD &&
					sidePaneSize < SIDE_PANE_DEFAULT_WIDTH
				) {
					// resets the side pane to default sizes based on user resizing width
					allotmentRef?.current?.reset();
					// close collapse button on resize
					setShowSidePane(true);
				}

				if (sidePaneSize > SIDE_PANE_DEFAULT_WIDTH) {
					setShowSidePane(true);
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
