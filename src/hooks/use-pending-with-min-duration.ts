"use client";

import * as React from "react";
import { useTimeoutEffect } from "@react-hookz/web";

/**
 * Extends isPending state to ensure it stays true for a minimum duration.
 * Prevents flash-of-loading-state issues by guaranteeing minimum display time.
 * @param actualIsPending - The actual pending state from useTransition or similar
 * @param minDurationMs - Minimum duration in milliseconds (default: 200ms)
 * @returns Extended isPending that stays true for minimum duration
 */
export function usePendingWithMinDuration(
	actualIsPending: boolean,
	minDurationMs: number = 300,
): boolean {
	const [isExtended, setIsExtended] = React.useState(false);
	const previousIsPendingRef = React.useRef(actualIsPending);

	// Track when actualIsPending transitions from false → true
	React.useEffect(() => {
		const previousIsPending = previousIsPendingRef.current;
		previousIsPendingRef.current = actualIsPending;

		// When actualIsPending becomes true (false → true transition)
		if (actualIsPending && !previousIsPending) {
			setIsExtended(true);
		}
	}, [actualIsPending]);

	// Set up timeout to clear isExtended after minimum duration
	useTimeoutEffect(
		() => {
			setIsExtended(false);
		},
		isExtended ? minDurationMs : undefined,
	);

	// isPending is true if either actual pending OR extended duration active
	return actualIsPending || isExtended;
}
