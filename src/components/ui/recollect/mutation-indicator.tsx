"use client";

import { useMutationState } from "@tanstack/react-query";

/**
 * Dev-only indicator showing pending mutations.
 * Positioned in bottom-right corner (opposite of tailwind-indicator).
 *
 * Uses useMutationState from TanStack Query v5 to track all pending mutations.
 */
export function MutationIndicator() {
	const pendingMutations = useMutationState({
		filters: { status: "pending" },
		select: (mutation) => mutation.state.variables,
	});

	if (process.env.NODE_ENV === "production") {
		return null;
	}

	if (pendingMutations.length === 0) {
		return null;
	}

	return (
		<div
			aria-hidden
			className="fixed right-1 bottom-1 z-50 flex items-center gap-1.5 rounded-full bg-blue-600 px-2.5 py-1 text-xs text-white"
		>
			<span className="size-2 animate-pulse rounded-full bg-white" />
			Saving {pendingMutations.length}...
		</div>
	);
}
