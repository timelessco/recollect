import { type RefObject } from "react";
import { useResizeObserver } from "@react-hookz/web";
import {
	Allotment,
	type AllotmentHandle,
	type AllotmentProps,
} from "allotment";

import "allotment/dist/style.css";

// Side pane resize thresholds

// Below this width, snap closed
const SNAP_THRESHOLD = 180;
// Below this width, reset to default
const RESET_THRESHOLD = 244;
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
	setShowSidePane: (value: boolean) => void;
	setSidePaneWidth: (value: number) => void;
	sidePaneRef: RefObject<HTMLDivElement | null>;
	sidePaneContentRef: RefObject<HTMLDivElement | null>;
	children: React.ReactNode;
}

export const AllotmentWrapper = (props: AllotmentWrapperProps) => {
	const {
		allotmentRef,
		sidePaneRef,
		sidePaneContentRef,
		setShowSidePane,
		setSidePaneWidth,
		...rest
	} = props;

	// Resize pane animation logic with useResizeObserver for better performance
	useResizeObserver(sidePaneRef, (entry) => {
		const elementWidth = entry.contentRect.width;
		const sidePaneElement = sidePaneContentRef.current;

		if (!sidePaneElement) {
			return;
		}

		// Use requestAnimationFrame for smooth 60fps updates
		requestAnimationFrame(() => {
			if (elementWidth < 200) {
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
		<Allotment
			onDragEnd={(values: number[]) => {
				const leftPaneSize = values[0] ?? 0;
				const currentWidth = sidePaneRef.current?.clientWidth ?? 0;

				// Click on handle when fully closed → reopen
				if (leftPaneSize === 0 && currentWidth === 0) {
					setShowSidePane(true);
					setTimeout(() => allotmentRef.current?.reset(), ANIMATION_DELAY);
					return;
				}

				// Dragged below snap threshold → close
				if (leftPaneSize < SNAP_THRESHOLD && currentWidth > 0) {
					setTimeout(
						() => allotmentRef.current?.resize([0, 100]),
						ANIMATION_DELAY,
					);
					setShowSidePane(false);
					return;
				}

				// Between snap and reset threshold → reset to default
				if (leftPaneSize >= SNAP_THRESHOLD && leftPaneSize < RESET_THRESHOLD) {
					allotmentRef.current?.reset();
					setShowSidePane(true);
					return;
				}

				// Above reset threshold → keep size and save
				if (leftPaneSize >= RESET_THRESHOLD) {
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
