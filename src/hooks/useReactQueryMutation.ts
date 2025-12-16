"use client";

import {
	useMutation,
	type MutationKey,
	type QueryKey,
	type UseMutationOptions,
} from "@tanstack/react-query";

import { handleClientError, handleSuccess } from "@/utils/error-utils/client";

// ============================================================================
// Optimistic Status Tracking
// ============================================================================

/**
 * Counter for generating unique optimistic IDs.
 * Using a counter instead of crypto.randomUUID() because:
 * - crypto.randomUUID() requires HTTPS (fails on HTTP localhost)
 * - React's useId() can't be called in updater functions (hook rules)
 */
let optimisticIdCounter = 0;

/**
 * Generate a unique ID for optimistic items.
 * Safe to use in updater functions and works on HTTP localhost.
 * @example
 * updater: (items, vars) => [
 *   { ...vars.item, _optimistic: true, _optimisticId: generateOptimisticId() },
 *   ...items,
 * ]
 */
export function generateOptimisticId(): string {
	return `optimistic-${++optimisticIdCounter}`;
}

/**
 * Interface for items that support optimistic status tracking.
 * Add these fields to show visual pending state on items being mutated.
 * @example
 * type Bookmark = { id: string; title: string } & OptimisticItem;
 *
 * // In component:
 * <div className={bookmark._optimistic ? 'opacity-50 animate-pulse' : ''}>
 *   {bookmark.title}
 * </div>
 */
export interface OptimisticItem {
	/**
	 * True if this item is an optimistic update (not yet confirmed by server)
	 */
	_optimistic?: boolean;
	/**
	 * Unique ID for tracking this specific optimistic update
	 */
	_optimisticId?: string;
}

// ============================================================================
// Retry Configuration
// ============================================================================

/**
 * Configuration for mutation retry behavior.
 */
export interface RetryConfig {
	/**
	 * Maximum retry attempts (default: 0 for mutations)
	 */
	retryCount?: number;
	/**
	 * Base delay in ms for exponential backoff (default: 1000)
	 */
	retryDelay?: number;
	/**
	 * Only retry on specific errors (default: retry all errors)
	 */
	retryOn?: (error: Error) => boolean;
}

/**
 * Compute retry delay with exponential backoff, capped at 30 seconds.
 */
function computeRetryDelay(attemptIndex: number, baseDelay: number): number {
	return Math.min(baseDelay * 2 ** attemptIndex, 30_000);
}

/**
 * Extended mutation options with UI handling flags.
 */
export interface ReactQueryMutationOptions<
	TData = unknown,
	TError = Error,
	TVariables = void,
	TContext = unknown,
> extends Omit<
	UseMutationOptions<TData, TError, TVariables, TContext>,
	"onError" | "onSettled" | "retry" | "retryDelay"
> {
	/**
	 * Show success toast when mutation succeeds (default: false)
	 */
	showSuccessToast?: boolean;
	/**
	 * Success message to display
	 */
	successMessage?: string;
	/**
	 * Skip built-in error handling (default: false)
	 */
	skipErrorHandling?: boolean;
	/**
	 * Mutation key for DevTools debugging and useIsMutating
	 */
	mutationKey?: MutationKey;
	/**
	 * Skip invalidation if other mutations with same key are pending (default: false)
	 * Useful for rapid mutations like drag-drop reordering
	 */
	guardConcurrentInvalidation?: boolean;
	/**
	 * Retry configuration for failed mutations.
	 * Note: This replaces the built-in retry/retryDelay options with a simpler config.
	 */
	retryConfig?: RetryConfig;
	/**
	 * Callback when mutation errors
	 */
	onError?: (
		error: TError,
		variables: TVariables,
		context: TContext | undefined,
	) => void;
	/**
	 * Callback when mutation settles (success or error)
	 */
	onSettled?: (
		data: TData | undefined,
		error: TError | null,
		variables: TVariables,
		context: TContext | undefined,
	) => void;
}

/**
 * Rollback function returned from onMutate for error recovery.
 * Can be called directly for rollback, and optionally includes
 * a captured secondary query key for search cache invalidation.
 */
export interface RollbackFn {
	(): void;
	/**
	 * Captured secondary query key (e.g., search results).
	 * Used by onSettled to invalidate both primary and secondary caches.
	 */
	capturedSecondaryKey?: QueryKey | null;
	/**
	 * When true, skip invalidating the secondary query key on success.
	 * Used by mutations that defer invalidation (e.g., lightbox category changes).
	 */
	skipSecondaryInvalidation?: boolean;
}

/**
 * Wrapper around useMutation with automatic error/success handling.
 * @example
 * const mutation = useReactQueryMutation({
 *   mutationFn: updateUser,
 *   showSuccessToast: true,
 *   successMessage: "User updated",
 * });
 */
export function useReactQueryMutation<
	TData = unknown,
	TError = Error,
	TVariables = void,
	TContext = unknown,
>(options: ReactQueryMutationOptions<TData, TError, TVariables, TContext>) {
	// guardConcurrentInvalidation is handled by useReactQueryOptimisticMutation
	const {
		showSuccessToast = false,
		skipErrorHandling = false,
		successMessage,
		mutationKey,
		guardConcurrentInvalidation: _guardConcurrentInvalidation,
		retryConfig,
		onSettled: userOnSettled,
		onError: userOnError,
		...restOptions
	} = options;
	void _guardConcurrentInvalidation;

	// Build retry options from config
	const retryOptions = retryConfig
		? {
				retry: (failureCount: number, error: TError) => {
					if (failureCount >= (retryConfig.retryCount ?? 0)) {
						return false;
					}

					if (retryConfig.retryOn) {
						return retryConfig.retryOn(error as Error);
					}

					return true;
				},
				retryDelay: (attemptIndex: number) =>
					computeRetryDelay(attemptIndex, retryConfig.retryDelay ?? 1000),
			}
		: {};

	return useMutation({
		mutationKey,
		...retryOptions,
		...restOptions,
		onSettled: (data, error, variables, context) => {
			// Show success toast if enabled and no error
			if (!error && showSuccessToast && successMessage) {
				handleSuccess(successMessage);
			}

			// Call user's onSettled callback
			userOnSettled?.(data, error, variables, context);
		},
		onError: (error, variables, context) => {
			// Handle error with toast unless skipped
			if (!skipErrorHandling) {
				handleClientError(error);
			}

			// Call user's onError callback
			userOnError?.(error, variables, context);
		},
	});
}
