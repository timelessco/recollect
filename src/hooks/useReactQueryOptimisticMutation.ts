"use client";

import { useQueryClient, type QueryKey } from "@tanstack/react-query";

import {
	useReactQueryMutation,
	type ReactQueryMutationOptions,
	type RollbackFn,
} from "@/hooks/useReactQueryMutation";

// ============================================================================
// Optimistic Mutation Options
// ============================================================================

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
	 * Optional secondary query key (e.g., for search results).
	 * Gets the same optimistic update, snapshot, and rollback treatment.
	 * Pass null when not searching.
	 */
	secondaryQueryKey?: QueryKey | null;
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
	/**
	 * Skip invalidating the secondary query key on success.
	 * Useful when deferring invalidation (e.g., lightbox category changes).
	 */
	skipSecondaryInvalidation?: boolean;
}

// ============================================================================
// Single Cache Optimistic Mutation
// ============================================================================

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
	secondaryQueryKey,
	updater,
	invalidates,
	skipSecondaryInvalidation = false,
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

			// Also cancel secondary key if provided (e.g., search results)
			if (secondaryQueryKey) {
				await queryClient.cancelQueries({ queryKey: secondaryQueryKey });
			}

			// Snapshot previous values for rollback
			const snapshot = queryClient.getQueryData<TCacheData>(queryKey);
			const secondarySnapshot = secondaryQueryKey
				? queryClient.getQueryData<TCacheData>(secondaryQueryKey)
				: undefined;

			// Apply optimistic update to primary cache
			queryClient.setQueryData<TCacheData>(queryKey, (currentData) =>
				updater(currentData, variables),
			);

			// Apply same update to secondary cache if provided
			if (secondaryQueryKey) {
				queryClient.setQueryData<TCacheData>(secondaryQueryKey, (currentData) =>
					updater(currentData, variables),
				);
			}

			// Return rollback function as context (callable, with extra property)
			const rollback = (() => {
				queryClient.setQueryData<TCacheData>(queryKey, snapshot);
				if (secondaryQueryKey && secondarySnapshot !== undefined) {
					queryClient.setQueryData<TCacheData>(
						secondaryQueryKey,
						secondarySnapshot,
					);
				}
			}) as RollbackFn;

			// Capture context for onSettled (avoids stale closures)
			rollback.capturedSecondaryKey = secondaryQueryKey;
			rollback.skipSecondaryInvalidation = skipSecondaryInvalidation;

			return rollback;
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
				// Determine if invalidates is QueryKey[] or single QueryKey
				// Empty array = no keys to invalidate, skip entirely
				const isMultipleKeys =
					Array.isArray(invalidates) &&
					invalidates.length > 0 &&
					Array.isArray(invalidates[0]);

				const keysToInvalidate = isMultipleKeys
					? (invalidates as QueryKey[])
					: Array.isArray(invalidates) && invalidates.length === 0
						? []
						: [invalidates as QueryKey];

				for (const key of keysToInvalidate) {
					void queryClient.invalidateQueries({ queryKey: key });
				}
			}

			// Also invalidate secondary key (e.g., search results)
			// Use captured key from context to avoid stale closure
			// Skip if skipSecondaryInvalidation was set (e.g., lightbox defers invalidation)
			if (
				!error &&
				rollback?.capturedSecondaryKey &&
				!rollback?.skipSecondaryInvalidation
			) {
				void queryClient.invalidateQueries({
					queryKey: rollback.capturedSecondaryKey,
				});
			}
		},
	});
}

// ============================================================================
// Multi-Cache Optimistic Mutation
// ============================================================================

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
