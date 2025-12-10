"use client";

import {
	useMutation,
	useQueryClient,
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
 * Rollback function returned from onMutate for error recovery
 */
export type RollbackFn = () => void;

/**
 * Options for optimistic mutations with cache updates.
 * @template TData - Mutation function return type
 * @template TError - Error type
 * @template TVariables - Variables passed to mutationFn
 * @template TQueryKey - Query key type
 * @template TCacheData - Cache data type (defaults to TData for simple cases)
 */
export interface ReactQueryOptimisticMutationOptions<
	TData = unknown,
	TError = Error,
	TVariables = void,
	TQueryKey extends QueryKey = QueryKey,
	TCacheData = TData,
> extends Omit<
	ReactQueryMutationOptions<TData, TError, TVariables, RollbackFn>,
	"onMutate"
> {
	/**
	 * Query key to update optimistically
	 */
	queryKey: TQueryKey;
	/**
	 * Function to compute optimistic cache update.
	 * Receives current cache data and returns updated cache data.
	 */
	updater: (
		currentData: TCacheData | undefined,
		variables: TVariables,
	) => TCacheData;
	/**
	 * Query keys to invalidate after mutation succeeds
	 */
	invalidates?: QueryKey | QueryKey[];
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

/**
 * Mutation hook with built-in optimistic updates and automatic rollback.
 * @example
 * const mutation = useReactQueryOptimisticMutation({
 *   mutationFn: updateTodo,
 *   queryKey: ["todos"],
 *   updater: (todos, variables) =>
 *     todos?.map(t => t.id === variables.id ? { ...t, ...variables } : t),
 *   invalidates: ["todos"],
 *   showSuccessToast: true,
 *   successMessage: "Todo updated",
 * });
 */
export function useReactQueryOptimisticMutation<
	TData = unknown,
	TError = Error,
	TVariables = void,
	TQueryKey extends QueryKey = QueryKey,
	TCacheData = TData,
>({
	mutationFn,
	mutationKey,
	guardConcurrentInvalidation = false,
	queryKey,
	updater,
	invalidates,
	onSettled: userOnSettled,
	onError: userOnError,
	...restOptions
}: ReactQueryOptimisticMutationOptions<
	TData,
	TError,
	TVariables,
	TQueryKey,
	TCacheData
>) {
	const queryClient = useQueryClient();

	return useReactQueryMutation<TData, TError, TVariables, RollbackFn>({
		...restOptions,
		mutationKey,
		mutationFn,
		onMutate: async (variables: TVariables) => {
			// Cancel outgoing refetches to prevent race conditions
			await queryClient.cancelQueries({ queryKey });

			// Snapshot previous value for rollback
			const snapshot = queryClient.getQueryData<TCacheData>(queryKey);

			// Apply optimistic update (cache data type may differ from mutation response)
			queryClient.setQueryData<TCacheData>(queryKey, (currentData) =>
				updater(currentData, variables),
			);

			// Return rollback function as context
			return () => {
				queryClient.setQueryData<TCacheData>(queryKey, snapshot);
			};
		},
		onError: (error, variables, rollback) => {
			// Execute rollback to restore previous state
			rollback?.();
			// Call user's onError callback
			userOnError?.(error, variables, rollback);
		},
		onSettled: (data, error, variables, rollback) => {
			// Call user's onSettled callback first
			userOnSettled?.(data, error, variables, rollback);

			// Skip invalidation if other mutations with same key are still running
			if (guardConcurrentInvalidation && mutationKey) {
				const pendingCount = queryClient.isMutating({ mutationKey });
				if (pendingCount > 1) {
					// Let the last mutation handle invalidation
					return;
				}
			}

			// Invalidate queries on success to refetch fresh data
			if (!error && invalidates) {
				const keysToInvalidate = Array.isArray(invalidates[0])
					? (invalidates as QueryKey[])
					: [invalidates as QueryKey];

				for (const key of keysToInvalidate) {
					void queryClient.invalidateQueries({ queryKey: key });
				}
			}
		},
	});
}

/**
 * Definition for a single optimistic cache update.
 */
export interface OptimisticFn<TVariables> {
	/**
	 * Query key to update
	 */
	queryKey: QueryKey;
	/**
	 * Function to compute the optimistic update
	 */
	updater: (currentData: unknown, variables: TVariables) => unknown;
}

/**
 * Options for mutations that update multiple cache locations optimistically.
 */
export interface ReactQueryMultiOptimisticMutationOptions<
	TData = unknown,
	TError = Error,
	TVariables = void,
> extends Omit<
	ReactQueryMutationOptions<TData, TError, TVariables, RollbackFn>,
	"onMutate"
> {
	/**
	 * Array of optimistic update functions for multiple cache locations
	 */
	optimisticFns: Array<OptimisticFn<TVariables>>;
	/**
	 * Query keys to invalidate after mutation succeeds
	 */
	invalidates?: QueryKey[];
}

/**
 * Mutation hook for operations that need to update multiple cache locations.
 *
 * Use this for operations like moving items between lists, where you need to:
 * - Remove from source list
 * - Add to destination list
 * - Update counts for both
 * @example
 * const moveMutation = useReactQueryMultiOptimisticMutation({
 *   mutationFn: moveBookmark,
 *   optimisticFns: [
 *     {
 *       queryKey: [BOOKMARKS_KEY, sourceCategoryId],
 *       updater: (bookmarks, vars) => bookmarks.filter(b => b.id !== vars.bookmarkId),
 *     },
 *     {
 *       queryKey: [BOOKMARKS_KEY, destCategoryId],
 *       updater: (bookmarks, vars) => [...bookmarks, vars.bookmark],
 *     },
 *   ],
 *   invalidates: [[BOOKMARKS_KEY], [BOOKMARKS_COUNT_KEY]],
 * });
 */
export function useReactQueryMultiOptimisticMutation<
	TData = unknown,
	TError = Error,
	TVariables = void,
>({
	mutationFn,
	mutationKey,
	guardConcurrentInvalidation = false,
	optimisticFns,
	invalidates,
	onSettled: userOnSettled,
	onError: userOnError,
	...restOptions
}: ReactQueryMultiOptimisticMutationOptions<TData, TError, TVariables>) {
	const queryClient = useQueryClient();

	return useReactQueryMutation<TData, TError, TVariables, RollbackFn>({
		...restOptions,
		mutationKey,
		mutationFn,
		onMutate: async (variables: TVariables) => {
			// Store all snapshots for rollback
			const snapshots: Array<{ queryKey: QueryKey; data: unknown }> = [];

			// Cancel all queries in parallel
			await Promise.all(
				optimisticFns.map(({ queryKey }) =>
					queryClient.cancelQueries({ queryKey }),
				),
			);

			// Snapshot each cache location after cancellation
			for (const { queryKey } of optimisticFns) {
				snapshots.push({
					queryKey,
					data: queryClient.getQueryData(queryKey),
				});
			}

			// Apply all optimistic updates
			for (const { queryKey, updater } of optimisticFns) {
				queryClient.setQueryData(queryKey, (currentData: unknown) =>
					updater(currentData, variables),
				);
			}

			// Return rollback function that restores ALL snapshots
			return () => {
				for (const { queryKey, data } of snapshots) {
					queryClient.setQueryData(queryKey, data);
				}
			};
		},
		onError: (error, variables, rollback) => {
			// Execute rollback to restore all previous states
			rollback?.();
			// Call user's onError callback
			userOnError?.(error, variables, rollback);
		},
		onSettled: (data, error, variables, rollback) => {
			// Call user's onSettled callback first
			userOnSettled?.(data, error, variables, rollback);

			// Skip invalidation if other mutations with same key are still running
			if (guardConcurrentInvalidation && mutationKey) {
				const pendingCount = queryClient.isMutating({ mutationKey });
				if (pendingCount > 1) {
					// Let the last mutation handle invalidation
					return;
				}
			}

			// Invalidate all specified queries on success
			if (!error && invalidates) {
				for (const key of invalidates) {
					void queryClient.invalidateQueries({ queryKey: key });
				}
			}
		},
	});
}
